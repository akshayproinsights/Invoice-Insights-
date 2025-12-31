"""
Database migration script to add model tracking columns.
Adds columns for model name, accuracy, token usage, and cost tracking.

This script uses the database connection string to directly execute SQL.
"""
import os
import sys

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

def add_model_columns():
    """Add model tracking columns to all invoice-related tables"""
    
    # Import psycopg2 (PostgreSQL adapter)
    try:
        import psycopg2
        from psycopg2 import sql
    except ImportError:
        print("❌ psycopg2 not installed. Installing...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2
        from psycopg2 import sql
    
    # Get database connection string from Supabase URL
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_password = os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url:
        raise ValueError("Missing SUPABASE_URL in environment")
    
    # Extract project reference from URL (e.g., https://xyz.supabase.co -> xyz)
    project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "").split("/")[0]
    
    # Construct database connection string
    # Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
    db_password = supabase_password
    if not db_password:
        print("⚠️  Database password not found in environment variables.")
        print("Please enter your Supabase database password:")
        db_password = input().strip()
    
    conn_string = f"postgresql://postgres.{project_ref}:{db_password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
    
    # Alternative: Direct connection (port 5432)
    # conn_string = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"
    
    print("Connecting to database...")
    print("=" * 60)
    
    try:
        # Connect to database
        conn = psycopg2.connect(conn_string)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("✓ Connected successfully!\n")
        
        # Tables to update
        tables = [
            'invoices',
            'verified_invoices',
            'verification_dates',
            'verification_amounts'
        ]
        
        # Column definitions
        columns = [
            ('model_used', 'TEXT'),
            ('model_accuracy', 'REAL'),
            ('input_tokens', 'INTEGER'),
            ('output_tokens', 'INTEGER'),
            ('total_tokens', 'INTEGER'),
            ('cost_inr', 'REAL')
        ]
        
        print("Adding model tracking columns to tables...")
        print("=" * 60)
        
        for table_name in tables:
            print(f"\nProcessing table: {table_name}")
            
            for col_name, col_type in columns:
                try:
                    # Add column if not exists
                    add_column_sql = f"""
                        ALTER TABLE {table_name} 
                        ADD COLUMN IF NOT EXISTS {col_name} {col_type};
                    """
                    
                    cursor.execute(add_column_sql)
                    print(f"  ✓ Added column: {col_name} ({col_type})")
                    
                except Exception as e:
                    print(f"  ✗ Error adding {col_name}: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Migration complete!")
        print("\nNew columns added:")
        print("  - model_used: Tracks which Gemini model was used")
        print("  - model_accuracy: Average confidence percentage")
        print("  - input_tokens: Number of input tokens")
        print("  - output_tokens: Number of output tokens")
        print("  - total_tokens: Total tokens (input + output)")
        print("  - cost_inr: Processing cost in Indian Rupees")
        
        # Close connection
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print("\n💡 Troubleshooting:")
        print("  1. Check that SUPABASE_URL is correct in .env")
        print("  2. Verify database password")
        print("  3. Ensure your IP is allowed in Supabase dashboard")
        sys.exit(1)

if __name__ == "__main__":
    try:
        add_model_columns()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)

