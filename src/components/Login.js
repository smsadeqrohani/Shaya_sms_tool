import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    password: '',
    name: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = useMutation(api.auth.login);
  const signUpMutation = useMutation(api.auth.signUp);

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

    // Name validation for sign up
    if (isSignUp && !formData.name.trim()) {
      newErrors.name = 'Name is required';
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
      let user;
      
      if (isSignUp) {
        user = await signUpMutation({
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          name: formData.name
        });
      } else {
        user = await loginMutation({
          phoneNumber: formData.phoneNumber,
          password: formData.password
        });
      }
      
      onLogin(true, user);
    } catch (error) {
      console.error(isSignUp ? 'Sign up error:' : 'Login error:', error);
      setErrors({
        general: error.message || (isSignUp ? 'Sign up failed' : 'Login failed')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({
      phoneNumber: '',
      password: '',
      name: ''
    });
    setErrors({});
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="login-header">
          <h1 className="login-title">Shaya SMS Tool</h1>
          <p className="login-subtitle">Send SMS messages with ease</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <div className="input-group">
              <label htmlFor="name" className="input-label">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`input-field ${errors.name ? 'error' : ''}`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <span className="error-message">{errors.name}</span>
              )}
            </div>
          )}

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
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="btn btn-link toggle-btn"
            onClick={toggleMode}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login; 