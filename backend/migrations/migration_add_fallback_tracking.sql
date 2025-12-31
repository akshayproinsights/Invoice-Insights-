-- Migration: Add fallback tracking columns for Gemini Pro model monitoring
-- This helps track when fallback to Pro model occurs and captures processing errors
-- Run this SQL in Supabase SQL Editor

-- Add fallback tracking columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fallback_attempted BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fallback_reason TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS processing_errors TEXT;

-- Add fallback tracking columns to verified_invoices table
ALTER TABLE verified_invoices ADD COLUMN IF NOT EXISTS fallback_attempted BOOLEAN DEFAULT FALSE;
ALTER TABLE verified_invoices ADD COLUMN IF NOT EXISTS fallback_reason TEXT;
ALTER TABLE verified_invoices ADD COLUMN IF NOT EXISTS processing_errors TEXT;

-- Add fallback tracking columns to verification_dates table
ALTER TABLE verification_dates ADD COLUMN IF NOT EXISTS fallback_attempted BOOLEAN DEFAULT FALSE;
ALTER TABLE verification_dates ADD COLUMN IF NOT EXISTS fallback_reason TEXT;
ALTER TABLE verification_dates ADD COLUMN IF NOT EXISTS processing_errors TEXT;

-- Add fallback tracking columns to verification_amounts table
ALTER TABLE verification_amounts ADD COLUMN IF NOT EXISTS fallback_attempted BOOLEAN DEFAULT FALSE;
ALTER TABLE verification_amounts ADD COLUMN IF NOT EXISTS fallback_reason TEXT;
ALTER TABLE verification_amounts ADD COLUMN IF NOT EXISTS processing_errors TEXT;

-- Verify columns were added
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('invoices', 'verified_invoices', 'verification_dates', 'verification_amounts')
  AND column_name IN ('fallback_attempted', 'fallback_reason', 'processing_errors')
ORDER BY table_name, column_name;

-- Confirm migration
SELECT 'Fallback tracking migration completed successfully!' as status;
