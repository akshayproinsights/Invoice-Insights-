# Table Schema Documentation

## Table Structures

### invoices
**Primary Key:** `id` (UUID)
**Row Identifier:** `row_id` (text) - Format: `"{receipt_number}_{line_number}"`

**Key Columns:**
- `id` - UUID primary key
- `row_id` - Composite identifier for line items 
- `receipt_number` - Receipt number (text)
- `verification_status` - NOT USED in this table

**Usage:**
- Deletion: Use `row_id` to delete specific line items
- Receipt deletion: Use `receipt_number` to delete all line items for a receipt

---

### verification_dates  
**Primary Key:** `id` (int, auto-increment)
**Row Identifier:** `row_id` (text)

**Key Columns:**
- `id` - Auto-increment integer (verification table's own ID, NOT related to invoices.id)
- `row_id` - References invoices.row_id
- `receipt_number` - Receipt number
- `verification_status` - Status: 'pending', 'done', 'duplicate receipt number'

**Usage:**
- Display filter: WHERE `verification_status` IN ('pending', 'duplicate receipt number') OR (status='done' AND showCompleted=true)
- Deletion: Use `row_id`

---

### verification_amounts
**Primary Key:** `id` (int, auto-increment)  
**Row Identifier:** `row_id` (text)

**Key Columns:**
- `id` - Auto-increment integer (NOT related to invoices.id)
- `row_id` - References invoices.row_id
- `receipt_number` - Receipt number
- `verification_status` - Status: 'pending', 'done', 'duplicate receipt number' 
- `amount_mismatch` - Decimal

**Usage:**
- Display filter: WHERE `verification_status` IN ('pending','duplicate receipt number') OR (status='done' AND showCompleted=true)
- Deletion: Use `row_id`

---

### verified_invoices
**Primary Key:** `id` (UUID)
**Row Identifier:** `row_id` (text)

**Key Columns:**
- `id` - UUID primary key
- `row_id` - Line item identifier
- `receipt_number` - Receipt number

**Usage:**
- Final verified records (no status field)
- Deletion: Use `row_id`

## Column Mapping

**Backend (Supabase)** → **Frontend (Display)**
- `verification_status` → `'Verification Status'`
- `row_id` → `'Row_Id'`  
- `receipt_number` → `'Receipt Number'`

Applied via `mapArrayToFrontend()` in api.ts
