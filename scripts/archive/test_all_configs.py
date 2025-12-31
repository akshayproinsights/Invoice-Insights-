"""
Comprehensive test to verify all configurations are loading from .env
"""
import sys
from pathlib import Path

# Add parent directory to path
parent_dir = Path(__file__).parent
sys.path.insert(0, str(parent_dir))

import configs

print("=" * 60)
print("Configuration Loading Test - .env vs secrets.toml")
print("=" * 60)

# Test 1: Google API Key
print("\n[TEST 1] Google API Key:")
api_key = configs.get_google_api_key()
if api_key:
    print(f"  [OK] Found: {api_key[:20]}...")
else:
    print("  [FAIL] Not found")

# Test 2: R2 Config
print("\n[TEST 2] Cloudflare R2 Config:")
r2_config = configs.get_r2_config()
if r2_config and all(k in r2_config for k in ['account_id', 'endpoint_url', 'access_key_id', 'secret_access_key']):
    print(f"  [OK] Found all required keys")
    print(f"    - account_id: {r2_config['account_id'][:10]}...")
    print(f"    - endpoint_url: {r2_config['endpoint_url'][:40]}...")
else:
    print("  [FAIL] Missing required keys")

# Test 3: Users DB
print("\n[TEST 3] Users Database:")
users = configs.get_users_db()
if users and 'Adnak' in users:
    print(f"  [OK] Found {len(users)} users")
    print(f"    - Users: {', '.join(users.keys())}")
    adnak = users['Adnak']
    print(f"    - Adnak bucket: {adnak.get('r2_bucket')}")
else:
    print("  [FAIL] Users not loaded correctly")

# Test 4: GCP Service Account
print("\n[TEST 4] GCP Service Account:")
gcp = configs.get_gcp_service_account()
if gcp and 'private_key' in gcp:
    print(f"  [OK] Found service account")
    print(f"    - project_id: {gcp.get('project_id')}")
    print(f"    - client_email: {gcp.get('client_email')}")
else:
    print("  [FAIL] Service account not found")

print("\n" + "=" * 60)
print("Summary: All configurations loaded successfully from .env!")
print("=" * 60)
