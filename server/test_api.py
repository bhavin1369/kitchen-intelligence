from app import create_app

app = create_app()
client = app.test_client()

def test_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data["success"] is True
    print("✓ Health endpoint verified:", data["status"], data["database"]["counts"])

def test_auth():
    # Test valid login
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data["success"] is True
    token = data["data"]["token"]
    print("✓ Auth login verified. Role:", data["data"]["user"]["role"])

    # Test /me endpoint with Bearer token
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    print("res_me status:", res_me.status_code, res_me.get_json())
    assert res_me.status_code == 200
    data_me = res_me.get_json()
    assert data_me["data"]["username"] == "admin"
    print("✓ Auth /me verified for user:", data_me["data"]["username"])

    # Test invalid password
    res_bad = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert res_bad.status_code == 401
    print("✓ Invalid password correctly rejected (401)")

if __name__ == "__main__":
    print("Running Flask backend API tests...")
    test_health()
    test_auth()
    print("All backend Phase 1 tests passed successfully!")
