-- Migration: Add header_id column to verification_amounts table
-- Description: Adds a UUID column to link line items to their header record for stable relationships.

ALTER TABLE verification_amounts 
ADD COLUMN header_id UUID;

-- Optional: Create an index for performance
CREATE INDEX idx_verification_amounts_header_id ON verification_amounts(header_id);
