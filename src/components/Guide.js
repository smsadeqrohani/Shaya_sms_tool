import React, { useState } from 'react';
import './Guide.css';

const Guide = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = {
    'getting-started': {
      title: '🚀 Getting Started',
      content: (
        <div className="guide-section">
          <h3>Welcome to Filmnet SMS Tool</h3>
          <p>This powerful tool allows you to send bulk SMS messages efficiently with advanced features like campaign management, scheduling, and detailed reporting.</p>
          
          <div className="feature-highlight">
            <h4>✨ Key Features</h4>
            <ul>
              <li>📁 CSV Upload with automatic phone number detection</li>
              <li>✍️ Rich text editor for message composition</li>
              <li>📅 Campaign scheduling with Persian date picker</li>
              <li>📊 Real-time progress tracking and logs</li>
              <li>👥 User management system</li>
              <li>📈 Detailed campaign reports and analytics</li>
            </ul>
          </div>
        </div>
      )
    },
    'csv-upload': {
      title: '📁 CSV Upload Guide',
      content: (
        <div className="guide-section">
          <h3>CSV File Requirements</h3>
          
          <div className="important-note">
            <h4>⚠️ Important Format Rules</h4>
            <ul>
              <li><strong>First Column Only:</strong> Phone numbers must be in the first column</li>
              <li><strong>Header Row:</strong> First row is treated as header and will be ignored</li>
              <li><strong>Phone Format:</strong> Use 09xxxxxxxxx format (11 digits)</li>
              <li><strong>File Type:</strong> Only .csv files are accepted</li>
            </ul>
          </div>

          <div className="example-section">
            <h4>📋 Example CSV Format</h4>
            <div className="code-example">
              <pre>
{`PhoneNumber,Name,Email
09123456789,John Doe,john@example.com
09123456790,Jane Smith,jane@example.com
09123456791,Bob Johnson,bob@example.com`}
              </pre>
            </div>
            <p><strong>Note:</strong> Only the phone numbers in the first column will be used for SMS sending.</p>
          </div>

          <div className="tips-section">
            <h4>💡 Upload Tips</h4>
            <ul>
              <li>Ensure phone numbers are in correct format (09xxxxxxxxx)</li>
              <li>Remove any empty rows or invalid phone numbers</li>
              <li>Maximum recommended file size: 10,000 phone numbers</li>
              <li>Test with a small file first before uploading large lists</li>
            </ul>
          </div>
        </div>
      )
    },
    'message-composition': {
      title: '✍️ Message Composition',
      content: (
        <div className="guide-section">
          <h3>Creating Effective SMS Messages</h3>
          
          <div className="feature-highlight">
            <h4>🎨 Rich Text Editor Features</h4>
            <ul>
              <li><strong>Text Formatting:</strong> Bold, italic, underline</li>
              <li><strong>Lists:</strong> Bullet points and numbered lists</li>
              <li><strong>Links:</strong> Add clickable URLs</li>
              <li><strong>Emojis:</strong> Use emojis for better engagement</li>
            </ul>
          </div>

          <div className="sms-calculator">
            <h4>📱 SMS Character Calculator</h4>
            <ul>
              <li><strong>Persian/Arabic Text:</strong> 70 characters per SMS</li>
              <li><strong>English Text:</strong> 160 characters per SMS</li>
              <li><strong>Emojis:</strong> Count as 10 characters each</li>
              <li><strong>Spaces:</strong> Count as 1 character</li>
            </ul>
            <p>The tool automatically calculates how many SMS messages will be sent based on your content.</p>
          </div>

          <div className="best-practices">
            <h4>✅ Best Practices</h4>
            <ul>
              <li>Keep messages concise and clear</li>
              <li>Include a clear call-to-action</li>
              <li>Test your message before sending to large lists</li>
              <li>Use appropriate emojis to increase engagement</li>
              <li>Include your company name or signature</li>
            </ul>
          </div>
        </div>
      )
    },
    'campaign-management': {
      title: '📊 Campaign Management',
      content: (
        <div className="guide-section">
          <h3>Managing Your SMS Campaigns</h3>
          
          <div className="campaign-features">
            <h4>🎯 Campaign Features</h4>
            <ul>
              <li><strong>Tagging:</strong> Add tags to organize campaigns</li>
              <li><strong>Scheduling:</strong> Schedule campaigns for future delivery</li>
              <li><strong>Batch Processing:</strong> Automatic processing in batches of 100</li>
              <li><strong>Real-time Logs:</strong> Monitor progress in real-time</li>
            </ul>
          </div>

          <div className="important-warning">
            <h4>⚠️ Important: Don't Close During Campaign Creation</h4>
            <p><strong>Don't close the browser tab while creating campaigns and segments!</strong></p>
            <ul>
              <li>Campaign creation and segment setup happens in the frontend</li>
              <li>Closing the page during this process may interrupt campaign setup</li>
              <li>Once "Campaign setup completed" appears, you can safely close the page</li>
              <li>Actual SMS sending happens on the server and continues automatically</li>
            </ul>
          </div>

          <div className="campaign-stats">
            <h4>📈 Campaign Process</h4>
            <ul>
              <li><strong>Campaign Creation:</strong> Frontend creates campaign and segments</li>
              <li><strong>Server Processing:</strong> Backend handles SMS sending automatically</li>
              <li><strong>Real-time Logs:</strong> Monitor campaign setup progress</li>
              <li><strong>Status Updates:</strong> Check Reports section for sending status</li>
            </ul>
          </div>

          <div className="scheduling-guide">
            <h4>📅 Campaign Scheduling</h4>
            <ul>
              <li>Use the Persian date picker to select delivery time</li>
              <li>Scheduled time must be in the future</li>
              <li>Campaigns are automatically scheduled on the server</li>
              <li>SMS sending happens automatically at the scheduled time</li>
              <li>Monitor scheduled campaigns in the Reports section</li>
            </ul>
          </div>
        </div>
      )
    },
    'user-management': {
      title: '👥 User Management',
      content: (
        <div className="guide-section">
          <h3>Managing Users and Access</h3>
          
          <div className="user-roles">
            <h4>👤 User Roles</h4>
            <ul>
              <li><strong>Admin Users:</strong> Can create and manage other users</li>
              <li><strong>Regular Users:</strong> Can send SMS campaigns</li>
              <li><strong>Access Control:</strong> Different permissions for different users</li>
            </ul>
          </div>

          <div className="creating-users">
            <h4>➕ Creating New Users</h4>
            <ol>
              <li>Click the "👥 Users" button in the dashboard header</li>
              <li>Click "➕ Create New User"</li>
              <li>Fill in the required information:
                <ul>
                  <li><strong>Full Name:</strong> User's complete name</li>
                  <li><strong>Phone Number:</strong> Must be in 09xxxxxxxxx format</li>
                  <li><strong>Password:</strong> Minimum 8 characters</li>
                </ul>
              </li>
              <li>Click "Create User" to save</li>
            </ol>
          </div>

          <div className="user-validation">
            <h4>✅ User Validation Rules</h4>
            <ul>
              <li><strong>Phone Number:</strong> Must be unique and in correct format</li>
              <li><strong>Password:</strong> Minimum 8 characters required</li>
              <li><strong>Name:</strong> Required field for identification</li>
            </ul>
          </div>

          <div className="user-actions">
            <h4>🔧 User Actions</h4>
            <ul>
              <li><strong>View All Users:</strong> See list of all registered users</li>
              <li><strong>Delete Users:</strong> Remove users from the system</li>
              <li><strong>User Management:</strong> Access via dashboard header</li>
            </ul>
          </div>
        </div>
      )
    },
    'reports-analytics': {
      title: '📈 Reports & Analytics',
      content: (
        <div className="guide-section">
          <h3>Understanding Your Campaign Performance</h3>
          
          <div className="reports-features">
            <h4>📊 Available Reports</h4>
            <ul>
              <li><strong>Campaign History:</strong> All sent campaigns with details</li>
              <li><strong>Delivery Statistics:</strong> Success and failure rates</li>
              <li><strong>User Activity:</strong> Campaign activity by user</li>
              <li><strong>Date Range Filtering:</strong> Filter reports by date</li>
            </ul>
          </div>

          <div className="report-metrics">
            <h4>📋 Report Metrics</h4>
            <ul>
              <li><strong>Total Campaigns:</strong> Number of campaigns sent</li>
              <li><strong>Total Messages:</strong> Total SMS messages sent</li>
              <li><strong>Success Rate:</strong> Percentage of successful deliveries</li>
              <li><strong>Failure Rate:</strong> Percentage of failed deliveries</li>
              <li><strong>Average Response Time:</strong> Time taken for delivery</li>
            </ul>
          </div>

          <div className="persian-dates">
            <h4>📅 Persian Date Support</h4>
            <ul>
              <li>All dates are displayed in Persian calendar format</li>
              <li>Easy date range selection for filtering</li>
              <li>Consistent date formatting across the application</li>
            </ul>
          </div>

          <div className="export-options">
            <h4>💾 Data Export</h4>
            <ul>
              <li>Export campaign data for external analysis</li>
              <li>Download detailed logs and statistics</li>
              <li>Generate custom date range reports</li>
            </ul>
          </div>
        </div>
      )
    },
    'troubleshooting': {
      title: '🔧 Troubleshooting',
      content: (
        <div className="guide-section">
          <h3>Common Issues and Solutions</h3>
          
          <div className="common-issues">
            <h4>🚨 Common Issues</h4>
            
            <div className="issue-item">
              <h5>❌ CSV Upload Fails</h5>
              <p><strong>Problem:</strong> File upload fails or phone numbers not detected</p>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Ensure file is in .csv format</li>
                <li>Check that phone numbers are in first column</li>
                <li>Verify phone number format (09xxxxxxxxx)</li>
                <li>Remove any empty rows or invalid data</li>
              </ul>
            </div>

            <div className="issue-item">
              <h5>❌ Campaign Creation Issues</h5>
              <p><strong>Problem:</strong> Campaign creation is slow or fails</p>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Don't close the browser tab during campaign creation</li>
                <li>Check internet connection stability</li>
                <li>Monitor the progress logs for errors</li>
                <li>Large CSV files may take longer to process into segments</li>
                <li>Once "Campaign setup completed" appears, SMS sending continues on server</li>
              </ul>
            </div>

            <div className="issue-item">
              <h5>❌ Login Issues</h5>
              <p><strong>Problem:</strong> Can't log in or session expires</p>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Check phone number format (09xxxxxxxxx)</li>
                <li>Ensure password is at least 8 characters</li>
                <li>Clear browser cache and try again</li>
                <li>Contact administrator if issues persist</li>
              </ul>
            </div>

            <div className="issue-item">
              <h5>❌ SMS Not Delivered</h5>
              <p><strong>Problem:</strong> Messages not reaching recipients</p>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Check phone number validity</li>
                <li>Verify message content compliance</li>
                <li>Monitor delivery reports in analytics</li>
                <li>Some carriers may block certain content</li>
              </ul>
            </div>
          </div>

          <div className="performance-tips">
            <h4>⚡ Performance Tips</h4>
            <ul>
              <li>Use smaller CSV files for faster campaign creation</li>
              <li>Schedule campaigns during off-peak hours</li>
              <li>Keep message content concise</li>
              <li>Monitor campaign status in Reports section</li>
              <li>Large campaigns are automatically processed in segments on the server</li>
            </ul>
          </div>

          <div className="support-info">
            <h4>📞 Getting Help</h4>
            <ul>
              <li>Check this guide for common solutions</li>
              <li>Monitor the application logs for error details</li>
              <li>Contact your system administrator for technical issues</li>
              <li>Keep your browser updated for best performance</li>
            </ul>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="guide-container">
      <div className="guide-header glass">
        <h1>📚 SMS Tool Guide</h1>
        <p>Complete guide to using the Filmnet SMS Tool effectively</p>
      </div>

      <div className="guide-content">
        <div className="guide-sidebar glass">
          <nav className="guide-nav">
            {Object.entries(sections).map(([key, section]) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`guide-nav-item ${activeSection === key ? 'active' : ''}`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>

        <div className="guide-main glass">
          <div className="guide-section-content">
            {sections[activeSection].content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;
