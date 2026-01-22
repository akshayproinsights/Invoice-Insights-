# DigiEntry Backend

FastAPI backend for the DigiEntry application.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configuration:
- Ensure `../.streamlit/secrets.toml` exists with proper configuration
- Or create a `.env` file with JWT_SECRET and other settings

## Running the Server

Development mode:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or:
```bash
python main.py
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── main.py                 # FastAPI app entry point
├── config.py               # Configuration management
├── sheets.py               # Google Sheets integration
├── auth.py                 # JWT authentication
├── routes/                 # API route handlers
│   ├── auth.py
│   ├── upload.py
│   ├── invoices.py
│   ├── review.py
│   └── verified.py
├── services/               # Business logic services
│   └── storage.py          # R2 storage service
└── utils/                  # Utility functions
```

## API Endpoints

### Authentication
- POST `/api/auth/login` - User login
- GET `/api/auth/me` - Get current user
- POST `/api/auth/logout` - Logout

### Upload & Processing
- POST `/api/upload/files` - Upload invoice files
- POST `/api/upload/process` - Process invoices
- GET `/api/upload/process/status/{task_id}` - Check processing status

### Invoices
- GET `/api/invoices` - Get all invoices

### Review
- GET `/api/review/dates` - Get date/receipt review data
- PUT `/api/review/dates` - Save date/receipt review data
- GET `/api/review/amounts` - Get amount review data
- PUT `/api/review/amounts` - Save amount review data
- POST `/api/review/sync-finish` - Sync & finish workflow

### Verified Invoices
- GET `/api/verified` - Get verified invoices (with filters)
- PUT `/api/verified/{id}` - Update verified invoice
- GET `/api/verified/export` - Export verified data
