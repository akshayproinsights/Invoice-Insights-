-- Add old_stock column to stock_levels table
-- This column stores manually entered old stock values from uploaded mapping sheets

ALTER TABLE stock_levels 
ADD COLUMN IF NOT EXISTS old_stock NUMERIC(10,2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN stock_levels.old_stock IS 'Old stock value from uploaded vendor mapping sheets';
