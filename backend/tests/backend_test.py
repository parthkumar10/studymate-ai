"""Backend smoke tests for StudyMate."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://studymate-preview-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(s, email, password):
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    return r


class TestAuth:
    def test_login_existing_user(self):
        s = _session()
        r = _login(s, "student@test.com", "study123")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("user", {}).get("email") == "student@test.com"

    def test_me_requires_auth(self):
        s = _session()
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_login_bad_password(self):
        s = _session()
        r = _login(s, "student@test.com", "wrong")
        assert r.status_code in (400, 401)

    def test_logout(self):
        s = _session()
        assert _login(s, "student@test.com", "study123").status_code == 200
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # me should be 401 after logout
        assert s.get(f"{API}/auth/me").status_code == 401


class TestGenerationsAndOwnership:
    def test_empty_input_rejected(self):
        s = _session()
        assert _login(s, "student@test.com", "study123").status_code == 200
        r = s.post(f"{API}/generate", json={"type": "summary", "input_text": "   "})
        assert r.status_code == 400

    def test_list_generations_auth_required(self):
        s = _session()
        r = s.get(f"{API}/generations")
        assert r.status_code == 401

    def test_cross_user_ownership_404(self):
        # user A generates
        a = _session()
        assert _login(a, "student@test.com", "study123").status_code == 200
        notes = "Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose. It happens in chloroplasts and involves chlorophyll."
        gen = a.post(f"{API}/generate", json={"type": "summary", "input_text": notes})
        assert gen.status_code == 200, gen.text
        gid = gen.json().get("id")
        assert gid

        # user B tries to read
        b = _session()
        assert _login(b, "userb@test.com", "study123").status_code == 200
        r = b.get(f"{API}/generations/{gid}")
        assert r.status_code == 404
        d = b.delete(f"{API}/generations/{gid}")
        assert d.status_code == 404
