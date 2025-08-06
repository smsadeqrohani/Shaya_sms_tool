import React, { useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (success) => {
    setIsAuthenticated(success);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const router = createBrowserRouter([
    {
      path: "/login",
      element: isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
    },
    {
      path: "/dashboard", 
      element: isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />
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
      <RouterProvider router={router} />
    </div>
  );
}

export default App; 