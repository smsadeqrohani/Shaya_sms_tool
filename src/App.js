import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import DatabaseInitializer from './components/DatabaseInitializer';
import { useAuth } from './hooks/useAuth';
import './App.css';

const convex = new ConvexReactClient(process.env.REACT_APP_CONVEX_URL);

function AppContent() {
  const { isAuthenticated, currentUser, isLoading, logout } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const router = createBrowserRouter([
    {
      path: "/login",
      element: isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
    },
    {
      path: "/dashboard", 
      element: isAuthenticated ? <Dashboard onLogout={logout} currentUser={currentUser} /> : <Navigate to="/login" replace />
    },
    {
      path: "/reports",
      element: isAuthenticated ? <Reports onLogout={logout} currentUser={currentUser} /> : <Navigate to="/login" replace />
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
    <div className="App">
      <DatabaseInitializer />
      <RouterProvider router={router} />
    </div>
  );
}

function App() {
  return (
    <ConvexProvider client={convex}>
      <AppContent />
    </ConvexProvider>
  );
}

export default App; 