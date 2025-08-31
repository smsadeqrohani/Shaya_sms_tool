import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { SessionManager } from '../utils/sessionManager';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = useMutation(api.auth.login);
  
  // Validate session with server if we have a user
  const validateSessionQuery = useQuery(
    api.auth.validateSession,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const user = SessionManager.loadSession();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error loading session:', error);
        SessionManager.clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Handle server-side session validation
  useEffect(() => {
    if (currentUser && validateSessionQuery === null) {
      // User doesn't exist on server anymore, logout
      console.log('User no longer exists on server, logging out');
      logout();
    } else if (currentUser && validateSessionQuery) {
      // User is valid, update with latest data from server
      setCurrentUser(validateSessionQuery);
      // Refresh session timestamp
      SessionManager.refreshSession();
    }
  }, [validateSessionQuery, currentUser]);

  // Auto-refresh session every 30 minutes when user is active
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      if (SessionManager.isSessionValid()) {
        SessionManager.refreshSession();
      } else {
        logout();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);

  const login = async (phoneNumber, password) => {
    try {
      const user = await loginMutation({
        phoneNumber,
        password
      });

      // Store session using SessionManager
      SessionManager.saveSession(user);

      setCurrentUser(user);
      setIsAuthenticated(true);
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    // Clear session using SessionManager
    SessionManager.clearSession();
    
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const checkSession = () => {
    return SessionManager.loadSession();
  };

  return {
    isAuthenticated,
    currentUser,
    isLoading,
    login,
    logout,
    checkSession
  };
};
