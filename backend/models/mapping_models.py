"""
Pydantic models for vendor mapping sheets feature.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MappingSheetExtractedRow(BaseModel):
    """Single row extracted from mapping sheet by Gemini"""
    row_number: int
    vendor_description: str
    part_number: Optional[str] = None
    customer_item: Optional[str] = None
    old_stock: Optional[float] = None
    reorder_point: Optional[int] = None
    notes: Optional[str] = None
    confidence: float


class MappingSheetExtractedData(BaseModel):
    """Gemini extraction result for entire sheet"""
    rows: List[MappingSheetExtractedRow]


class VendorMappingSheet(BaseModel):
    """Database model for vendor_mapping_sheets table"""
    id: str
    username: str
    image_url: str
    image_hash: str
    part_number: Optional[str] = None
    vendor_description: Optional[str] = None
    customer_item: Optional[List[str]] = None  # Array for multi-select
    old_stock: Optional[float] = None
    reorder_point: Optional[int] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    status: str = "pending"
    gemini_raw_response: Optional[dict] = None


class MappingSheetUploadResponse(BaseModel):
    """Response after successful upload"""
    sheet_id: str
    image_url: str
    status: str
    message: str
    extracted_rows: Optional[int] = None


class MappingSheetUpdate(BaseModel):
    """Request to update mapping sheet data"""
    customer_item: Optional[str] = None
    old_stock: Optional[float] = None
    reorder_point: Optional[int] = None
