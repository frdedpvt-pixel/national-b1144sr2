
import requests
import os

API_URL = 'http://localhost:5500/api/upload'

def test_upload(filename):
    if not os.path.exists(filename):
        print(f"File {filename} not found.")
        return

    print(f"Testing upload of {filename}...")
    with open(filename, 'rb') as f:
        files = {'file': f}
        try:
            response = requests.post(API_URL, files=files)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    print("--- Testing CSV Upload ---")
    test_upload('test_students_large.csv')
    
    print("\n--- Testing JSON Upload ---")
    test_upload('test_students_complex.json')
