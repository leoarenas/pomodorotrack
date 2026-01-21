#!/usr/bin/env python3
"""
PomodoroTrack Backend API Testing Suite
Tests all API endpoints with comprehensive coverage
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class PomodoroTrackAPITester:
    def __init__(self, base_url="https://prodtimer-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.company_data = None
        self.test_project_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, data = self.make_request('GET', '')
        self.log_test("Root endpoint", success, 
                     "" if success else f"Failed: {data}")
        
        # Test health endpoint
        success, data = self.make_request('GET', 'health')
        self.log_test("Health endpoint", success,
                     "" if success else f"Failed: {data}")

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        # Generate unique test data
        timestamp = datetime.now().strftime("%H%M%S")
        test_email = f"testuser{timestamp}@pomodorotrack.com"
        
        registration_data = {
            "email": test_email,
            "password": "Test123!",
            "displayName": "Usuario Prueba Test",
            "companyName": "Empresa Test SAS"
        }
        
        success, data = self.make_request('POST', 'auth/register', registration_data, 200)
        
        if success and 'token' in data:
            self.token = data['token']
            self.user_data = data.get('user')
            self.company_data = data.get('company')
            self.log_test("User registration with company", True, 
                         f"User: {self.user_data.get('displayName')}, Company: {self.company_data.get('name') if self.company_data else 'None'}")
        else:
            self.log_test("User registration with company", False, 
                         f"Registration failed: {data}")

    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n🔍 Testing User Login...")
        
        if not self.user_data:
            self.log_test("User login", False, "No user data from registration")
            return
        
        login_data = {
            "email": self.user_data['email'],
            "password": "Test123!"
        }
        
        success, data = self.make_request('POST', 'auth/login', login_data, 200)
        
        if success and 'token' in data:
            # Update token with new login token
            self.token = data['token']
            self.log_test("User login", True, f"Login successful for {data['user']['email']}")
        else:
            self.log_test("User login", False, f"Login failed: {data}")

    def test_auth_me(self):
        """Test get current user info"""
        print("\n🔍 Testing Auth Me Endpoint...")
        
        if not self.token:
            self.log_test("Get current user", False, "No auth token available")
            return
        
        success, data = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success and 'user' in data:
            self.log_test("Get current user", True, f"User: {data['user']['displayName']}")
        else:
            self.log_test("Get current user", False, f"Failed: {data}")

    def test_project_operations(self):
        """Test project CRUD operations"""
        print("\n🔍 Testing Project Operations...")
        
        if not self.token:
            self.log_test("Project operations", False, "No auth token available")
            return
        
        # Create project
        project_data = {
            "name": "Proyecto Test API",
            "description": "Proyecto creado durante testing automatizado",
            "color": "#E91E63"
        }
        
        success, data = self.make_request('POST', 'projects', project_data, 200)
        
        if success and 'projectId' in data:
            self.test_project_id = data['projectId']
            self.log_test("Create project", True, f"Project created: {data['name']}")
        else:
            self.log_test("Create project", False, f"Failed: {data}")
            return
        
        # Get all projects
        success, data = self.make_request('GET', 'projects', expected_status=200)
        
        if success and isinstance(data, list):
            project_found = any(p.get('projectId') == self.test_project_id for p in data)
            self.log_test("Get all projects", project_found, 
                         f"Found {len(data)} projects, test project {'found' if project_found else 'not found'}")
        else:
            self.log_test("Get all projects", False, f"Failed: {data}")
        
        # Update project
        update_data = {
            "name": "Proyecto Test API Actualizado",
            "description": "Descripción actualizada",
            "color": "#9C27B0"
        }
        
        success, data = self.make_request('PUT', f'projects/{self.test_project_id}', update_data, 200)
        
        if success and data.get('name') == update_data['name']:
            self.log_test("Update project", True, f"Project updated: {data['name']}")
        else:
            self.log_test("Update project", False, f"Failed: {data}")

    def test_time_entry_operations(self):
        """Test time entry operations"""
        print("\n🔍 Testing Time Entry Operations...")
        
        if not self.token or not self.test_project_id:
            self.log_test("Time entry operations", False, "No auth token or project ID available")
            return
        
        # Create time entry (pomodoro)
        time_entry_data = {
            "projectId": self.test_project_id,
            "duration": 1500,  # 25 minutes
            "type": "pomodoro",
            "notes": "Test pomodoro session"
        }
        
        success, data = self.make_request('POST', 'time-entries', time_entry_data, 200)
        
        if success and 'entryId' in data:
            self.log_test("Create time entry", True, f"Pomodoro entry created: {data['duration']}s")
        else:
            self.log_test("Create time entry", False, f"Failed: {data}")
        
        # Get time entries
        success, data = self.make_request('GET', 'time-entries', expected_status=200)
        
        if success and isinstance(data, list):
            self.log_test("Get time entries", True, f"Found {len(data)} time entries")
        else:
            self.log_test("Get time entries", False, f"Failed: {data}")

    def test_stats_endpoints(self):
        """Test statistics endpoints"""
        print("\n🔍 Testing Statistics Endpoints...")
        
        if not self.token:
            self.log_test("Stats endpoints", False, "No auth token available")
            return
        
        # Test today stats
        success, data = self.make_request('GET', 'stats/today', expected_status=200)
        
        if success and 'date' in data:
            self.log_test("Today stats", True, 
                         f"Pomodoros: {data.get('pomodorosCompleted', 0)}, Work time: {data.get('totalWorkTime', 0)}s")
        else:
            self.log_test("Today stats", False, f"Failed: {data}")
        
        # Test week stats
        success, data = self.make_request('GET', 'stats/week', expected_status=200)
        
        if success and 'weekStart' in data:
            self.log_test("Week stats", True, 
                         f"Total pomodoros: {data.get('totalPomodoros', 0)}, Total time: {data.get('totalTime', 0)}s")
        else:
            self.log_test("Week stats", False, f"Failed: {data}")
        
        # Test project stats
        success, data = self.make_request('GET', 'stats/by-project', expected_status=200)
        
        if success and isinstance(data, list):
            self.log_test("Project stats", True, f"Found stats for {len(data)} projects")
        else:
            self.log_test("Project stats", False, f"Failed: {data}")

    def test_company_operations(self):
        """Test company operations"""
        print("\n🔍 Testing Company Operations...")
        
        if not self.token:
            self.log_test("Company operations", False, "No auth token available")
            return
        
        # Get current company
        success, data = self.make_request('GET', 'companies/current', expected_status=200)
        
        if success and 'companyId' in data:
            self.log_test("Get current company", True, f"Company: {data['name']}")
        else:
            self.log_test("Get current company", False, f"Failed: {data}")

    def test_logout(self):
        """Test user logout"""
        print("\n🔍 Testing User Logout...")
        
        if not self.token:
            self.log_test("User logout", False, "No auth token available")
            return
        
        success, data = self.make_request('POST', 'auth/logout', expected_status=200)
        
        if success:
            self.log_test("User logout", True, "Logout successful")
            self.token = None  # Clear token
        else:
            self.log_test("User logout", False, f"Failed: {data}")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        if self.test_project_id and self.token:
            success, data = self.make_request('DELETE', f'projects/{self.test_project_id}', expected_status=200)
            if success:
                print(f"✅ Test project deleted: {self.test_project_id}")
            else:
                print(f"⚠️ Failed to delete test project: {data}")

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting PomodoroTrack Backend API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        try:
            # Test sequence
            self.test_health_endpoints()
            self.test_user_registration()
            self.test_user_login()
            self.test_auth_me()
            self.test_company_operations()
            self.test_project_operations()
            self.test_time_entry_operations()
            self.test_stats_endpoints()
            self.test_logout()
            
            # Cleanup
            self.cleanup_test_data()
            
        except Exception as e:
            print(f"\n💥 Unexpected error during testing: {str(e)}")
            self.log_test("Test suite execution", False, f"Exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            return 1

def main():
    """Main test execution"""
    tester = PomodoroTrackAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())