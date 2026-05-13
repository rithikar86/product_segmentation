import requests

url = "http://localhost:3000/api/auth/signup"
payload = {
    "email": "test_next_proxy@example.com",
    "password": "pwd",
    "shopName": "T",
    "ownerName": "O",
    "location": "L"
}
try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Text: {response.text}")
except Exception as e:
    print(f"Error: {e}")
