-- Migration: Add image_hash column to stock_levels table
-- Created: 2026-01-21
-- Purpose: Track which mapping sheet was used to set stock values, prevent duplicate uploads

-- Add image_hash to stock_levels table
ALTER TABLE stock_levels 
ADD COLUMN IF NOT EXISTS image_hash TEXT;

-- Add comment
COMMENT ON COLUMN stock_levels.image_hash IS 'Hash of uploaded mapping sheet image for duplicate detection';

-- Create index for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_stock_levels_image_hash ON stock_levels(username, image_hash);
