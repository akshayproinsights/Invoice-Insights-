# 📄 DigiEntry

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/backend-FastAPI-success)
![React](https://img.shields.io/badge/frontend-React-61DAFB)
![Supabase](https://img.shields.io/badge/database-Supabase-3ECF8E)
![AI](https://img.shields.io/badge/AI-Gemini_Pro_%26_Flash-8E75B2)

**DigiEntry** is an intelligent, automated invoice processing system designed to streamline data extraction, verification, and management. Leveraging Google's **Gemini AI models**, it extracts critical details from invoice images with high accuracy and provides a seamless review interface.

---

## 🚀 Features

### 🤖 AI-Powered Extraction
- **Dual-Model Architecture**: Utilizes **Gemini 2.0 Flash** for speed and cost-efficiency, automatically falling back to **Gemini 3.0 Pro** for complex documents.
- **Smart Fields**: Extracts Invoice Number, Date, Total Amount, Vendor Name, and Industry Type.

### 🛡️ Robust Verification
- **Duplicate Detection**: Prevents double-entry using perceptual image hashing (pHash) and fuzzy content matching.
- **Review Workflow**: Dedicated interfaces for verifying **Dates** and **Amounts** before final commitment.
- **Status Tracking**: Track invoices through `Pending`, `Verified`, `Rejected`, or `Duplicate` states.

### 📊 Data Management
- **Supabase Integration**: Secure, real-time database storage.
- **Cost Analytics**: Tracks token usage and estimated API costs per processed invoice.
- **Industry Templates**: Configurable JSON templates for different industry standards (e.g., Automobile, Retail).

---

## 🛠️ Tech Stack

### **Backend** (Python)
- **Framework**: FastAPI
- **AI**: Google Generative AI (Gemini)
- **Database**: Supabase (PostgREST)
- **Image Processing**: Pillow (PIL), ImageHash

### **Frontend** (TypeScript)
- **Framework**: React + Vite
- **Styling**: TailwindCSS
- **State Management**: React Hooks
- **Icons**: Lucide React

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Supabase Account
- Google Cloud API Key (for Gemini)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see `.env.example`):
```ini
GOOGLE_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
```

Run the server:
```bash
python -m uvicorn main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```ini
VITE_API_URL=http://localhost:8000
```

Run the client:
```bash
npm run dev
```

---

## 📂 Project Structure

```
├── backend/
│   ├── routes/         # API endpoints (Upload, Review, etc.)
│   ├── services/       # Business logic (AI Processor, Deduplication)
│   ├── migrations/     # SQL Migration scripts
│   └── main.py         # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── pages/      # Review, Verify, Upload pages
│   │   └── components/ # Reusable UI components
│   └── vite.config.ts
│
└── scripts/
    └── archive/        # Archived utility scripts
```

---

## 🔒 Security Note
This project uses `.gitignore` to prevent secret leakage. Ensure you never commit `credentials.json`, `secrets.toml`, or `.env` files.

---

Made with ❤️ by [Akshay Pro Insights]
