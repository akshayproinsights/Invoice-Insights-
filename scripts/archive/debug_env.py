import os
import sys
sys.path.insert(0, '..')

print("=" * 80)
print("ENVIRONMENT VARIABLE CHECK")
print("=" * 80)

# Check if USERS_CONFIG_JSON is in environment
users_json = os.getenv("USERS_CONFIG_JSON")
if users_json:
    print("USERS_CONFIG_JSON found in environment variables!")
    print("Length:", len(users_json))
    print("First 200 chars:", users_json[:200])
else:
    print("USERS_CONFIG_JSON NOT found in environment variables")

print("\n" + "=" * 80)
print("LOADING FROM configs.py")
print("=" * 80)

# Clear cache and load
import configs
configs._secrets_cache = None

from configs import get_users_db
users = get_users_db()

print("Users found:", list(users.keys()))
print("\nAdnak config:")
print("  dashboard_url:", users.get('Adnak', {}).get('dashboard_url'))
