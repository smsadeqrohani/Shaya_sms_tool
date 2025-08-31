import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  const validateForm = () => {
    const newErrors = {};

    // Phone number validation (09xxxxxxxxx format - 11 digits total)
    const phoneRegex = /^09\d{9}$/;
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must be in format 09xxxxxxxxx';
    }

    // Password validation (at least 8 characters)
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(formData.phoneNumber, formData.password);
      
      if (!result.success) {
        setErrors({
          general: result.error || 'Login failed'
        });
      }
      // If successful, the useAuth hook will handle the state update and navigation
    } catch (error) {
      console.error('Login error:', error);
      setErrors({
        general: error.message || 'Login failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="login-header">
          <h1 className="login-title">Filmnet SMS Tool</h1>
          <p className="login-subtitle">Send SMS messages with ease</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="phoneNumber" className="input-label">
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className={`input-field ${errors.phoneNumber ? 'error' : ''}`}
              placeholder="09xxxxxxxxx"
              maxLength="11"
            />
            {errors.phoneNumber && (
              <span className="error-message">{errors.phoneNumber}</span>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`input-field ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
            />
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          {errors.general && (
            <div className="error-message general-error">{errors.general}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 