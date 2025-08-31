import { SessionManager } from './sessionManager';

export const testSessionManagement = () => {
  console.log('🧪 Testing Session Management...');
  
  // Test 1: Save and load session
  const testUser = {
    _id: 'test-user-id',
    phoneNumber: '09123456789',
    name: 'Test User'
  };
  
  console.log('1. Testing session save...');
  SessionManager.saveSession(testUser);
  
  console.log('2. Testing session load...');
  const loadedUser = SessionManager.loadSession();
  console.log('Loaded user:', loadedUser);
  
  // Test 2: Check session validity
  console.log('3. Testing session validity...');
  const isValid = SessionManager.isSessionValid();
  console.log('Session is valid:', isValid);
  
  // Test 3: Get session age
  console.log('4. Testing session age...');
  const age = SessionManager.getSessionAge();
  console.log('Session age (minutes):', age);
  
  // Test 4: Refresh session
  console.log('5. Testing session refresh...');
  const refreshResult = SessionManager.refreshSession();
  console.log('Session refresh result:', refreshResult);
  
  // Test 5: Clear session
  console.log('6. Testing session clear...');
  SessionManager.clearSession();
  const clearedUser = SessionManager.loadSession();
  console.log('After clear, user:', clearedUser);
  
  console.log('✅ Session management test completed!');
};

// Auto-run test if this file is imported directly
if (typeof window !== 'undefined') {
  // Only run in browser environment
  window.testSessionManagement = testSessionManagement;
}
