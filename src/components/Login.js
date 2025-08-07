import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
    
    // Demo credentials check
    const demoPhone = '09127726273';
    const demoPassword = 'doosetdaram';
    
    // Simulate API call with demo credentials
    setTimeout(() => {
      setIsLoading(false);
      if (formData.phoneNumber === demoPhone && formData.password === demoPassword) {
        onLogin(true);
      } else {
        setErrors({
          phoneNumber: 'Invalid credentials. Use demo: 09127726273 / doosetdaram'
        });
      }
    }, 1000);
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="login-header">
          <h1 className="login-title">Shaya SMS Tool</h1>
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

        <div className="login-footer">
          <p>Demo credentials: 09127726273 / doosetdaram</p>
        </div>


      </div>
    </div>
  );
};

export default Login; 