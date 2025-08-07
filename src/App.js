import React, { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import DatabaseInitializer from './components/DatabaseInitializer';
import './App.css';

const convex = new ConvexReactClient(process.env.REACT_APP_CONVEX_URL);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Debug logging
  useEffect(() => {
    console.log('Auth state changed:', { isAuthenticated, currentUser });
  }, [isAuthenticated, currentUser]);

  const handleLogin = (success, user) => {
    console.log('Login attempt:', { success, user });
    setIsAuthenticated(success);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    console.log('Logout called');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const router = createBrowserRouter([
    {
      path: "/login",
      element: isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
    },
    {
      path: "/dashboard", 
      element: isAuthenticated ? <Dashboard onLogout={handleLogout} currentUser={currentUser} /> : <Navigate to="/login" replace />
    },
    {
      path: "/reports",
      element: isAuthenticated ? <Reports onLogout={handleLogout} currentUser={currentUser} /> : <Navigate to="/login" replace />
    },
    {
      path: "/",
      element: <Navigate to="/login" replace />
    }
  ], {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  });

  return (
    <ConvexProvider client={convex}>
      <div className="App">
        <DatabaseInitializer />
        <RouterProvider router={router} />
      </div>
    </ConvexProvider>
  );
}

export default App; 