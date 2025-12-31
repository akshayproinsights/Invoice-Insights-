import requests
import json

# Test login API
response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "Adnak", "password": "akshay1"}
)

print("Status Code:", response.status_code)
if response.status_code == 200:
    data = response.json()
    print("\nUser data from backend:")
    print(json.dumps(data['user'], indent=2))
    print("\nDashboard URL:", data['user'].get('dashboard_url'))
else:
    print("Error:", response.text)
