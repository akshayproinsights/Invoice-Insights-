-- Migration: Add row_id column to invoices table
-- This makes deletion logic consistent across all tables

-- Step 1: Add the row_id column (nullable first)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS row_id TEXT;

-- Step 2: Populate row_id for existing records
-- Workaround for Supabase: Use CTE with UPDATE-FROM pattern instead of window function in UPDATE

-- Create temporary table with row_id values
WITH numbered_invoices AS (
    SELECT 
        id,
        receipt_number || '_' || (
            ROW_NUMBER() OVER (
                PARTITION BY username, receipt_number 
                ORDER BY created_at, id
            ) - 1
        )::text AS new_row_id
    FROM invoices
    WHERE row_id IS NULL
)
UPDATE invoices
SET row_id = numbered_invoices.new_row_id
FROM numbered_invoices
WHERE invoices.id = numbered_invoices.id;

-- Step 3: Make row_id NOT NULL (after populating existing data)
ALTER TABLE invoices
ALTER COLUMN row_id SET NOT NULL;

-- Step 4: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_row_id ON invoices(username, row_id);

-- Step 5: Verify the migration
-- This query should show no NULL row_ids
SELECT COUNT(*) as null_count FROM invoices WHERE row_id IS NULL;

-- Example query to verify format
-- SELECT receipt_number, row_id, description 
-- FROM invoices 
-- WHERE username = 'Adnak' 
-- ORDER BY receipt_number, row_id 
-- LIMIT 10;
