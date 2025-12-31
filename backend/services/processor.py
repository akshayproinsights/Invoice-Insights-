"""
Invoice processor service with Gemini AI integration.
Ported from invoice_processor_r2_streamlit.py
"""
import os
import json
import time
import threading
import tempfile
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging


from google import genai
from google.genai import types
from PIL import Image
import pandas as pd

from config import get_google_api_key
from config_loader import get_user_config, get_gemini_prompt, get_columns_config
from database import get_database_client
from services.storage import get_storage_client
from utils.date_helpers import normalize_date, format_to_db, get_ist_now_str
from utils.hash_utils import calculate_image_hash

# Google Sheets → Supabase migration complete
# All data now stored in Supabase database tables

logger = logging.getLogger(__name__)

# Configuration for parallel processing
MAX_WORKERS = 3  # Process up to 3 invoices concurrently

# Gemini System Instruction - NOW LOADED DYNAMICALLY per user
# See config_loader.get_gemini_prompt(username) for user-specific prompts
# Previous hardcoded prompt moved to: backend/user_configs/templates/automobile.json

MAX_RETRIES = 5

# Model Configuration
PRIMARY_MODEL = "gemini-3-flash-preview"  # Gemini 3 Flash
FALLBACK_MODEL = "gemini-3-pro-preview"   # Gemini 3 Pro
ACCURACY_THRESHOLD = 70.0  # Switch to Pro model if accuracy < 70%

# Pricing Configuration (USD per 1M tokens)
# Gemini 3 Flash Preview pricing (approximate)
FLASH_INPUT_PRICE_PER_1M = 0.075  # USD
FLASH_OUTPUT_PRICE_PER_1M = 0.30  # USD

# Gemini 3 Pro Preview pricing (approximate)
PRO_INPUT_PRICE_PER_1M = 1.25  # USD
PRO_OUTPUT_PRICE_PER_1M = 5.00  # USD

# Currency conversion
USD_TO_INR = 84.0  # 1 USD = 84 INR (approximate)



class RateLimiter:
    """Ensures we don't exceed the API's rate limit."""
    def __init__(self, rpm=30):
        self.interval = 60.0 / rpm
        self._last_call = 0
        self._lock = threading.Lock()

    def wait(self):
        with self._lock:
            now = time.time()
            elapsed = now - self._last_call
            wait_time = self.interval - elapsed
            if wait_time > 0:
                time.sleep(wait_time)
            self._last_call = time.time()


limiter = RateLimiter(rpm=30)





def calculate_accuracy(items: List[Dict[str, Any]]) -> float:
    """
    Calculate average accuracy/confidence from line items.
    
    Args:
        items: List of extracted line items with confidence scores
    
    Returns:
        Average confidence percentage (0-100)
    """
    if not items:
        return 0.0
    
    # Check if confidence scores are present in the response
    has_confidence = any("confidence" in item for item in items)
    
    if not has_confidence:
        # If model wasn't asked to output confidence, assume 100% to prevent fallback
        return 100.0
    
    confidences = [item.get("confidence", 0) for item in items]
    return sum(confidences) / len(confidences) if confidences else 0.0


def calculate_cost_inr(input_tokens: int, output_tokens: int, model_name: str) -> float:
    """
    Calculate processing cost in INR based on token usage.
    
    Args:
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        model_name: Name of model used
    
    Returns:
        Cost in Indian Rupees
    """
    # Determine pricing based on model
    if "flash" in model_name.lower():
        input_cost_usd = (input_tokens / 1_000_000) * FLASH_INPUT_PRICE_PER_1M
        output_cost_usd = (output_tokens / 1_000_000) * FLASH_OUTPUT_PRICE_PER_1M
    else:  # Pro model
        input_cost_usd = (input_tokens / 1_000_000) * PRO_INPUT_PRICE_PER_1M
        output_cost_usd = (output_tokens / 1_000_000) * PRO_OUTPUT_PRICE_PER_1M
    
    total_cost_usd = input_cost_usd + output_cost_usd
    cost_inr = total_cost_usd * USD_TO_INR
    
    return round(cost_inr, 4)


def process_single_invoice(
    image_bytes: bytes,
    filename: str,
    receipt_link: str,
    username: str  # NEW: Required for loading user-specific prompt
) -> Optional[Dict[str, Any]]:
    """
    Process a single invoice image with Gemini AI using google-genai SDK.
    Uses gemini-3-flash-preview by default, with automatic fallback to
    gemini-3-pro-preview if accuracy is below threshold.
    
    Args:
        image_bytes: Image file content
        filename: Original filename
        receipt_link: URL to receipt in R2 storage
        username: Username for loading user-specific config
    
    Returns:
        Dictionary with extracted invoice data including model metadata, or None if failed
    """
    api_key = get_google_api_key()
    if not api_key:
        logger.error("Google API key not configured")
        return None

    # Instantiate Client
    client = genai.Client(api_key=api_key)
    
    # Load user-specific Gemini prompt
    system_instruction = get_gemini_prompt(username)
    if not system_instruction:
        logger.error(f"No Gemini prompt found for user: {username}")
        return None
    
    logger.debug(f"Loaded prompt for user {username}, length: {len(system_instruction)}")
    
    # Load image
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name
        
        img = Image.open(tmp_path)
        logger.info(f"Processing image: {filename}")
        
        # Try with primary model (Flash) first
        model_name = PRIMARY_MODEL
        fallback_attempted = False
        fallback_reason = ""
        flash_result = None  # Store Flash result in case we need it as fallback
        processing_errors = []  # Collect all errors
        
        # CRITICAL FIX: Give Pro model its own full retry cycle
        # Try Flash first, then if fallback needed, try Pro with fresh retries
        for model_attempt in [PRIMARY_MODEL, FALLBACK_MODEL]:
            model_name = model_attempt
            
            # Skip Pro model if fallback wasn't triggered
            if model_name == FALLBACK_MODEL and not fallback_attempted:
                continue
            
            # Log model being attempted
            if model_name == FALLBACK_MODEL:
                logger.info(f"🔄 Starting Pro model attempt after Flash fallback: {fallback_reason}")
            else:
                logger.info(f"🚀 Starting Flash model attempt")
            
            # Generate content with retry logic (full retries for each model)
            for attempt in range(MAX_RETRIES):
                try:
                    limiter.wait()
                    
                    logger.info(f"Attempting with {model_name} (attempt {attempt + 1}/{MAX_RETRIES})")
                    
                    # Configure generation with system instruction
                    config = types.GenerateContentConfig(
                        system_instruction=system_instruction
                    )
                    
                    # Call API
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[img, "Extract bill data."],
                        config=config
                    )
                    
                    # Extract token usage from response metadata
                    input_tokens = 0
                    output_tokens = 0
                    total_tokens = 0
                    
                    if response.usage_metadata:
                        usage = response.usage_metadata
                        input_tokens = getattr(usage, 'prompt_token_count', 0)
                        output_tokens = getattr(usage, 'candidates_token_count', 0)
                        total_tokens = getattr(usage, 'total_token_count', input_tokens + output_tokens)
                        
                        logger.info(f"Token usage - Input: {input_tokens}, Output: {output_tokens}, Total: {total_tokens}")
                    
                    # Extract JSON from response
                    text = response.text.strip()
                    
                    # Remove markdown code blocks if present
                    if text.startswith("```json"):
                        text = text[7:]
                    if text.startswith("```"):
                        text = text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    
                    text = text.strip()
                    
                    # Parse JSON
                    try:
                        data = json.loads(text)
                    except json.JSONDecodeError as json_err:
                        # Enhanced error logging with actual response
                        error_msg = f"JSON parse error on attempt {attempt + 1}: {json_err}"
                        processing_errors.append(error_msg)
                        logger.error(f"{error_msg}\nResponse text preview: {text[:500]}...")
                        raise  # Re-raise to trigger retry logic
                    
                    # Validate structure
                    if "header" not in data or "items" not in data:
                        error_msg = "Invalid response structure - missing header or items"
                        processing_errors.append(error_msg)
                        logger.error(f"{error_msg}\nData keys: {list(data.keys())}")
                        raise ValueError(error_msg)
                    
                    # Calculate accuracy from item confidences
                    accuracy = calculate_accuracy(data.get("items", []))
                    
                    logger.info(f"Model {model_name} - Accuracy: {accuracy:.2f}%")
                    
                    # Check for critical field confidence (Date & Receipt Number)
                    header = data.get("header", {})
                    receipt_conf = float(header.get("receipt_number_confidence", 100))
                    date_conf = float(header.get("date_confidence", 100))
                    overall_conf = float(header.get("overall_confidence", 100))
                    
                    logger.info(f"Confidences - Overall: {overall_conf}%, Receipt: {receipt_conf}%, Date: {date_conf}%")
                    
                    # Check if we need to fallback to Pro model (only for Flash)
                    if model_name == PRIMARY_MODEL:
                        needs_fallback = False
                        fallback_reason_temp = ""
                        
                        # Fallback triggers:
                        # 1. Overall item accuracy < ACCURACY_THRESHOLD (70%)
                        # 2. Overall Image Confidence < ACCURACY_THRESHOLD (70%)
                        # 3. Critical field confidence < 50%
                        
                        if accuracy < ACCURACY_THRESHOLD:
                            needs_fallback = True
                            fallback_reason_temp = f"Item Accuracy {accuracy:.2f}% < {ACCURACY_THRESHOLD}%"
                        elif overall_conf < ACCURACY_THRESHOLD:
                            needs_fallback = True
                            fallback_reason_temp = f"Overall Image Confidence {overall_conf}% < {ACCURACY_THRESHOLD}%"
                        elif receipt_conf < 50:
                            needs_fallback = True
                            fallback_reason_temp = f"Receipt Confidence {receipt_conf}% < 50%"
                        elif date_conf < 50:
                            needs_fallback = True
                            fallback_reason_temp = f"Date Confidence {date_conf}% < 50%"
                        
                        if needs_fallback:
                            # Store Flash result and trigger Pro attempt
                            fallback_attempted = True
                            fallback_reason = fallback_reason_temp
                            
                            # Calculate cost for Flash attempt
                            flash_cost = calculate_cost_inr(input_tokens, output_tokens, model_name)
                            
                            # Store Flash result as backup
                            flash_result = {
                                "data": data,
                                "model_used": model_name,
                                "model_accuracy": round(accuracy, 2),
                                "input_tokens": input_tokens,
                                "output_tokens": output_tokens,
                                "total_tokens": total_tokens,
                                "cost_inr": flash_cost
                            }
                            
                            logger.warning(f"⚠️ Fallback triggered: {fallback_reason}. Will try {FALLBACK_MODEL}")
                            break  # Exit Flash retry loop to try Pro model
                    
                    # If we got here, processing succeeded!
                    # Calculate cost
                    cost_inr = calculate_cost_inr(input_tokens, output_tokens, model_name)
                    
                    logger.info(f"Processing cost: ₹{cost_inr:.4f} INR")
                    
                    # Add metadata
                    data["receipt_link"] = receipt_link
                    data["upload_date"] = get_ist_now_str()
                    data["model_used"] = model_name
                    data["model_accuracy"] = round(accuracy, 2)
                    data["input_tokens"] = input_tokens
                    data["output_tokens"] = output_tokens
                    data["total_tokens"] = total_tokens
                    data["cost_inr"] = cost_inr
                    
                    # Add fallback tracking
                    data["fallback_attempted"] = fallback_attempted
                    data["fallback_reason"] = fallback_reason if fallback_attempted else None
                    data["processing_errors"] = " | ".join(processing_errors) if processing_errors else None
                    
                    logger.info(f"✓ Successfully processed: {filename} | Model: {model_name} | Accuracy: {accuracy:.2f}% | Cost: ₹{cost_inr:.4f}")
                    if fallback_attempted:
                        logger.info(f"  ℹ️ Fallback was used: {fallback_reason}")
                    
                    return data
                    
                except json.JSONDecodeError as e:
                    error_msg = f"JSON decode error on attempt {attempt + 1}/{MAX_RETRIES}"
                    logger.warning(f"{error_msg}: {e}")
                    if attempt == MAX_RETRIES - 1:
                        processing_errors.append(f"{model_name} failed after {MAX_RETRIES} attempts: {e}")
                        logger.error(f"❌ {model_name} failed to parse JSON after {MAX_RETRIES} attempts")
                    else:
                        time.sleep(2 ** attempt)  # Exponential backoff
                    
                except Exception as e:
                    error_msg = f"Error on attempt {attempt + 1}/{MAX_RETRIES}"
                    logger.error(f"{error_msg}: {e}")
                    processing_errors.append(f"{model_name} error: {str(e)}")
                    if attempt == MAX_RETRIES - 1:
                        logger.error(f"❌ {model_name} failed after {MAX_RETRIES} attempts")
                    else:
                        time.sleep(2 ** attempt)
            
            # If Pro model just failed and we have Flash result, use it
            if model_name == FALLBACK_MODEL and flash_result:
                logger.warning(f"⚠️ Pro model failed, falling back to Flash result")
                
                # Use Flash result but mark that Pro was attempted
                data = flash_result["data"]
                data["receipt_link"] = receipt_link
                data["upload_date"] = get_ist_now_str()
                data["model_used"] = flash_result["model_used"]
                data["model_accuracy"] = flash_result["model_accuracy"]
                data["input_tokens"] = flash_result["input_tokens"]
                data["output_tokens"] = flash_result["output_tokens"]
                data["total_tokens"] = flash_result["total_tokens"]
                data["cost_inr"] = flash_result["cost_inr"]
                data["fallback_attempted"] = True
                data["fallback_reason"] = fallback_reason
                data["processing_errors"] = " | ".join(processing_errors)
                
                logger.info(f"✓ Using Flash result: {filename} | Accuracy: {flash_result['model_accuracy']}% | Cost: ₹{flash_result['cost_inr']:.4f}")
                logger.info(f"  ⚠️ Pro model attempted but failed: {processing_errors[-1] if processing_errors else 'Unknown error'}")
                
                return data
        
    finally:
        # Cleanup temp file
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
    
    # If we got here, both models failed completely
    logger.error(f"❌ Complete failure: Both Flash and Pro models failed for {filename}")
    logger.error(f"   Errors: {' | '.join(processing_errors)}")
    return None



def check_duplicate_invoice(image_hash: str, username: str) -> Optional[Dict[str, Any]]:
    """
    Check if an invoice with the given image hash already exists in Supabase.
    Checks BOTH invoices and verified_invoices tables.
    
    Args:
        image_hash: SHA-256 hash of the image
        username: Username for RLS filtering
        
    Returns:
        Dictionary with existing invoice data if duplicate found, None otherwise
    """
    try:
        db = get_database_client()
        
        # First check invoices table (in-progress/review invoices)
        fields = ['row_id', 'receipt_number', 'date', 'customer_name', 'total_bill_amount', 
                  'receipt_link', 'upload_date', 'image_hash']
        result = db.query('invoices', fields) \
                    .eq('image_hash', image_hash) \
                    .eq('username', username) \
                    .limit(1) \
                    .execute()
        
        if result.data and len(result.data) > 0:
            duplicate_row = result.data[0]
            logger.info(f"Duplicate found in invoices for hash {image_hash[:16]}... - Receipt: {duplicate_row.get('receipt_number', 'N/A')}")
            return duplicate_row
        
        # If not found in invoices, check verified_invoices table (completed invoices)
        result_verified = db.query('verified_invoices', fields) \
                            .eq('image_hash', image_hash) \
                            .eq('username', username) \
                            .limit(1) \
                            .execute()
        
        if result_verified.data and len(result_verified.data) > 0:
            duplicate_row = result_verified.data[0]
            logger.info(f"Duplicate found in verified_invoices for hash {image_hash[:16]}... - Receipt: {duplicate_row.get('receipt_number', 'N/A')}")
            return duplicate_row
        
        return None
        
    except Exception as e:
        logger.error(f"Error checking for duplicates in Supabase: {e}")
        return None


def delete_invoice_by_hash(image_hash: str, username: str):
    """
    Delete all records with the given image hash from all Supabase tables.
    Used when user chooses to reprocess a duplicate.
    
    Args:
        image_hash: SHA-256 hash of the image to delete
        username: Username for RLS filtering
    """
    try:
        db = get_database_client()
        
        tables_to_clean = [
            'invoices',
            'verified_invoices',
            'verification_dates',
            'verification_amounts'
        ]
        
        total_deleted = 0
        
        for table_name in tables_to_clean:
            try:
                # Delete records matching image_hash and username
                result = db.delete(table_name, {'image_hash': image_hash, 'username': username})
                
                if result:
                    deleted_count = len(result) if isinstance(result, list) else 1
                    total_deleted += deleted_count
                    logger.info(f"Deleted {deleted_count} rows from '{table_name}' with hash {image_hash[:16]}...")
                    
            except Exception as e:
                logger.error(f"Error cleaning table '{table_name}': {e}")
                continue
        
        logger.info(f"Total deleted {total_deleted} records for hash {image_hash[:16]}...")
        
    except Exception as e:
        logger.error(f"Error deleting invoice by hash from Supabase: {e}")
        raise


def convert_to_dataframe_rows(
    invoice_data: Dict[str, Any],
    username: str  # NEW: Required for loading column config
) -> List[Dict[str, Any]]:
    """
    Convert invoice JSON to list of DataFrame rows
    Each line item becomes a row
    
    Args:
        invoice_data: Extracted data from Gemini
        username: Username for loading column configuration
    
    Returns:
        List of row dictionaries with database column names
    """
    header = invoice_data.get("header", {})
    items = invoice_data.get("items", [])
    receipt_link = invoice_data.get("receipt_link", "")
    upload_date = invoice_data.get("upload_date", "")
    image_hash = invoice_data.get("image_hash", "")  # CRITICAL: Get image hash
    
    # Model metadata
    model_used = invoice_data.get("model_used", "")
    model_accuracy = invoice_data.get("model_accuracy", 0.0)
    input_tokens = invoice_data.get("input_tokens", 0)
    output_tokens = invoice_data.get("output_tokens", 0)
    total_tokens = invoice_data.get("total_tokens", 0)
    cost_inr = invoice_data.get("cost_inr", 0.0)
    
    # Fallback tracking metadata
    fallback_attempted = invoice_data.get("fallback_attempted", False)
    fallback_reason = invoice_data.get("fallback_reason", None)
    processing_errors = invoice_data.get("processing_errors", None)

    
    # Get user's column configuration
    user_config = get_user_config(username)
    if not user_config:
        logger.error(f"No config found for user: {username}")
        return []
    
    # Normalize date and convert to YYYY-MM-DD for database (PostgreSQL DATE type)
    raw_date = header.get("date", "")
    normalized_date = normalize_date(raw_date)
    # Store dates in YYYY-MM-DD format for PostgreSQL DATE columns
    date_to_store = format_to_db(normalized_date) if normalized_date else raw_date
    
    def safe_float(val, default=0):
        """Safely convert to float, handling None and empty values"""
        if val is None or val == "":
            return default
        try:
            return float(val)
        except (ValueError, TypeError):
            return default
    
    rows = []
    for idx, item in enumerate(items):
        qty = safe_float(item.get("quantity"), 1)
        rate = safe_float(item.get("rate"), 0)
        amount = safe_float(item.get("amount"), 0)
        
        calc_amount = qty * rate
        mismatch = abs(calc_amount - amount)
        
        # Build row dynamically based on database schema
        # Map Gemini JSON fields → database columns
        row = {}
        
        # System columns (always present)
        row["row_id"] = f"{header.get('receipt_number', '')}_{idx}"
        row["image_hash"] = image_hash  # CRITICAL
        row["receipt_link"] = receipt_link
        row["upload_date"] = upload_date
        row["review_status"] = "Pending"
        row["calculated_amount"] = calc_amount
        row["amount_mismatch"] = mismatch
        row["confidence"] = item.get("confidence", 0)
        
        # Model tracking columns
        row["model_used"] = model_used
        row["model_accuracy"] = model_accuracy
        row["input_tokens"] = input_tokens
        row["output_tokens"] = output_tokens
        row["total_tokens"] = total_tokens
        row["cost_inr"] = cost_inr
        
        # Fallback tracking columns
        row["fallback_attempted"] = fallback_attempted
        row["fallback_reason"] = fallback_reason
        row["processing_errors"] = processing_errors
        
        # Core business columns (from Gemini JSON)
        row["receipt_number"] = header.get("receipt_number", "")
        row["date"] = date_to_store
        row["description"] = item.get("description", "")
        row["quantity"] = qty
        row["rate"] = rate
        row["amount"] = amount
        
        # Industry-specific columns (automobile)
        row["customer_name"] = header.get("customer_name", "")
        row["mobile_number"] = header.get("mobile_number") or None
        row["car_number"] = header.get("car_number", "")
        row["odometer"] = header.get("odometer") or None
        row["total_bill_amount"] = header.get("total_bill_amount") or None
        row["type"] = item.get("type", "")
        
        # Medical-specific columns (will be NULL for non-medical users)
        row["patient_name"] = header.get("patient_name")
        row["patient_id"] = header.get("patient_id")
        row["prescription_number"] = header.get("prescription_number")
        row["doctor_name"] = header.get("doctor_name")
        
        # Username for RLS
        row["username"] = username
        
        # Industry type from user config
        row["industry_type"] = user_config.get("industry", "")
        
        rows.append(row)
    
    return rows


def process_invoices_batch(
    file_keys: List[str],
    r2_bucket: str,
    sheet_id: str,
    username: str,
    progress_callback: Optional[Callable[[int, int, str], None]] = None,
    force_upload: bool = False
) -> Dict[str, Any]:
    """
    Process a batch of invoices from R2 storage with parallel processing
    
    Args:
        file_keys: List of R2 file keys to process
        r2_bucket: R2 bucket name
        sheet_id: Google Sheet ID
        username: Username for logging
        progress_callback: Optional callback function(processed, total, current_file)
        force_upload: If True, bypass duplicate checking and delete old duplicates
    
    Returns:
        Dictionary with processing results including duplicate info
    """
    storage = get_storage_client()
    # sheets_client removed - now using Supabase via database_helpers
    
    results = {
        "total": len(file_keys),
        "processed": 0,
        "failed": 0,
        "errors": [],
        "duplicates": []  # Track detected duplicates
    }
    
    all_rows = []
    results_lock = threading.Lock()
    
    def process_single_file(file_key: str, file_index: int) -> Optional[List[Dict[str, Any]]]:
        """Process a single file and return its rows"""
        try:
            # Update progress - downloading
            if progress_callback:
                progress_callback(file_index, len(file_keys), f"Downloading {file_key}")
            
            # Download from R2
            logger.info(f"[{file_index + 1}/{len(file_keys)}] Downloading: {file_key}")
            image_bytes = storage.download_file(r2_bucket, file_key)
            
            if not image_bytes:
                with results_lock:
                    results["failed"] += 1
                    results["errors"].append(f"Failed to download: {file_key}")
                return None
            
            # ===== DUPLICATE DETECTION =====
            # Calculate image hash
            image_hash = calculate_image_hash(image_bytes)
            logger.info(f"Calculated hash for {file_key}: {image_hash[:16]}...")
            
            # Check for duplicates (unless force_upload is enabled)
            if not force_upload:
                duplicate = check_duplicate_invoice(image_hash, username)
                if duplicate:
                    # Duplicate found - return special result
                    logger.warning(f"Duplicate detected for {file_key} - Receipt: {duplicate.get('Receipt Number', 'N/A')}")
                    with results_lock:
                        results["duplicates"].append({
                            "file_key": file_key,
                            "existing_invoice": duplicate,
                            "image_hash": image_hash
                        })
                    # Don't process further - return None to skip this file
                    return None
            else:
                # Force upload enabled - delete old duplicate if exists
                logger.info(f"Force upload enabled for {file_key} - checking for old duplicates to delete")
                duplicate = check_duplicate_invoice(image_hash, username)
                if duplicate:
                    logger.info(f"Deleting old duplicate for hash {image_hash[:16]}...")
                    delete_invoice_by_hash(image_hash, username)
            
            # Generate presigned URL
            try:
                client = storage.get_client()
                receipt_link = client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': r2_bucket, 'Key': file_key},
                    ExpiresIn=604800  # 7 days
                )
                logger.info(f"Generated presigned URL for {file_key}")
            except Exception as e:
                logger.error(f"Failed to generate presigned URL for {file_key}: {e}")
                receipt_link = f"r2://{r2_bucket}/{file_key}"
            
            # Update progress - automated processing
            if progress_callback:
                progress_callback(file_index, len(file_keys), f"Automated processing: {file_key}")
            
            # Process with automated system (with user-specific prompt)
            invoice_data = process_single_invoice(image_bytes, file_key, receipt_link, username)
            
            if invoice_data:
                # Add image hash to invoice data
                invoice_data["image_hash"] = image_hash
                
                # Convert to rows (with user-specific column mapping)
                rows = convert_to_dataframe_rows(invoice_data, username)
                with results_lock:
                    results["processed"] += 1
                
                # Update progress - completed
                if progress_callback:
                    progress_callback(results["processed"], len(file_keys), f"Completed: {file_key}")
                
                return rows
            else:
                with results_lock:
                    results["failed"] += 1
                    results["errors"].append(f"AI processing failed: {file_key}")
                return None
        
        except Exception as e:
            logger.error(f"Error processing {file_key}: {e}")
            with results_lock:
                results["failed"] += 1
                results["errors"].append(f"Error: {file_key} - {str(e)}")
            return None
    
    # Process files in parallel using ThreadPoolExecutor
    logger.info(f"Starting parallel processing of {len(file_keys)} files with {MAX_WORKERS} workers")
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit all tasks
        future_to_file = {
            executor.submit(process_single_file, file_key, idx): (file_key, idx)
            for idx, file_key in enumerate(file_keys)
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_file):
            file_key, idx = future_to_file[future]
            try:
                rows = future.result()
                if rows:
                    with results_lock:
                        all_rows.extend(rows)
            except Exception as e:
                logger.error(f"Unexpected error in future for {file_key}: {e}")
                with results_lock:
                    results["failed"] += 1
                    results["errors"].append(f"Future error: {file_key} - {str(e)}")
    
    logger.info(f"Parallel processing complete. Processed: {results['processed']}, Failed: {results['failed']}")
    
    
    # Save to Supabase database if we have data
    if all_rows:
        try:
            if progress_callback:
                progress_callback(results["processed"], len(file_keys), "Saving to Supabase database...")
            
            logger.info(f"Saving {len(all_rows)} new rows to Supabase invoices table")
            
            # Get database client
            db = get_database_client()
            
            # Insert rows into Supabase (batch insert)
            saved_count = 0
            failed_inserts = 0
            
            for row in all_rows:
                try:
                    # Use upsert to handle duplicates (update if exists)
                    db.upsert('invoices', row)
                    saved_count += 1
                except Exception as e:
                    logger.error(f"Failed to upsert row {row.get('row_id')}:  {e}")
                    failed_inserts += 1
            
            logger.info(f"✅ SUCCESS: Saved {saved_count} rows to Supabase (failed: {failed_inserts})")
            
            if progress_callback:
                progress_callback(results["processed"], len(file_keys), "Creating verification records...")
            
            # Create verification records in Supabase
            create_verification_records_supabase(all_rows, username)
            
            if progress_callback:
                progress_callback(results["processed"], len(file_keys), "Complete!")
            
        except Exception as e:
            logger.error(f"Error saving to Supabase: {e}")
            results["errors"].append(f"Database save error: {str(e)}")
    
    return results


def create_verification_records(df_new: pd.DataFrame, sheet_id: str):
    """
    Create records in verification sheets for new invoices.
    
    For Verify Dates:
    - Builds Audit Findings with: Date Diff, Missing Date, Duplicate Receipt Number, Duplicate Receipt Link
    - Sets Verification Status based on findings
    
    For Verify Amount:
    - ONLY creates records where Amount Mismatch > 0 (non-zero mismatch)
    - Orders columns as: Status, Receipt Number, Amount Mismatch, Description, Quantity, Rate, Amount, Receipt Link
    """
    import numpy as np
    # sheets_client removed - this old function is kept for reference only
    # Use create_verification_records_supabase() instead
    
    try:
        # =============================================
        # VERIFY DATES - With Audit Findings Logic
        # =============================================
        
        # Group by receipt for date verification (one row per receipt)
        date_records = df_new.groupby('Receipt Number').first().reset_index()
        date_records['Verification Status'] = 'Pending'
        
        # Parse dates for comparison
        date_records['_parsed_date'] = pd.to_datetime(date_records['Date'], errors='coerce', dayfirst=True)
        
        # Sort by Receipt Number and Date for sequential comparison
        date_records = date_records.sort_values(['Receipt Number', '_parsed_date']).reset_index(drop=True)
        
        # Calculate date differences (gap between consecutive receipts)
        prev_date = date_records['_parsed_date'].shift()
        date_records['_date_diff_days'] = (date_records['_parsed_date'] - prev_date).dt.days
        
        # Build Audit Findings
        def build_audit_findings(row, all_records):
            findings = []
            
            # 1. Date Difference (gap from previous receipt)
            diff_days = row.get('_date_diff_days')
            if pd.notna(diff_days) and diff_days != 0:
                findings.append(f"Date Diff: {int(diff_days)}")
            
            # 2. Missing Date
            if pd.isna(row.get('_parsed_date')):
                findings.append("Missing Date")
            
            # 3. Duplicate Receipt Number (if same receipt number appears more than once)
            receipt_num = row.get('Receipt Number', '')
            if receipt_num:
                count = (all_records['Receipt Number'] == receipt_num).sum()
                if count > 1:
                    findings.append("Duplicate Receipt Number")
            
            # 4. Duplicate Receipt Link (same file uploaded twice)
            receipt_link = row.get('Receipt Link', '')
            if receipt_link:
                link_count = (all_records['Receipt Link'] == receipt_link).sum()
                if link_count > 1:
                    findings.append("Duplicate Receipt Link")
            
            return " | ".join(findings) if findings else ""
        
        # Apply audit findings to each row
        date_records['Audit Findings'] = date_records.apply(
            lambda row: build_audit_findings(row, date_records), axis=1
        )
        
        # Set Verification Status based on Audit Findings
        def set_date_status(row):
            audit = str(row.get('Audit Findings', '')).strip()
            if 'Duplicate Receipt Number' in audit:
                return 'Duplicate Receipt Number'
            elif 'Already Verified' in audit:
                return 'Already Verified'
            elif not audit:
                # No issues found - auto-done
                return 'Done'
            else:
                # Has issues - needs review
                return 'Pending'
        
        date_records['Verification Status'] = date_records.apply(set_date_status, axis=1)
        
        # Drop temporary columns
        date_records = date_records.drop(columns=['_parsed_date', '_date_diff_days'], errors='ignore')
        
        # Define column order (matching old code)
        date_cols = ['Verification Status', 'Receipt Number', 'Date', 'Audit Findings', 
                     'Receipt Link', 'Upload Date', 'Row_Id']
        date_records = date_records[[col for col in date_cols if col in date_records.columns]]
        
        # Read existing and append
        df_existing_dates = sheets_client.read_sheet_to_df(sheet_id, SHEET_VERIFY_DATES)
        if not df_existing_dates.empty:
            df_dates_combined = pd.concat([df_existing_dates, date_records], ignore_index=True)
        else:
            df_dates_combined = date_records
        
        sheets_client.write_df_to_sheet(df_dates_combined, sheet_id, SHEET_VERIFY_DATES)
        logger.info(f"Created {len(date_records)} date verification records")
        
        # =============================================
        # VERIFY AMOUNT - Filter Amount Mismatch > 0
        # =============================================
        
        amount_records = df_new.copy()
        
        # CRITICAL: Only include records where Amount Mismatch > 0
        # This ensures records with zero mismatch don't clutter the review sheet
        if 'Amount Mismatch' in amount_records.columns:
            # Convert to numeric and filter
            amount_records['Amount Mismatch'] = pd.to_numeric(
                amount_records['Amount Mismatch'], errors='coerce'
            ).fillna(0)
            amount_records = amount_records[amount_records['Amount Mismatch'] > 0].copy()
        
        # Only proceed if there are records with mismatches
        if not amount_records.empty:
            amount_records['Verification Status'] = 'Pending'
            
            # Define column order (user's expected order):
            # Status, Receipt Number, Amount Mismatch, Description, Quantity, Rate, Amount, Receipt Link
            amount_cols = [
                'Verification Status', 
                'Receipt Number', 
                'Amount Mismatch',
                'Description', 
                'Quantity', 
                'Rate', 
                'Amount', 
                'Receipt Link',
                'Row_Id'
            ]
            amount_records = amount_records[[col for col in amount_cols if col in amount_records.columns]]
            
            # Read existing and append
            df_existing_amounts = sheets_client.read_sheet_to_df(sheet_id, SHEET_VERIFY_AMOUNT)
            if not df_existing_amounts.empty:
                df_amounts_combined = pd.concat([df_existing_amounts, amount_records], ignore_index=True)
            else:
                df_amounts_combined = amount_records
            
            sheets_client.write_df_to_sheet(df_amounts_combined, sheet_id, SHEET_VERIFY_AMOUNT)
            logger.info(f"Created {len(amount_records)} amount verification records (filtered: Amount Mismatch > 0)")
        else:
            logger.info("No amount verification records needed (all Amount Mismatch = 0)")
        
    except Exception as e:
        logger.error(f"Error creating verification records: {e}")
        raise


def create_verification_records_supabase(all_rows: List[Dict[str, Any]], username: str):
    """
    Create verification records in Supabase tables for new invoices.
    
    For verification_dates:
    - One record per receipt number
    - Builds Audit Findings (date diff, missing date, duplicates)
    - Auto-sets status to 'Done' if no issues
    
    For verification_amounts:
    - One record per line item
    - ONLY creates records where amount_mismatch > 0
    
    Args:
        all_rows: List of row dictionaries from convert_to_dataframe_rows
        username: Username for RLS
    """
    import pandas as pd
    import numpy as np
    
    db = get_database_client()
    
    try:
        # Convert rows to DataFrame for easier processing
        df_new = pd.DataFrame(all_rows)
        
        if df_new.empty:
            logger.info("No rows to create verification records for")
            return
        
        # =============================================
        # VERIFY DATES - With Audit Findings Logic
        # =============================================
        
        # Group by receipt_number for date verification (one row per receipt)
        date_records = df_new.groupby('receipt_number').first().reset_index()
        date_records['verification_status'] = 'Pending'
        
        # Parse dates for comparison - dates are stored in YYYY-MM-DD format in database
        date_records['_parsed_date'] = pd.to_datetime(
            date_records['date'], 
            format='%Y-%m-%d',  # YYYY-MM-DD format (PostgreSQL DATE)
            errors='coerce'
        )
        
        # Sort by receipt_number and date for sequential comparison
        date_records = date_records.sort_values(['receipt_number', '_parsed_date']).reset_index(drop=True)
        
        # Calculate date differences (gap between consecutive receipts)
        prev_date = date_records['_parsed_date'].shift()
        date_records['_date_diff_days'] = (date_records['_parsed_date'] - prev_date).dt.days
        
        # Build Audit Findings
        def build_audit_findings(row, all_records):
            findings = []
            
            # 1. Date Difference (gap from previous receipt)
            # Exclude diff of 1 day as it's normal sequential progression
            diff_days = row.get('_date_diff_days')
            if pd.notna(diff_days) and diff_days != 0 and diff_days != 1:
                findings.append(f"Date Diff: {int(diff_days)}")
            
            # 2. Missing Date
            if pd.isna(row.get('_parsed_date')):
                findings.append("Missing Date")
            
            # 3. Duplicate Receipt Number (if same receipt number appears more than once)
            receipt_num = row.get('receipt_number', '')
            if receipt_num:
                count = (all_records['receipt_number'] == receipt_num).sum()
                if count > 1:
                    findings.append("Duplicate Receipt Number")
            
            # 4. Duplicate Receipt Link (same file uploaded twice)
            receipt_link = row.get('receipt_link', '')
            if receipt_link:
                link_count = (all_records['receipt_link'] == receipt_link).sum()
                if link_count > 1:
                    findings.append("Duplicate Receipt Link")
            
            return " | ".join(findings) if findings else ""
        
        # Apply audit findings to each row
        date_records['audit_findings'] = date_records.apply(
            lambda row: build_audit_findings(row, date_records), axis=1
        )
        
        # Set Verification Status based on Audit Findings
        def set_date_status(row):
            audit = str(row.get('audit_findings', '')).strip()
            if 'Duplicate Receipt Number' in audit:
                return 'Duplicate Receipt Number'
            elif 'Already Verified' in audit:
                return 'Already Verified'
            elif not audit:
                # No issues found - auto-done
                return 'Done'
            else:
                # Has issues - needs review
                return 'Pending'
        
        date_records['verification_status'] = date_records.apply(set_date_status, axis=1)
        
        # Drop temporary columns
        date_records = date_records.drop(columns=['_parsed_date', '_date_diff_days'], errors='ignore')
        
        # Insert date verification records into Supabase
        date_insert_count = 0
        for _, row in date_records.iterrows():
            try:
                date_row = {
                    'username': username,
                    'receipt_number': row.get('receipt_number'),
                    'date': row.get('date'),
                    'audit_findings': row.get('audit_findings'),
                    'verification_status': row.get('verification_status'),
                    'receipt_link': row.get('receipt_link'),
                    'upload_date': row.get('upload_date'),
                    'row_id': row.get('row_id')
                }
                db.insert('verification_dates', date_row)
                date_insert_count += 1
            except Exception as e:
                logger.error(f"Failed to insert date verification record: {e}")
        
        logger.info(f"Created {date_insert_count} date verification records in Supabase")
        
        # =============================================
        # VERIFY AMOUNT - Filter Amount Mismatch > 0
        # =============================================
        
        amount_records = df_new.copy()
        
        # CRITICAL: Only include records where amount_mismatch > 0
        if 'amount_mismatch' in amount_records.columns:
            # Convert to numeric and filter
            amount_records['amount_mismatch'] = pd.to_numeric(
                amount_records['amount_mismatch'], errors='coerce'
            ).fillna(0)
            amount_records = amount_records[amount_records['amount_mismatch'] > 0].copy()
        
        # Only proceed if there are records with mismatches
        if not amount_records.empty:
            amount_records['verification_status'] = 'Pending'
            
            # Insert amount verification records into Supabase
            amount_insert_count = 0
            for _, row in amount_records.iterrows():
                try:
                    amount_row = {
                        'username': username,
                        'verification_status': 'Pending',
                        'receipt_number': row.get('receipt_number'),
                        'description': row.get('description'),
                        'quantity': row.get('quantity'),
                        'rate': row.get('rate'),
                        'amount': row.get('amount'),
                        'amount_mismatch': row.get('amount_mismatch'),
                        'receipt_link': row.get('receipt_link'),
                        'row_id': row.get('row_id')
                    }
                    db.insert('verification_amounts', amount_row)
                    amount_insert_count += 1
                except Exception as e:
                    logger.error(f"Failed to insert amount verification record: {e}")
            
            logger.info(f"Created {amount_insert_count} amount verification records in Supabase (filtered: amount_mismatch > 0)")
        else:
            logger.info("No amount verification records needed (all amount_mismatch = 0)")
        
    except Exception as e:
        logger.error(f"Error creating verification records in Supabase: {e}")
        raise
