"""
Stock Mapping Sheet Upload Routes
Handles PDF upload, Gemini extraction, and data storage for vendor mapping sheets.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
from datetime import datetime
import hashlib
import logging
import json

from database import get_database_client
from auth import get_current_user
from services.storage import get_storage_client
from models.mapping_models import (
    MappingSheetUploadResponse,
    MappingSheetExtractedData,
    VendorMappingSheet
)
from config_loader import load_user_config
from config import get_mappings_folder, get_google_api_key
from google import genai
from google.genai import types

# Import recalculation function to trigger after upload
from routes.stock_routes import recalculate_stock_for_user

logger = logging.getLogger(__name__)
router = APIRouter()


def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA256 hash of file content"""
    return hashlib.sha256(content).hexdigest()


@router.post("/upload", response_model=MappingSheetUploadResponse)
async def upload_mapping_sheet(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload vendor mapping sheet PDF/Image
    - Uploads to R2: {username}/mappings/
    - Triggers Gemini extraction
    - Directly updates stock_levels table with extracted data
    """
    username = current_user.get("username")
    
    try:
        # 1. Read file content
        content = await file.read()
        file_hash = calculate_file_hash(content)
        
        # Note: No duplicate check needed - we're doing UPDATE-ONLY
        # Re-uploading same file will just refresh the data
        db = get_database_client()
        
        # Continue with processing (will create fresh records)
        
        # 3. Upload to R2 using dynamic path
        storage = get_storage_client()
        user_config = load_user_config(username)
        bucket = user_config.get("r2_bucket")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        extension = file.filename.split(".")[-1] if "." in file.filename else "pdf"
        filename = f"{timestamp}_{file_hash[:8]}.{extension}"
        
        mappings_folder = get_mappings_folder(username)
        key = f"{mappings_folder}{filename}"
        
        success = storage.upload_file(
            file_data=content,
            bucket=bucket,
            key=key,
            content_type=file.content_type
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to upload to storage")
        
        image_url = storage.get_public_url(bucket, key)
        
        # 4. Extract data using Gemini
        logger.info(f"Starting Gemini extraction for {filename}")
        
        # Load user config for Gemini prompt
        user_config = load_user_config(username)
        vendor_mapping_config = user_config.get("vendor_mapping_gemini", {})
        system_instruction = vendor_mapping_config.get("system_instruction")
        
        if not system_instruction:
            raise HTTPException(
                status_code=500,
                detail="vendor_mapping_gemini prompt not configured"
            )
        
        # Configure Gemini
        gemini_api_key = get_google_api_key()
        
        if not gemini_api_key:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        client = genai.Client(api_key=gemini_api_key)
        
        # Generate extraction using new API
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=[
                types.Part.from_bytes(data=content, mime_type=file.content_type or "image/png"),
                system_instruction
            ],
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        
        # Parse JSON response
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        extracted_data = json.loads(response_text)
        logger.info(f"Extracted {len(extracted_data.get('rows', []))} rows")
        
        # 5. Process extracted data and create mappings
        rows_data = extracted_data.get("rows", [])
        updated_stock_count = 0
        created_mapping_count = 0
        updated_mapping_count = 0
        skipped_count = 0
        
        for row in rows_data:
            row_number = row.get("row_number")
            part_number = row.get("part_number")
            vendor_description = row.get("vendor_description")
            customer_item = row.get("customer_item")
            priority = row.get("priority")
            stock = row.get("stock")
            reorder = row.get("reorder")
            
            # DEBUG: Log extracted values
            logger.info(f"🔍 Processing row: part={part_number}, customer_item={customer_item}, priority={priority}, stock={stock}, reorder={reorder}")
            
            if not part_number:
                logger.warning(f"Skipping row without part_number: {row}")
                skipped_count += 1
                continue
            
            # Check if stock_levels record exists
            existing_stock = db.client.table("stock_levels")\
                .select("id, internal_item_name")\
                .eq("username", username)\
                .eq("part_number", part_number)\
                .execute()
            
            if existing_stock.data:
                # A. UPDATE stock_levels with priority, old_stock, reorder_point
                # (NOT customer_items - that comes from vendor_mapping_entries)
                update_data = {
                    "priority": priority,
                    "old_stock": stock,
                    "reorder_point": reorder,
                    "image_hash": file_hash,
                    "updated_at": datetime.now().isoformat()
                }
                
                db.client.table("stock_levels")\
                    .update(update_data)\
                    .eq("username", username)\
                    .eq("part_number", part_number)\
                    .execute()
                updated_stock_count += 1
                logger.info(f"✏️ Updated stock_levels for part {part_number}")
                
                # B. CREATE or UPDATE vendor_mapping_entries for customer item mapping
                if customer_item:
                    internal_item_name = existing_stock.data[0].get("internal_item_name", vendor_description)
                    
                    # Check if mapping already exists
                    existing_mapping = db.client.table("vendor_mapping_entries")\
                        .select("id")\
                        .eq("username", username)\
                        .eq("part_number", part_number)\
                        .execute()
                    
                    if existing_mapping.data:
                        # UPDATE existing mapping
                        db.client.table("vendor_mapping_entries")\
                            .update({
                                "row_number": row_number,
                                "customer_item_name": customer_item,
                                "vendor_description": internal_item_name,
                                "status": "Added",
                                "updated_at": datetime.now().isoformat()
                            })\
                            .eq("username", username)\
                            .eq("part_number", part_number)\
                            .execute()
                        updated_mapping_count += 1
                        logger.info(f"📝 Updated mapping for part {part_number} → {customer_item}")
                    else:
                        # CREATE new mapping
                        db.client.table("vendor_mapping_entries")\
                            .insert({
                                "username": username,
                                "row_number": row_number,
                                "part_number": part_number,
                                "vendor_description": internal_item_name,
                                "customer_item_name": customer_item,
                                "status": "Added",
                                "created_at": datetime.now().isoformat(),
                                "updated_at": datetime.now().isoformat()
                            })\
                            .execute()
                        created_mapping_count += 1
                        logger.info(f"✨ Created mapping for part {part_number} → {customer_item}")
            else:
                # SKIP - part number not found in existing stock_levels
                skipped_count += 1
                logger.warning(f"⚠️ Skipped part {part_number}: not found in stock_levels (extracted from image but no match)")
        
        
        total_mappings = created_mapping_count + updated_mapping_count
        logger.info(f"✅ Stock Updates: {updated_stock_count}, Mappings Created: {created_mapping_count}, Mappings Updated: {updated_mapping_count}, Skipped: {skipped_count}")
        
        # 6. Trigger stock recalculation to update all derived fields
        # This will populate customer_items from vendor_mapping_entries
        logger.info(f"🔄 Triggering stock recalculation to apply new values...")
        try:
            recalculate_stock_for_user(username)
            logger.info(f"✅ Stock recalculation completed successfully")
        except Exception as recalc_error:
            logger.error(f"⚠️ Stock recalculation failed: {recalc_error}")
            # Don't fail the upload, just log the error
        
        skipped_note = f", Skipped: {skipped_count}" if skipped_count > 0 else ""
        mapping_note = f" | Mappings: {total_mappings} ({created_mapping_count} new, {updated_mapping_count} updated)" if total_mappings > 0 else ""
        
        return MappingSheetUploadResponse(
            sheet_id="",
            image_url=image_url,
            status="completed",
            message=f"Successfully processed {len(rows_data)} rows (Stock: {updated_stock_count}{skipped_note}){mapping_note}. Recalculated.",
            extracted_rows=len(rows_data)
        )
    
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse extraction results")
    
    except Exception as e:
        logger.error(f"Error uploading mapping sheet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sheets", response_model=List[VendorMappingSheet])
async def get_mapping_sheets(current_user: dict = Depends(get_current_user)):
    """Get all uploaded mapping sheets for current user"""
    username = current_user.get("username")
    
    try:
        db = get_database_client()
        response = db.client.table("vendor_mapping_sheets")\
            .select("*")\
            .eq("username", username)\
            .order("uploaded_at", desc=True)\
            .execute()
        
        return response.data
    
    except Exception as e:
        logger.error(f"Error fetching mapping sheets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sheets/{sheet_id}")
async def delete_mapping_sheet(
    sheet_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a mapping sheet"""
    username = current_user.get("username")
    
    try:
        db = get_database_client()
        response = db.client.table("vendor_mapping_sheets")\
            .delete()\
            .eq("id", sheet_id)\
            .eq("username", username)\
            .execute()
        
        return {"message": "Mapping sheet deleted successfully"}
    
    except Exception as e:
        logger.error(f"Error deleting mapping sheet: {e}")
        raise HTTPException(status_code=500, detail=str(e))
