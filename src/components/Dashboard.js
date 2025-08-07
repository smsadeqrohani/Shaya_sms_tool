import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useAction } from 'convex/react';
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
      // Check if character is Persian or Arabic
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
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [logs, setLogs] = useState([]);
  const fileInputRef = useRef(null);

  // Debug logging
  console.log('Dashboard component rendered with:', { currentUser });

  // Convex mutations and actions
  const createCampaignMutation = useMutation(api.sms.createCampaign);
  const sendSMSBatchAction = useAction(api.sms.sendSMSBatch);
  const updateCampaignStatusMutation = useMutation(api.sms.updateCampaignStatus);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    console.log('File upload triggered:', file);
    
    if (!file) {
      console.log('No file selected');
      return;
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      console.log('Invalid file type:', file.type, file.name);
      alert('Please upload a CSV file');
      return;
    }

    console.log('Processing CSV file:', file.name, 'Size:', file.size, 'bytes');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: '', // Auto-detect delimiter
      complete: (results) => {
        console.log('CSV parsing completed:', results);
        
        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          // Only show error if it's not just delimiter detection warnings
          const nonEmptyErrors = results.errors.filter(error => 
            error.message !== 'Too many fields' && 
            error.message !== 'Delimiter not found' &&
            error.message !== 'Unable to auto-detect delimiting character; defaulted to \',\''
          );
          if (nonEmptyErrors.length > 0) {
            alert('Error parsing CSV file');
            return;
          }
        }

        const numbers = results.data
          .map(row => Object.values(row)[0]) // Get first column
          .filter(number => number && number.trim() !== '') // Remove empty values
          .map(number => number.toString().trim())
          .filter(number => number.length > 0) // Additional filter for empty strings
          .filter(number => !isNaN(number) && number.length >= 10); // Only valid phone numbers

        console.log('Extracted phone numbers:', numbers);
        console.log('Total numbers found:', numbers.length);
        console.log('Raw CSV data:', results.data);

        if (numbers.length === 0) {
          console.log('No valid phone numbers found in CSV');
          alert('No valid phone numbers found in CSV file. Please check the format.');
          return;
        }

        setCsvData({
          numbers,
          fileName: file.name,
          totalCount: numbers.length,
          file: file // Keep the file reference
        });

        addLog(`CSV uploaded: ${numbers.length} phone numbers loaded from ${file.name}`);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Error reading CSV file');
      }
    });
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { message, timestamp };
    console.log('Adding log entry:', logEntry);
    setLogs(prev => [...prev, logEntry]);
  };

  const sendSMSBatch = async (numbers, campaignId, batchSize = 100) => {
    console.log('Starting SMS batch sending...');
    console.log('Total numbers to send:', numbers.length);
    console.log('Batch size:', batchSize);
    console.log('Message:', message);
    console.log('Tag:', tag);

    const batches = [];
    for (let i = 0; i < numbers.length; i += batchSize) {
      batches.push(numbers.slice(i, i + batchSize));
    }

    console.log('Created batches:', batches.length);
    setProgress({ current: 0, total: batches.length });

    // Use message directly (no HTML conversion needed)
    const plainTextMessage = cleanText(message);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      console.log(`Processing batch ${i + 1}/${batches.length}:`, batch);

      try {
        const result = await sendSMSBatchAction({
          campaignId,
          batchNumber: i + 1,
          phoneNumbers: batch,
          message: plainTextMessage,
          tag
        });

        if (result.success) {
          const logMessage = `Batch ${i + 1}/${batches.length}: SMS sent successfully to ${batch.length} numbers`;
          console.log(logMessage);
          addLog(logMessage);
        } else {
          const logMessage = `Batch ${i + 1}/${batches.length}: Failed to send SMS - ${result.error}`;
          console.log(logMessage);
          addLog(logMessage);
        }
      } catch (error) {
        console.error('API error for batch', i + 1, ':', error);
        const errorMessage = `Batch ${i + 1}/${batches.length}: Error - ${error.message}`;
        console.log(errorMessage);
        addLog(errorMessage);
      }

      setProgress({ current: i + 1, total: batches.length });
      
      // Add delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        console.log('Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('All SMS batches processed');
    addLog('All SMS batches processed');
  };

  const handleSendSMS = async () => {
    console.log('Send SMS button clicked');
    console.log('CSV data:', csvData);
    console.log('Message:', message);
    console.log('Tag:', tag);

    if (!csvData || csvData.numbers.length === 0) {
      console.log('No CSV data or numbers found');
      alert('Please upload a CSV file with phone numbers');
      return;
    }

    if (!message.trim()) {
      console.log('No message entered');
      alert('Please enter a message');
      return;
    }

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
          return;
        }
      }

      // Create campaign
      const campaignId = await createCampaignMutation({
        tag: tag || 'untagged',
        message: plainTextMessage,
        totalNumbers: csvData.numbers.length,
        totalBatches,
        createdBy: currentUser._id,
        scheduledFor: scheduledTimestamp,
        phoneNumbers: isScheduled ? csvData.numbers : undefined
      });

      addLog(`Campaign created with ID: ${campaignId}`);

      if (isScheduled) {
        addLog(`Campaign scheduled for: ${new Date(scheduledTimestamp).toLocaleString('fa-IR')}`);
      } else {
        // Update campaign status to in progress for immediate sending
        await updateCampaignStatusMutation({
          campaignId,
          status: 'in_progress'
        });

        // Send SMS batches
        await sendSMSBatch(csvData.numbers, campaignId, batchSize);

        // Update campaign status to completed
        await updateCampaignStatusMutation({
          campaignId,
          status: 'completed'
        });
      }

      addLog('Campaign completed successfully');
    } catch (error) {
      console.error('Error in handleSendSMS:', error);
      addLog(`Error: ${error.message}`);
    } finally {
      console.log('SMS sending process completed');
      setIsLoading(false);
    }
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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header glass">
        <div className="header-content">
          <h1 className="dashboard-title">Shaya SMS Tool</h1>
          <div className="header-actions">
            <span className="user-info">
              {currentUser?.name || currentUser?.phoneNumber} ({currentUser?.phoneNumber})
            </span>
            <div className="nav-buttons">
              <button onClick={() => navigate('/reports')} className="btn btn-outline btn-sm">
                📊 Reports
              </button>
              <button onClick={handleLogout} className="btn btn-outline">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
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
                  <div className="upload-area">
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
                  onClick={handleSendSMS}
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 