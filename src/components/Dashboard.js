import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import Papa from 'papaparse';
import PersianDatePicker from './PersianDatePicker';
import './Dashboard.css';

// Utility function to clean text (no longer needed for HTML conversion)
const cleanText = (text) => {
  if (!text) return '';
  return text.trim();
};

// Function to calculate SMS count for Persian characters and emojis
const calculateSMSCount = (text) => {
  if (!text) return 0;
  
  let totalChars = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Check if character is an emoji (surrogate pair or emoji)
    if (char.codePointAt(0) > 0xFFFF || 
        (char.codePointAt(0) >= 0x1F600 && char.codePointAt(0) <= 0x1F64F) || // Emoticons
        (char.codePointAt(0) >= 0x1F300 && char.codePointAt(0) <= 0x1F5FF) || // Misc Symbols and Pictographs
        (char.codePointAt(0) >= 0x1F680 && char.codePointAt(0) <= 0x1F6FF) || // Transport and Map
        (char.codePointAt(0) >= 0x1F1E0 && char.codePointAt(0) <= 0x1F1FF) || // Regional Indicator
        (char.codePointAt(0) >= 0x2600 && char.codePointAt(0) <= 0x26FF) ||   // Misc Symbols
        (char.codePointAt(0) >= 0x2700 && char.codePointAt(0) <= 0x27BF)) {    // Dingbats
      totalChars += 10; // Emoji = 10 characters
    } else if (char === ' ') {
      totalChars += 1; // Space = 1 character
    } else {
      // Check if character is Persian or Arabict 
      const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
      if (persianRegex.test(char)) {
        totalChars += 1; // Persian/Arabic character = 1 character (70 chars per SMS)
      } else {
        totalChars += 1; // Other characters = 1 character
      }
    }
  }
  
  // Calculate SMS count: 70 characters per SMS for Persian text
  return Math.ceil(totalChars / 70);
};

const Dashboard = ({ onLogout, currentUser }) => {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState(null);
  const [message, setMessage] = useState('');
  const [tag, setTag] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  // Removed unused state variables

  const [logs, setLogs] = useState([]);
  const fileInputRef = useRef(null);

  // User management state
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    phoneNumber: '',
    password: '',
    name: ''
  });
  const [userErrors, setUserErrors] = useState({});

  // Debug logging
  console.log('Dashboard component rendered with:', { currentUser });

  // Convex mutations and actions
  const createCampaignWithSegments = useMutation(api.sms.createCampaignWithSegments);
  const addSegmentToCampaign = useMutation(api.sms.addSegmentToCampaign);
  const startCampaignJob = useAction(api.sms.startCampaignJob);

  // User management queries and mutations
  const allUsers = useQuery(api.auth.getAllUsers);
  const createUserMutation = useMutation(api.auth.createUser);
  const deleteUserMutation = useMutation(api.auth.deleteUser);

    const handleFileUpload = (event) => {
    const file = event.target.files[0];
    console.log('File upload triggered:', file);
    addLog(`File input triggered: ${file ? file.name : 'No file'}`);
    
    if (!file) {
      console.log('No file selected');
      addLog('No file selected');
      return;
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      console.log('Invalid file type:', file.type, file.name);
      addLog(`Invalid file type: ${file.type}, name: ${file.name}`);
      alert('Please upload a CSV file');
      return;
    }

    console.log('Processing CSV file:', file.name, 'Size:', file.size, 'bytes');
    addLog(`Starting to process CSV file: ${file.name} (${file.size} bytes)`);

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: '', // Auto-detect delimiter
        complete: (results) => {
          console.log('CSV parsing completed:', results);
          addLog(`CSV parsing completed for ${file.name}`);
          
          if (results && results.errors && results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            addLog(`CSV parsing errors found: ${results.errors.length} errors`);
            // Only show error if it's not just delimiter detection warnings
            const nonEmptyErrors = results.errors.filter(error => 
              error.message !== 'Too many fields' && 
              error.message !== 'Delimiter not found' &&
              error.message !== 'Unable to auto-detect delimiting character; defaulted to \',\''
            );
            if (nonEmptyErrors.length > 0) {
              alert('Error parsing CSV file');
              addLog('CSV parsing failed due to errors');
              return;
            }
          }

          if (!results || !results.data) {
            console.error('No data received from CSV parsing');
            addLog('No data received from CSV file');
            alert('Error: No data received from CSV file');
            return;
          }

          console.log('Raw CSV data:', results.data);
          const columnCount = results.data.length > 0 ? Object.keys(results.data[0]).length : 0;
          addLog(`Raw CSV data received: ${results.data.length} rows with ${columnCount} columns`);

          // Extract all numbers from all columns, including the first row
          const allNumbers = [];
          
          // Include the first row (header) as well
          results.data.forEach((row, index) => {
            // Get all values from the row
            const rowValues = Object.values(row);
            rowValues.forEach((value, colIndex) => {
              if (value && value.toString().trim() !== '') {
                const cleanValue = value.toString().trim();
                
                // Remove common formatting characters
                const cleanedNumber = cleanValue.replace(/[\s\-().+]/g, '');
                
                // Check if it's a valid phone number (at least 9 digits, max 15)
                if (!isNaN(cleanedNumber) && cleanedNumber.length >= 9 && cleanedNumber.length <= 15) {
                  allNumbers.push(cleanedNumber);
                }
              }
            });
          });

          const numbers = allNumbers;

          console.log('Extracted phone numbers:', numbers);
          console.log('Total numbers found:', numbers.length);
          addLog(`Extracted ${numbers.length} valid phone numbers`);

          if (numbers.length === 0) {
            console.log('No valid phone numbers found in CSV');
            addLog('No valid phone numbers found in CSV file');
            alert('No valid phone numbers found in CSV file. Please check the format.');
            return;
          }

          setCsvData({
            numbers,
            fileName: file.name,
            totalCount: numbers.length,
            file: file // Keep the file reference
          });

          addLog(`✅ CSV uploaded successfully: ${numbers.length} phone numbers loaded from ${file.name}`);
          console.log('CSV data set:', { numbers, fileName: file.name, totalCount: numbers.length });
          
          // Clear the file input for next upload
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          addLog(`❌ CSV parsing error: ${error.message}`);
          alert('Error reading CSV file');
        }
      });
    } catch (error) {
      console.error('Error during CSV parsing:', error);
      addLog(`❌ Error during CSV parsing: ${error.message}`);
      alert('Error processing CSV file: ' + error.message);
    }
  };

  // Auto-scroll logs to bottom when logs change
  useEffect(() => {
    const logsContainer = document.querySelector('.logs-container');
    if (logsContainer) {
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }
  }, [logs]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { message, timestamp };
    console.log('Adding log entry:', logEntry);
    setLogs(prev => [...prev, logEntry]);
  };

  // Removed unused function

  const handleSendSMS = async () => {
    console.log('Send SMS button clicked');
    console.log('CSV data:', csvData);
    console.log('Message:', message);
    console.log('Tag:', tag);

    addLog('🚀 Starting SMS campaign...');

    if (!csvData || csvData.numbers.length === 0) {
      console.log('No CSV data or numbers found');
      addLog('❌ No CSV data or numbers found');
      alert('Please upload a CSV file with phone numbers');
      return;
    }

    if (!message.trim()) {
      console.log('No message entered');
      addLog('❌ No message entered');
      alert('Please enter a message');
      return;
    }

    // Close modal if open and start sending
    setShowConfirmModal(false);
    console.log('Starting SMS sending process...');
    setIsLoading(true);
    
    try {
      // Calculate batch information
      const batchSize = 100;
      const totalBatches = Math.ceil(csvData.numbers.length / batchSize);

      // Use message directly (no HTML conversion needed)
      const plainTextMessage = cleanText(message);
      
      // Check if this is a scheduled campaign
      const isScheduled = scheduledDateTime !== null;
      let scheduledTimestamp = undefined;
      
      if (isScheduled) {
        scheduledTimestamp = scheduledDateTime.getTime();
        if (scheduledTimestamp <= Date.now()) {
          alert('Scheduled time must be in the future');
          setIsLoading(false);
          return;
        }
      }

      addLog(`📊 Campaign details: ${csvData.numbers.length} numbers, ${totalBatches} batches`);

      // Check if we need to handle large datasets
      const maxNumbersPerRequest = 8000; // Safe limit for Convex
      let campaignId; // Declare campaignId at function scope
      
      if (csvData.numbers.length > maxNumbersPerRequest) {
        addLog(`⚠️ Large dataset detected (${csvData.numbers.length} numbers). Processing in chunks...`);
        
        // Create campaign without numbers first
        campaignId = await createCampaignWithSegments({
          name: tag || 'Campaign',
          tag: tag || 'untagged',
          message: plainTextMessage,
          numbers: [], // Empty array for large campaigns
          createdBy: currentUser._id,
          scheduledFor: scheduledTimestamp,
        });

        addLog(`✅ Campaign created with ID: ${campaignId}`);

        // Now add segments in chunks
        const chunkSize = 100; // 100 numbers per segment
        for (let i = 0; i < csvData.numbers.length; i += chunkSize) {
          const chunk = csvData.numbers.slice(i, i + chunkSize);
          const batchNumber = Math.floor(i / chunkSize) + 1;
          
          addLog(`📦 Adding batch ${batchNumber}/${totalBatches} (${chunk.length} numbers)...`);
          
          // Add segment to campaign
          await addSegmentToCampaign({
            campaignId,
            batchNumber,
            numbers: chunk,
            scheduledFor: scheduledTimestamp,
          });
        }

        addLog(`✅ All ${totalBatches} batches added successfully`);
      } else {
        // For smaller datasets, use the original approach
        campaignId = await createCampaignWithSegments({
          name: tag || 'Campaign',
          tag: tag || 'untagged',
          message: plainTextMessage,
          numbers: csvData.numbers,
          createdBy: currentUser._id,
          scheduledFor: scheduledTimestamp,
        });

        addLog(`✅ Campaign created with ID: ${campaignId}`);
      }

      if (isScheduled) {
        addLog(`⏰ Campaign scheduled for: ${new Date(scheduledTimestamp).toLocaleString('fa-IR')}`);
      } else {
        // Start server-side job to send all segments
        addLog('🔄 Starting server-side job to send all segments...');
        await startCampaignJob({ campaignId });
        addLog('✅ Server-side job started successfully');
      }

      addLog('🎉 Campaign setup completed successfully');
    } catch (error) {
      console.error('Error in handleSendSMS:', error);
      addLog(`❌ Error: ${error.message}`);
    } finally {
      console.log('SMS sending process completed');
      setIsLoading(false);
      addLog('🏁 SMS sending process completed');
    }
  };

  const openConfirmModal = () => {
    if (!csvData || !message.trim()) return;
    setShowConfirmModal(true);
  };

  const handleLogout = () => {
    onLogout();
  };

  const clearData = () => {
    setCsvData(null);
    setMessage('');
    setTag('');
    setScheduledDateTime(null);
    setProgress({ current: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    const phoneRegex = /^09\d{9}$/;
    
    if (!newUserData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!phoneRegex.test(newUserData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must be in format 09xxxxxxxxx';
    }

    if (!newUserData.password) {
      newErrors.password = 'Password is required';
    } else if (newUserData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!newUserData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setUserErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      await createUserMutation({
        phoneNumber: newUserData.phoneNumber,
        password: newUserData.password,
        name: newUserData.name
      });
      
      setNewUserData({ phoneNumber: '', password: '', name: '' });
      setShowCreateUser(false);
      setUserErrors({});
    } catch (error) {
      setUserErrors({ general: error.message });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUserMutation({ userId });
      } catch (error) {
        alert('Error deleting user: ' + error.message);
      }
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header glass">
        <div className="header-content">
          <h1 className="dashboard-title">Filmnet SMS Tool</h1>
          <div className="header-actions">
            <span className="user-info">
              {currentUser?.name || currentUser?.phoneNumber} ({currentUser?.phoneNumber})
            </span>
            <div className="nav-buttons">
              <button onClick={() => setShowUserManagement(!showUserManagement)} className="btn btn-outline btn-sm">
                👥 Users
              </button>
              <button onClick={() => navigate('/reports')} className="btn btn-outline btn-sm">
                📊 Reports
              </button>
              <button onClick={() => navigate('/guide')} className="btn btn-outline btn-sm">
                📚 Guide
              </button>
              <button onClick={handleLogout} className="btn btn-outline">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {showUserManagement ? (
          // User Management Section
          <div className="user-management-section">
            <div className="section-header">
              <h2>👥 User Management</h2>
              <button 
                onClick={() => setShowUserManagement(false)} 
                className="btn btn-outline btn-sm"
              >
                ← Back to Dashboard
              </button>
            </div>

            <div className="user-management-content">
              <div className="user-actions">
                <button 
                  onClick={() => setShowCreateUser(true)} 
                  className="btn btn-primary"
                >
                  ➕ Create New User
                </button>
              </div>

              {showCreateUser && (
                <div className="create-user-modal">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>Create New User</h3>
                      <button 
                        onClick={() => {
                          setShowCreateUser(false);
                          setNewUserData({ phoneNumber: '', password: '', name: '' });
                          setUserErrors({});
                        }} 
                        className="modal-close"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <form onSubmit={handleCreateUser} className="create-user-form">
                      <div className="input-group">
                        <label htmlFor="newUserName" className="input-label">Full Name</label>
                        <input
                          type="text"
                          id="newUserName"
                          value={newUserData.name}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                          className={`input-field ${userErrors.name ? 'error' : ''}`}
                          placeholder="Enter full name"
                        />
                        {userErrors.name && <span className="error-message">{userErrors.name}</span>}
                      </div>

                      <div className="input-group">
                        <label htmlFor="newUserPhone" className="input-label">Phone Number</label>
                        <input
                          type="tel"
                          id="newUserPhone"
                          value={newUserData.phoneNumber}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          className={`input-field ${userErrors.phoneNumber ? 'error' : ''}`}
                          placeholder="09xxxxxxxxx"
                          maxLength="11"
                        />
                        {userErrors.phoneNumber && <span className="error-message">{userErrors.phoneNumber}</span>}
                      </div>

                      <div className="input-group">
                        <label htmlFor="newUserPassword" className="input-label">Password</label>
                        <input
                          type="password"
                          id="newUserPassword"
                          value={newUserData.password}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                          className={`input-field ${userErrors.password ? 'error' : ''}`}
                          placeholder="Enter password (min 8 characters)"
                        />
                        {userErrors.password && <span className="error-message">{userErrors.password}</span>}
                      </div>

                      {userErrors.general && (
                        <div className="error-message general-error">{userErrors.general}</div>
                      )}

                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                          Create User
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowCreateUser(false);
                            setNewUserData({ phoneNumber: '', password: '', name: '' });
                            setUserErrors({});
                          }} 
                          className="btn btn-outline"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="users-list">
                <h3>All Users ({allUsers?.length || 0})</h3>
                {allUsers && allUsers.length > 0 ? (
                  <div className="users-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone Number</th>
                          <th>Created</th>
                          <th>Last Login</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((user) => (
                          <tr key={user._id}>
                            <td>{user.name || 'N/A'}</td>
                            <td>{user.phoneNumber}</td>
                            <td>{formatDate(user.createdAt)}</td>
                            <td>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
                            <td>
                              {user._id !== currentUser._id && (
                                <button 
                                  onClick={() => handleDeleteUser(user._id)}
                                  className="btn btn-outline btn-sm delete-btn"
                                  title="Delete User"
                                >
                                  🗑️ Delete
                                </button>
                              )}
                              {user._id === currentUser._id && (
                                <span className="current-user-badge">Current User</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-users">
                    <p>No users found. Create the first user above.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Main Dashboard Content
          <div className="dashboard-layout">
            {/* Logs Lane */}
            <div className="logs-lane">
              <div className="card glass logs-section">
                <div className="logs-header">
                  <h2 className="card-title">📋 Activity Logs</h2>
                  <button onClick={clearLogs} className="btn btn-outline btn-sm">
                    Clear Logs
                  </button>
                </div>
                
                <div className="logs-container">
                  {logs.length === 0 ? (
                    <p className="no-logs">No activity yet. Upload a file and send SMS to see logs.</p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="log-entry">
                        <span className="log-time">{log.timestamp}</span>
                        <span className="log-message">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Form Lane */}
            <div className="form-lane">
              {/* Upload Section */}
              <div className="card glass">
                <h2 className="card-title">📁 Upload CSV File</h2>
                <div className="upload-section">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="file-input"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="file-input-label">
                    <div className="upload-area" onClick={() => addLog('Upload area clicked')}>
                      {csvData ? (
                        <>
                          <span className="upload-icon">✅</span>
                          <span>File uploaded: {csvData.fileName}</span>
                          <small>{csvData.totalCount} phone numbers loaded</small>
                        </>
                      ) : (
                        <>
                          <span className="upload-icon">📄</span>
                          <span>Choose CSV file</span>
                          <small>First column should contain phone numbers</small>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Tag Input */}
              <div className="card glass">
                <h2 className="card-title">🏷️ Tag</h2>
                <div className="input-group">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="input-field tag-input"
                    placeholder="Enter a tag for this campaign"
                  />
                </div>
              </div>

              {/* Message Editor */}
              <div className="card glass">
                <h2 className="card-title">💬 Message Content</h2>
                <div className="editor-container">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="پیام خود را اینجا بنویسید..."
                    className="message-textarea"
                    dir="rtl"
                    rows={6}
                  />
                  <div className="message-info">
                    <span className="char-count">
                      Characters: {message.length}
                    </span>
                    <span className="sms-count">
                      SMS Count: {calculateSMSCount(message)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule Picker */}
              <div className="card glass">
                <h2 className="card-title">📅 Schedule SMS</h2>
                <div className="schedule-container">
                  <div className="schedule-options">
                    <div className="schedule-option">
                      <label className="schedule-label">
                        <input
                          type="radio"
                          name="scheduleType"
                          value="now"
                          defaultChecked
                          onChange={() => setScheduledDateTime(null)}
                        />
                        <span>Send Now</span>
                      </label>
                    </div>
                    <div className="schedule-option">
                      <label className="schedule-label">
                        <input
                          type="radio"
                          name="scheduleType"
                          value="later"
                          onChange={() => {
                            // Set default to current date and time
                            const now = new Date();
                            setScheduledDateTime(now);
                          }}
                        />
                        <span>Schedule for Later</span>
                      </label>
                    </div>
                  </div>
                  
                  {scheduledDateTime && (
                    <div className="schedule-inputs">
                      <div className="input-group">
                        <label className="input-label">انتخاب تاریخ و زمان:</label>
                        <PersianDatePicker
                          value={scheduledDateTime}
                          onChange={setScheduledDateTime}
                          placeholder="انتخاب تاریخ و زمان"
                        />
                      </div>
                      <div className="schedule-preview">
                        Scheduled for: {scheduledDateTime.toLocaleString('fa-IR')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="card glass">
                <h2 className="card-title">🚀 Actions</h2>
                <div className="action-buttons">
                  <button
                    onClick={openConfirmModal}
                    disabled={isLoading || !csvData || !message.trim()}
                    className="btn btn-primary send-btn"
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner"></div>
                        Sending...
                      </>
                    ) : (
                      'Send SMS'
                    )}
                  </button>
                  
                  <button
                    onClick={clearData}
                    className="btn btn-outline clear-btn"
                  >
                    Clear Data
                  </button>
                </div>
                
                {isLoading && progress.total > 0 && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                    <span className="progress-text">
                      {progress.current} / {progress.total} batches
                    </span>
                  </div>
                )}
              </div>
              {showConfirmModal && (
                <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>Confirm SMS Campaign</h3>
                      <button className="modal-close" onClick={() => setShowConfirmModal(false)}>✕</button>
                    </div>
                    <div className="modal-body">
                      <div className="detail-section">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Numbers:</span>
                            <span className="detail-value">{csvData?.numbers?.length || 0}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Tag:</span>
                            <span className="detail-value">{tag || 'untagged'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Time to Send:</span>
                            <span className="detail-value">{scheduledDateTime ? scheduledDateTime.toLocaleString('fa-IR') : 'Send Now'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="detail-section">
                        <h4>Message</h4>
                        <div className="message-content">
                          <pre className="message-text" dir="rtl">{message}</pre>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn btn-outline" onClick={() => setShowConfirmModal(false)}>Cancel</button>
                      <button className="btn btn-primary" onClick={handleSendSMS}>Confirm Send</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard; 