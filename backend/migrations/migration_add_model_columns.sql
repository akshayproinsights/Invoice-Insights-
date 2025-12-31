-- Database migration script for model tracking columns
-- Run this SQL in Supabase SQL Editor

-- Add model tracking columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS model_accuracy REAL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_tokens INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cost_inr REAL;

-- Add model tracking columns to verified_invoices table
ALTER TABLE verified_invoices ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE verified_invoices ADD COLUMN IF NOT EXISTS model_accuracy REAL;
ALTER TABLE verified_invoices ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE verified_invoices ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE verified_invoices ADD COLUMN IF NOT EXISTS total_tokens INTEGER;
ALTER TABLE verified_invoices ADD COLUMN IF NOT EXISTS cost_inr REAL;

-- Add model tracking columns to verification_dates table
ALTER TABLE verification_dates ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE verification_dates ADD COLUMN IF NOT EXISTS model_accuracy REAL;
ALTER TABLE verification_dates ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE verification_dates ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE verification_dates ADD COLUMN IF NOT EXISTS total_tokens INTEGER;
ALTER TABLE verification_dates ADD COLUMN IF NOT EXISTS cost_inr REAL;

-- Add model tracking columns to verification_amounts table
ALTER TABLE verification_amounts ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE verification_amounts ADD COLUMN IF NOT EXISTS model_accuracy REAL;
ALTER TABLE verification_amounts ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE verification_amounts ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE verification_amounts ADD COLUMN IF NOT EXISTS total_tokens INTEGER;
ALTER TABLE verification_amounts ADD COLUMN IF NOT EXISTS cost_inr REAL;

-- Confirm migration
SELECT 'Migration completed successfully!' as status;
