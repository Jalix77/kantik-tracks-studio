import requests
import sys
import json
from datetime import datetime

class KantikTracksAPITester:
    def __init__(self, base_url="https://haitian-worship.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add authorization if available
        if use_admin and self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
            
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    resp_data = response.json()
                    return success, resp_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response text: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        success1, _ = self.run_test("API Root", "GET", "", 200)
        success2, _ = self.run_test("Health Check", "GET", "health", 200)
        return success1 and success2

    def test_seed_data(self):
        """Test seeding initial data"""
        success, response = self.run_test("Seed Data", "POST", "seed", 200)
        if success:
            print(f"   Admin credentials: {response.get('adminEmail')} / {response.get('adminPassword')}")
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST", 
            "auth/login",
            200,
            data={"email": "admin@kantik.ht", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin logged in successfully, isAdmin: {response.get('user', {}).get('isAdmin')}")
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_email = f"test_user_{timestamp}@test.com"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "testpass123",
                "displayName": f"Test User {timestamp}"
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            self.created_resources.append(f"User: {test_email}")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing user"""
        # Try login with admin credentials as regular user
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data={"email": "admin@kantik.ht", "password": "admin123"}
        )
        if success and 'token' in response:
            print(f"   Login successful for: {response.get('user', {}).get('email')}")
            return True
        return False

    def test_get_me_endpoint(self):
        """Test authenticated user info endpoint"""
        if not self.admin_token:
            print("⚠️  Skipping - No admin token available")
            return False
            
        success, response = self.run_test(
            "Get Current User (/auth/me)",
            "GET",
            "auth/me",
            200,
            use_admin=True
        )
        if success:
            print(f"   User info: {response.get('email')}, Plan: {response.get('plan')}")
            return True
        return False

    def test_songs_endpoints(self):
        """Test songs-related endpoints"""
        # Get all songs
        success1, songs = self.run_test("Get All Songs", "GET", "songs", 200)
        if success1:
            print(f"   Found {len(songs)} songs")
            
        # Get featured songs
        success2, featured = self.run_test("Get Featured Songs", "GET", "songs/featured", 200)
        if success2:
            print(f"   Found {len(featured)} featured songs")
            
        # Test search and filters
        success3, _ = self.run_test("Search Songs", "GET", "songs?search=grand&language=fr", 200)
        success4, _ = self.run_test("Filter by Tier", "GET", "songs?accessTier=STANDARD", 200)
        success5, _ = self.run_test("Sort by Popular", "GET", "songs?sort=popular", 200)
        
        # Get specific song (if any songs exist)
        if success1 and songs and len(songs) > 0:
            song_id = songs[0]['id']
            success6, song_detail = self.run_test(f"Get Song Detail", "GET", f"songs/{song_id}", 200)
            if success6:
                print(f"   Song detail: {song_detail.get('title')} (#{song_detail.get('number')})")
        else:
            success6 = False
            
        return all([success1, success2, success3, success4, success5, success6])

    def test_library_endpoint(self):
        """Test user library (requires auth)"""
        if not self.token and not self.admin_token:
            print("⚠️  Skipping - No auth token available")
            return False
            
        success, library = self.run_test(
            "Get User Library",
            "GET",
            "library",
            200,
            use_admin=bool(self.admin_token)
        )
        if success:
            print(f"   Library contains {len(library)} songs")
            return True
        return False

    def test_playlists_endpoints(self):
        """Test playlist endpoints (requires auth)"""
        if not self.admin_token:
            print("⚠️  Skipping - No admin token available")
            return False
            
        # Get playlists
        success1, playlists = self.run_test("Get Playlists", "GET", "playlists", 200, use_admin=True)
        if success1:
            print(f"   Found {len(playlists)} playlists")
            
        # Create a playlist
        success2, new_playlist = self.run_test(
            "Create Playlist",
            "POST",
            "playlists",
            200,
            data={"name": "Test Playlist", "ownerType": "USER"},
            use_admin=True
        )
        
        playlist_id = None
        if success2:
            playlist_id = new_playlist.get('id')
            self.created_resources.append(f"Playlist: {playlist_id}")
            print(f"   Created playlist: {playlist_id}")
            
        return success1 and success2

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.admin_token:
            print("⚠️  Skipping - No admin token available")
            return False
            
        success, stats = self.run_test("Admin Stats", "GET", "admin/stats", 200, use_admin=True)
        if success:
            print(f"   Stats: {stats.get('totalUsers')} users, {stats.get('totalSongs')} songs")
            print(f"   Active Plans: Standard={stats.get('activeStandard')}, Team={stats.get('activeTeam')}")
            print(f"   Pending Payments: {stats.get('pendingPayments')}")
            
            # Verify required fields are present
            required_fields = ['totalUsers', 'activeStandard', 'activeTeam', 'pendingPayments', 'totalSongs']
            missing_fields = [field for field in required_fields if field not in stats]
            if missing_fields:
                print(f"   ⚠️  Missing fields in stats: {missing_fields}")
                return False
            return True
        return False

    def test_admin_songs(self):
        """Test admin songs management endpoint"""
        if not self.admin_token:
            print("⚠️  Skipping - No admin token available")
            return False
            
        success, songs = self.run_test("Admin Get All Songs", "GET", "admin/songs", 200, use_admin=True)
        if success:
            print(f"   Found {len(songs)} songs (including inactive)")
            # Verify songs have resources field
            if songs:
                first_song = songs[0]
                if 'resources' in first_song:
                    print(f"   First song has {len(first_song['resources'])} resources")
                else:
                    print("   ⚠️  Songs missing resources field")
            return True
        return False

    def test_admin_payments_detailed(self):
        """Test admin payments endpoint with status filtering"""
        if not self.admin_token:
            print("⚠️  Skipping - No admin token available")
            return False
            
        # Test all payments
        success1, all_payments = self.run_test("Admin Get All Payments", "GET", "admin/payments", 200, use_admin=True)
        
        # Test pending payments
        success2, pending = self.run_test("Admin Get Pending Payments", "GET", "admin/payments?status=PENDING", 200, use_admin=True)
        
        # Test approved payments
        success3, approved = self.run_test("Admin Get Approved Payments", "GET", "admin/payments?status=APPROVED", 200, use_admin=True)
        
        # Test rejected payments
        success4, rejected = self.run_test("Admin Get Rejected Payments", "GET", "admin/payments?status=REJECTED", 200, use_admin=True)
        
        if success1:
            print(f"   All payments: {len(all_payments)}")
        if success2:
            print(f"   Pending: {len(pending)}")
        if success3:
            print(f"   Approved: {len(approved)}")
        if success4:
            print(f"   Rejected: {len(rejected)}")
            
        return all([success1, success2, success3, success4])

    def test_admin_users_detailed(self):
        """Test admin users endpoint with detailed user info"""
        if not self.admin_token:
            print("⚠️  Skipping - No admin token available")
            return False
            
        success1, users = self.run_test("Admin Get All Users", "GET", "admin/users", 200, use_admin=True)
        if success1:
            print(f"   Found {len(users)} users")
            
            # Test getting specific user details if users exist
            admin_user = None
            for user in users:
                if user.get('isAdmin') or user.get('role') == 'ADMIN':
                    admin_user = user
                    break
                    
            if admin_user:
                user_id = admin_user['id']
                success2, user_detail = self.run_test(
                    f"Admin Get User Detail", 
                    "GET", 
                    f"admin/users/{user_id}", 
                    200, 
                    use_admin=True
                )
                if success2:
                    print(f"   User detail for {user_detail.get('displayName')}: plan={user_detail.get('plan')}")
                    return True
                    
        return success1

    def test_admin_user_actions(self):
        """Test admin user management actions"""
        if not self.admin_token:
            print("⚠️  Skipping - No admin token available")
            return False
            
        # First get list of users to find a non-admin user
        success1, users = self.run_test("Get Users for Actions Test", "GET", "admin/users", 200, use_admin=True)
        if not success1:
            return False
            
        # Find a regular user (non-admin)
        regular_user = None
        for user in users:
            if not user.get('isAdmin') and user.get('role') != 'ADMIN':
                regular_user = user
                break
                
        if not regular_user:
            print("   ⚠️  No regular users found to test admin actions")
            return True  # Not a failure, just no test subjects
            
        user_id = regular_user['id']
        print(f"   Testing admin actions on user: {regular_user.get('displayName')}")
        
        # Test promote to admin
        success2, _ = self.run_test(
            "Promote User to Admin",
            "POST",
            f"admin/users/{user_id}/promote-admin",
            200,
            use_admin=True
        )
        
        if success2:
            # Test demote from admin
            success3, _ = self.run_test(
                "Demote User from Admin",
                "POST", 
                f"admin/users/{user_id}/demote-admin",
                200,
                use_admin=True
            )
            
            if success3:
                print(f"   ✅ Promote/Demote cycle successful")
                return True
                
        return False

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        # Save current tokens
        old_token = self.token
        old_admin_token = self.admin_token
        
        # Clear tokens
        self.token = None
        self.admin_token = None
        
        success1, _ = self.run_test("Unauthorized Library Access", "GET", "library", 401)
        success2, _ = self.run_test("Unauthorized Admin Stats", "GET", "admin/stats", 401)
        
        # Restore tokens
        self.token = old_token
        self.admin_token = old_admin_token
        
        return success1 and success2

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("=" * 60)
        print("🚀 KANTIK TRACKS API TESTING")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ Basic health checks failed - stopping tests")
            return False
            
        # Seed initial data
        self.test_seed_data()
        
        # Authentication tests
        admin_auth_ok = self.test_admin_login()
        user_reg_ok = self.test_user_registration()
        user_login_ok = self.test_user_login()
        
        if admin_auth_ok:
            self.test_get_me_endpoint()
        
        # Core functionality
        self.test_songs_endpoints()
        self.test_library_endpoint()
        self.test_playlists_endpoints()
        
        # Admin endpoints
        if admin_auth_ok:
            self.test_admin_stats()
            self.test_admin_songs()
            self.test_admin_payments_detailed()
            self.test_admin_users_detailed()
            self.test_admin_user_actions()
            
        # Security tests
        self.test_unauthorized_access()
        
        # Results summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.created_resources:
            print(f"\n📝 Created resources: {len(self.created_resources)}")
            for resource in self.created_resources:
                print(f"   - {resource}")
        
        success_rate = self.tests_passed / self.tests_run if self.tests_run > 0 else 0
        return success_rate >= 0.8  # 80% success rate threshold

def main():
    tester = KantikTracksAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())