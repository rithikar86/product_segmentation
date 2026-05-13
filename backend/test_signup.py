import requests
import json

url = "http://127.0.0.1:5000/api/auth/signup"
payload = {
    "email": "test12345@example.com",
    "password": "password123",
    "shopName": "Test Shop",
    "ownerName": "Test Owner",
    "location": "Test Location"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
