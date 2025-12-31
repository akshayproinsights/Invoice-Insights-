"""
Quick test script to verify Google API key is loaded correctly
"""
import sys
from pathlib import Path

# Add parent directory to path
parent_dir = Path(__file__).parent
sys.path.insert(0, str(parent_dir))

import configs

print("=" * 60)
print("Testing Google API Key Configuration")
print("=" * 60)

# Load secrets
secrets = configs.load_secrets()
print(f"\n[OK] Secrets loaded: {bool(secrets)}")
print(f"  Available keys: {list(secrets.keys()) if secrets else 'None'}")

# Test API key retrieval
api_key = configs.get_google_api_key()
if api_key:
    print(f"\n[OK] Google API Key found!")
    print(f"  Key starts with: {api_key[:20]}..." if len(api_key) > 20 else f"  Key: {api_key}")
else:
    print(f"\n[ERROR] Google API Key NOT found!")
    print("\nPlease add one of these keys to your .streamlit/secrets.toml file:")
    print("  - google_api_key")
    print("  - GOOGLE_API_KEY")
    print("  - gemini_api_key")
    print("  - GEMINI_API_KEY")
    print("\nExample:")
    print('  google_api_key = "AIzaSyD..."')

print("\n" + "=" * 60)

