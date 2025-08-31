const SESSION_KEY = 'sms_tool_session';

export const SessionManager = {
  // Save session to localStorage
  saveSession: (user) => {
    const sessionData = {
      user,
      timestamp: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  },

  // Load session from localStorage
  loadSession: () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const now = Date.now();
        const sessionAge = now - session.timestamp;
        
        // Session expires after 24 hours
        if (sessionAge < 24 * 60 * 60 * 1000) {
          return session.user;
        } else {
          // Session expired, clear it
          SessionManager.clearSession();
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading session:', error);
      SessionManager.clearSession();
      return null;
    }
  },

  // Clear session from localStorage
  clearSession: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  // Refresh session timestamp (extends session)
  refreshSession: () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const now = Date.now();
        const sessionAge = now - session.timestamp;
        
        // Only refresh if session is not expired
        if (sessionAge < 24 * 60 * 60 * 1000) {
          session.timestamp = now;
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          return true;
        } else {
          SessionManager.clearSession();
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Error refreshing session:', error);
      SessionManager.clearSession();
      return false;
    }
  },

  // Check if session is valid
  isSessionValid: () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const now = Date.now();
        const sessionAge = now - session.timestamp;
        
        return sessionAge < 24 * 60 * 60 * 1000;
      }
      return false;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  },

  // Get session age in minutes
  getSessionAge: () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const now = Date.now();
        const sessionAge = now - session.timestamp;
        
        return Math.floor(sessionAge / (1000 * 60)); // Return age in minutes
      }
      return null;
    } catch (error) {
      console.error('Error getting session age:', error);
      return null;
    }
  }
};
