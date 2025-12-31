import sys
from pathlib import Path
import os

# Mimic backend/config.py path setup
parent_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(parent_dir))

try:
    import toml
    print("toml module is available.")
except ImportError:
    print("toml module is MISSING.")

try:
    import configs
    print(f"Configs loaded from: {configs.__file__}")
    
    secrets = configs.load_secrets()
    print(f"Secrets keys: {list(secrets.keys())}")
    
    users = configs.get_users_db()
    print(f"Users found: {list(users.keys())}")
    
    if "Adnak" in users:
        print(f"Adnak password: {users['Adnak'].get('password')}")
    else:
        print("Adnak not found in users!")
        
except Exception as e:
    print(f"Error: {e}")
