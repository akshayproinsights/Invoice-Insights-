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
