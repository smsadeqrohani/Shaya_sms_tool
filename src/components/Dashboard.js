import React, { useState, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Papa from 'papaparse';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
  const [csvData, setCsvData] = useState(null);
  const [message, setMessage] = useState('');
  const [tag, setTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [logs, setLogs] = useState([]);
  const fileInputRef = useRef(null);

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

  const sendSMSBatch = async (numbers, batchSize = 100) => {
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

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumbers = batch.join(',');
      
      console.log(`Processing batch ${i + 1}/${batches.length}:`, batch);
      console.log('Batch numbers string:', batchNumbers);

      try {
        // Strip HTML tags and handle newlines for SMS
        const plainTextMessage = message
          .replace(/<\/p>/g, '\n')           // Convert </p> to newline
          .replace(/<br\s*\/?>/g, '\n')      // Convert <br> to newline
          .replace(/<[^>]*>/g, '')           // Remove all HTML tags
          .replace(/&nbsp;/g, ' ')           // Replace &nbsp; with space
          .replace(/&amp;/g, '&')            // Replace &amp; with &
          .replace(/&lt;/g, '<')             // Replace &lt; with <
          .replace(/&gt;/g, '>')             // Replace &gt; with >
          .replace(/&quot;/g, '"')           // Replace &quot; with "
          .replace(/&#39;/g, "'")            // Replace &#39; with '
          .replace(/\n\s*\n/g, '\n')         // Remove empty lines
          .trim();
        
        const payload = {
          SourceNumber: "981000007711",
          DestinationNumbers: batch,
          Message: plainTextMessage,
          UserTag: tag
        };
        
        console.log('API payload:', payload);
        console.log('Making API request to:', 'https://api.okitsms.com/api/v1/sms/send/1tn');

        const response = await axios.post('https://api.okitsms.com/api/v1/sms/send/1tn', payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': 'CV@%OR!pM4p!jGp5j&kBFBYmAtEh#%Sr'
          }
        });

        console.log('API response:', response.data);
        
        if (response.data) {
          const httpStatusCode = response.status;
          const apiStatusCode = response.data.statusCode;
          const apiMessage = response.data.message;
          const apiStatus = response.data.status;
          
          if (httpStatusCode === 200 && apiStatus === true) {
            const logMessage = `Batch ${i + 1}/${batches.length}: SMS sent successfully to ${batch.length} numbers - HTTP: ${httpStatusCode}, API Status: ${apiStatus}`;
            console.log(logMessage);
            addLog(logMessage);
          } else {
            const logMessage = `Batch ${i + 1}/${batches.length}: API Error - HTTP: ${httpStatusCode}, API Status: ${apiStatus}, API Code: ${apiStatusCode}, Message: ${apiMessage}`;
            console.log(logMessage);
            addLog(logMessage);
          }
        }
              } catch (error) {
          console.error('API error for batch', i + 1, ':', error);
          console.error('Error details:', error.response?.data || error.message);
          
          const apiResponse = error.response?.data;
          const apiStatusCode = apiResponse?.statusCode || 'N/A';
          const apiMessage = apiResponse?.message || error.message;
          
          const errorMessage = `Batch ${i + 1}/${batches.length}: API Error - Status: ${apiStatusCode}, Message: ${apiMessage}`;
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
      await sendSMSBatch(csvData.numbers);
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
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
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
                              <ReactQuill
                theme="snow"
                value={message}
                onChange={setMessage}
                placeholder="پیام خود را اینجا بنویسید..."
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, false] }],
                    ['bold', 'italic', 'underline'],
                    ['link', 'image'],
                    ['clean']
                  ]
                }}
                className="message-editor"
                preserveWhitespace={true}
                dir="rtl"
              />
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