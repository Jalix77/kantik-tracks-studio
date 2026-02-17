"""
Kantik Tracks Studio - Backend API Tests
Tests: Auth, Songs, Playlists, Teams, Payments, Admin endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "testuser@kantik.ht"
TEST_USER_PASSWORD = "Test123!"
ADMIN_SETUP_TOKEN = "kantik-setup-2025"
ADMIN_EMAIL = "admin@kantik.ht"

class TestHealth:
    """Health check tests - run first"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("Health endpoint: PASS")
    
    def test_api_root(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Kantik Tracks" in data["message"]
        print("API root endpoint: PASS")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_register_new_user(self):
        unique_email = f"test_{uuid.uuid4().hex[:8]}@kantik.ht"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "displayName": "Test User"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["plan"] == "FREE"
        print(f"Register new user: PASS (email: {unique_email})")
    
    def test_register_duplicate_email(self):
        # First register
        unique_email = f"test_dup_{uuid.uuid4().hex[:8]}@kantik.ht"
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "displayName": "Test User"
        })
        # Try duplicate
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "displayName": "Test User 2"
        })
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
        print("Register duplicate email: PASS (properly rejected)")
    
    def test_login_existing_user(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        print(f"Login existing user: PASS")
    
    def test_login_invalid_credentials(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Login with invalid credentials: PASS (properly rejected)")
    
    def test_get_me_authenticated(self):
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Get me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL
        print("Get authenticated user: PASS")
    
    def test_get_me_unauthenticated(self):
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("Get me without auth: PASS (properly rejected)")


class TestSongs:
    """Song catalog tests"""
    
    def test_get_all_songs(self):
        response = requests.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200
        songs = response.json()
        assert isinstance(songs, list)
        assert len(songs) > 0
        print(f"Get all songs: PASS ({len(songs)} songs)")
    
    def test_get_songs_with_search(self):
        response = requests.get(f"{BASE_URL}/api/songs?search=Grand")
        assert response.status_code == 200
        songs = response.json()
        print(f"Search songs: PASS ({len(songs)} results)")
    
    def test_get_songs_with_filter_language(self):
        response = requests.get(f"{BASE_URL}/api/songs?language=fr")
        assert response.status_code == 200
        songs = response.json()
        for song in songs:
            assert song["language"] == "fr"
        print(f"Filter by language: PASS ({len(songs)} French songs)")
    
    def test_get_songs_with_filter_tier(self):
        response = requests.get(f"{BASE_URL}/api/songs?accessTier=STANDARD")
        assert response.status_code == 200
        songs = response.json()
        for song in songs:
            assert song["accessTier"] == "STANDARD"
        print(f"Filter by tier: PASS ({len(songs)} standard songs)")
    
    def test_get_songs_sorted_by_number(self):
        response = requests.get(f"{BASE_URL}/api/songs?sort=number")
        assert response.status_code == 200
        songs = response.json()
        if len(songs) > 1:
            for i in range(1, len(songs)):
                assert songs[i]["number"] >= songs[i-1]["number"]
        print("Sort by number: PASS")
    
    def test_get_featured_songs(self):
        response = requests.get(f"{BASE_URL}/api/songs/featured")
        assert response.status_code == 200
        songs = response.json()
        assert isinstance(songs, list)
        assert len(songs) <= 6  # Featured is limited to 6
        print(f"Get featured songs: PASS ({len(songs)} songs)")
    
    def test_get_single_song(self):
        # First get any song
        all_songs = requests.get(f"{BASE_URL}/api/songs").json()
        if len(all_songs) > 0:
            song_id = all_songs[0]["id"]
            response = requests.get(f"{BASE_URL}/api/songs/{song_id}")
            assert response.status_code == 200
            song = response.json()
            assert song["id"] == song_id
            assert "title" in song
            assert "number" in song
            print(f"Get single song: PASS (id: {song_id})")
        else:
            pytest.skip("No songs available")
    
    def test_get_song_not_found(self):
        response = requests.get(f"{BASE_URL}/api/songs/nonexistent-song-id")
        assert response.status_code == 404
        print("Get non-existent song: PASS (404 returned)")
    
    def test_get_song_preview_status(self):
        all_songs = requests.get(f"{BASE_URL}/api/songs").json()
        if len(all_songs) > 0:
            song_id = all_songs[0]["id"]
            response = requests.get(f"{BASE_URL}/api/songs/{song_id}/preview/status")
            assert response.status_code == 200
            data = response.json()
            assert "hasPreview" in data
            print(f"Get preview status: PASS (hasPreview: {data['hasPreview']})")


class TestPlaylists:
    """Playlist management tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        token = login_resp.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_playlists_unauthenticated(self):
        response = requests.get(f"{BASE_URL}/api/playlists")
        assert response.status_code == 401
        print("Get playlists without auth: PASS (401 returned)")
    
    def test_get_playlists_authenticated(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/playlists", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"Get playlists: PASS ({len(response.json())} playlists)")
    
    def test_create_playlist(self, auth_headers):
        playlist_name = f"TEST_Playlist_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/playlists", json={
            "name": playlist_name,
            "ownerType": "USER"
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == playlist_name
        assert "id" in data
        print(f"Create playlist: PASS (id: {data['id']})")
        
        # Cleanup - delete the playlist
        requests.delete(f"{BASE_URL}/api/playlists/{data['id']}", headers=auth_headers)
    
    def test_create_and_verify_playlist(self, auth_headers):
        playlist_name = f"TEST_Playlist_{uuid.uuid4().hex[:8]}"
        
        # CREATE
        create_resp = requests.post(f"{BASE_URL}/api/playlists", json={
            "name": playlist_name,
            "ownerType": "USER"
        }, headers=auth_headers)
        assert create_resp.status_code == 200
        playlist_id = create_resp.json()["id"]
        
        # GET to verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/playlists/{playlist_id}", headers=auth_headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == playlist_name
        print("Create and verify playlist: PASS")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/playlists/{playlist_id}", headers=auth_headers)
    
    def test_add_song_to_playlist(self, auth_headers):
        # Create playlist
        playlist_name = f"TEST_Playlist_{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(f"{BASE_URL}/api/playlists", json={
            "name": playlist_name
        }, headers=auth_headers)
        playlist_id = create_resp.json()["id"]
        
        # Get a song
        songs = requests.get(f"{BASE_URL}/api/songs").json()
        if len(songs) > 0:
            song_id = songs[0]["id"]
            
            # Add song
            add_resp = requests.post(
                f"{BASE_URL}/api/playlists/{playlist_id}/songs/{song_id}",
                headers=auth_headers
            )
            assert add_resp.status_code == 200
            
            # Verify
            get_resp = requests.get(f"{BASE_URL}/api/playlists/{playlist_id}", headers=auth_headers)
            assert song_id in get_resp.json()["songIds"]
            print("Add song to playlist: PASS")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/playlists/{playlist_id}", headers=auth_headers)
    
    def test_delete_playlist(self, auth_headers):
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/playlists", json={
            "name": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}"
        }, headers=auth_headers)
        playlist_id = create_resp.json()["id"]
        
        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/playlists/{playlist_id}", headers=auth_headers)
        assert del_resp.status_code == 200
        
        # Verify deleted
        get_resp = requests.get(f"{BASE_URL}/api/playlists/{playlist_id}", headers=auth_headers)
        assert get_resp.status_code == 404
        print("Delete playlist: PASS")


class TestTeams:
    """Team management tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        token = login_resp.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_my_team_unauthenticated(self):
        response = requests.get(f"{BASE_URL}/api/teams/my-team")
        assert response.status_code == 401
        print("Get team without auth: PASS (401 returned)")
    
    def test_get_my_team_free_user(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/teams/my-team", headers=auth_headers)
        # Free user may not have team
        assert response.status_code in [200, 204]
        print("Get team for free user: PASS")
    
    def test_create_team_without_team_plan(self, auth_headers):
        response = requests.post(f"{BASE_URL}/api/teams", json={
            "name": "Test Team"
        }, headers=auth_headers)
        # Should fail without TEAM plan
        assert response.status_code == 403
        assert "Team plan required" in response.json()["detail"]
        print("Create team without plan: PASS (properly rejected)")


class TestPayments:
    """Payment submission tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        token = login_resp.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_payments_unauthenticated(self):
        response = requests.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 401
        print("Get payments without auth: PASS (401 returned)")
    
    def test_get_my_payments(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/payments", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"Get my payments: PASS ({len(response.json())} payments)")
    
    def test_create_payment(self, auth_headers):
        response = requests.post(f"{BASE_URL}/api/payments", json={
            "planRequested": "STANDARD",
            "provider": "MONCASH",
            "amount": 500.0,
            "currency": "HTG",
            "billingMonth": "2025-01",
            "reference": f"TEST_REF_{uuid.uuid4().hex[:8]}"
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "PENDING"
        assert data["planRequested"] == "STANDARD"
        assert "id" in data
        print(f"Create payment: PASS (id: {data['id']})")


class TestAdminSetup:
    """Admin setup endpoint tests"""
    
    def test_setup_first_admin_invalid_token(self):
        response = requests.post(f"{BASE_URL}/api/setup/first-admin", json={
            "email": "someuser@kantik.ht",
            "setupToken": "invalid-token"
        })
        assert response.status_code == 403
        assert "Invalid setup token" in response.json()["detail"]
        print("Admin setup with invalid token: PASS (rejected)")
    
    def test_setup_first_admin_nonexistent_user(self):
        response = requests.post(f"{BASE_URL}/api/setup/first-admin", json={
            "email": "nonexistent@kantik.ht",
            "setupToken": ADMIN_SETUP_TOKEN
        })
        # Either 404 (user not found) or 400 (admin already exists)
        assert response.status_code in [400, 404]
        print(f"Admin setup for nonexistent user: PASS (status: {response.status_code})")


class TestAdminEndpoints:
    """Admin-only endpoint tests"""
    
    @pytest.fixture
    def admin_headers(self):
        # Try to get admin token - this might fail if no admin exists
        # First, try to create an admin if none exists
        setup_resp = requests.post(f"{BASE_URL}/api/setup/first-admin", json={
            "email": ADMIN_EMAIL,
            "setupToken": ADMIN_SETUP_TOKEN
        })
        
        # Try admin login (may need to register first)
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "AdminPass123!"  # Try common password
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Admin login failed - cannot test admin endpoints")
        
        token = login_resp.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def user_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        token = login_resp.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_admin_stats_without_auth(self):
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401
        print("Admin stats without auth: PASS (401 returned)")
    
    def test_admin_stats_without_admin_role(self, user_headers):
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=user_headers)
        assert response.status_code == 403
        print("Admin stats with regular user: PASS (403 returned)")
    
    def test_admin_payments_without_auth(self):
        response = requests.get(f"{BASE_URL}/api/admin/payments")
        assert response.status_code == 401
        print("Admin payments without auth: PASS (401 returned)")
    
    def test_admin_users_without_auth(self):
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401
        print("Admin users without auth: PASS (401 returned)")
    
    def test_admin_songs_without_auth(self):
        response = requests.get(f"{BASE_URL}/api/admin/songs")
        assert response.status_code == 401
        print("Admin songs without auth: PASS (401 returned)")


class TestDownloadRestrictions:
    """Download permission tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        token = login_resp.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_download_without_auth(self):
        songs = requests.get(f"{BASE_URL}/api/songs").json()
        if len(songs) > 0:
            song_id = songs[0]["id"]
            response = requests.get(f"{BASE_URL}/api/songs/{song_id}/download/CHORDS_PDF")
            assert response.status_code == 401
            print("Download without auth: PASS (401 returned)")
    
    def test_download_free_user(self, auth_headers):
        songs = requests.get(f"{BASE_URL}/api/songs").json()
        if len(songs) > 0:
            song_id = songs[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/songs/{song_id}/download/CHORDS_PDF",
                headers=auth_headers
            )
            # Free user should not be able to download
            assert response.status_code in [403, 404]  # 403 if restricted, 404 if no resource
            print(f"Download as free user: PASS (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
