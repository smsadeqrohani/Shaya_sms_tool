# Shaya SMS Tool

A modern, dark-themed web application for sending SMS messages in batches using CSV files. Built with React and featuring a beautiful glass-morphism design.

## Features

- 🔐 **Authentication**: Real user management with phone number validation and admin roles
- 📁 **CSV Upload**: Upload CSV files with phone numbers in the first column
- ✍️ **Rich Text Editor**: HTML editor with formatting options for message content
- 🏷️ **Tagging System**: Add tags to organize your SMS campaigns
- 📱 **Batch Processing**: Send SMS in batches of 100 (configurable)
- 📊 **Real-time Logs**: Monitor SMS sending progress and status
- 🗄️ **Backend Database**: Convex backend with comprehensive logging and statistics
- 👥 **User Management**: Admin panel for creating and managing users
- 📈 **Reports**: Detailed campaign reports with Persian dates and statistics
- 🌙 **Dark Mode**: Beautiful dark theme with glass effects
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices

## Color Scheme

- **Primary Color**: #A8233C (Deep Red)
- **Secondary Color**: #007A7A (Teal)
- **Background**: Dark gradient with glass effects

## Installation

1. Clone the repository:
```bash
git clone https://github.com/smsadeqrohani/Shaya_sms_tool.git
cd Shaya_sms_tool
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server (runs both frontend and backend):
```bash
npm run dev
```

Or use the convenience script:
```bash
./dev.sh
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note**: The `npm run dev` command starts both the React frontend and Convex backend simultaneously. The backend will be available at the URL shown in the terminal.

## Usage

### Authentication
- Use phone number format: `09xxxxxxx`
- Password must be at least 8 characters
- Demo credentials: `09127726273` / `doosetdaram`

### CSV Format
Your CSV file should have phone numbers in the first column:
```csv
PhoneNumber
09123456789
09123456790
09123456791
```

**Note**: Create your own CSV file with phone numbers in the first column. The first row should be the header (e.g., "PhoneNumber").

### SMS Sending Process
1. **Upload CSV**: Select a CSV file with phone numbers
2. **Compose Message**: Use the rich text editor to write your message
3. **Add Tag**: Optionally add a tag for campaign tracking
4. **Send**: Click "Send SMS" to start batch processing

### Application Routes
- **`/login`**: Authentication page
- **`/dashboard`**: Main SMS sending interface
- **`/admin`**: User management (admin users only)
- **`/reports`**: Campaign reports and analytics
- **`/`**: Redirects to login page

### API Configuration
The application uses the OkitSMS API with the following configuration:
- **Endpoint**: `https://api.okitsms.com/api/v1/sms/send/1tn`
- **Source Number**: `981000007711` (fixed)
- **Batch Size**: 100 numbers per request
- **Delay**: 1 second between batches

## Project Structure

```
src/
├── components/
│   ├── Login.js          # Authentication component
│   ├── Login.css         # Login styling
│   ├── Dashboard.js      # Main SMS sending interface
│   ├── Dashboard.css     # Dashboard styling
│   ├── AdminPanel.js     # User management interface
│   ├── AdminPanel.css    # Admin panel styling
│   ├── Reports.js        # Campaign reports interface
│   └── Reports.css       # Reports styling
├── convex/
│   ├── schema.ts         # Database schema
│   ├── auth.ts           # Authentication functions
│   ├── sms.ts            # SMS and campaign functions
│   ├── setup.ts          # Setup functions
│   └── init.ts           # Initialization script
├── App.js               # Main app component with routing
├── App.css              # Global app styling
├── index.js             # React entry point
└── index.css            # Global styles and variables
```

## Technologies Used

- **React 18**: Modern React with hooks
- **React Router**: Client-side routing
- **React Quill**: Rich text editor with formatting options
- **Papa Parse**: CSV parsing library
- **Convex**: Backend database and API
- **CSS3**: Modern styling with glass effects and animations

## Features in Detail

### Authentication System
- Phone number validation using regex pattern `/^09\d{9}$/`
- Password minimum length validation (8 characters)
- Loading states and error handling
- Session management with React Router

### CSV Processing
- Automatic parsing of CSV files
- Extraction of phone numbers from first column
- Validation and error handling
- File information display

### Rich Text Editor
- HTML formatting capabilities
- Bold, italic, underline formatting
- Link and image insertion
- Clean HTML output
- RTL (Right-to-Left) support for Persian text

### Batch Processing
- Configurable batch size (currently 100)
- Progress tracking with visual indicators
- Error handling for failed batches
- Rate limiting with delays between batches

### Real-time Logging
- Timestamped activity logs
- Success and error message tracking
- Scrollable log container
- Clear all functionality

### User Management
- **Admin Panel**: Access via `/admin` route (admin users only)
- **Create Users**: Add new admin users with phone number and password
- **Password Management**: Change passwords for existing users
- **User List**: View all registered users with creation dates
- **Role-based Access**: Admin users have access to all features

### Campaign Reports
- **Reports Page**: Access via `/reports` route
- **Campaign History**: View all campaigns with statistics
- **Detailed Analytics**: Success rates, response times, error analysis
- **Batch Logs**: Individual batch performance and error details
- **Persian Dates**: All dates displayed in Persian calendar format
- **Real-time Data**: Live updates from Convex backend

## Backend Features

### Database Schema
The application uses Convex as a backend with the following data models:

- **Users**: Phone number, password, admin role, creation date
- **Campaigns**: Tag, message, total numbers, batches, status, Persian dates
- **SMS Logs**: Detailed batch logs with response times and error tracking
- **Campaign Stats**: Aggregated statistics for quick reporting

### User Management
- **Admin Panel**: Create and manage admin users
- **Password Management**: Change passwords for existing users
- **Role-based Access**: Admin users can access all features
- **Session Management**: Secure login with phone number validation

### Campaign Tracking
- **Comprehensive Logging**: Every SMS batch is logged with detailed information
- **Error Tracking**: HTTP status codes, API responses, and error messages
- **Performance Metrics**: Response times and success rates
- **Persian Dates**: All dates displayed in Persian calendar format

### Reporting System
- **Campaign History**: View all campaigns with statistics
- **Detailed Reports**: Success rates, response times, and error analysis
- **Batch Logs**: Individual batch performance and error details
- **Real-time Updates**: Live data from Convex backend

## API Integration

The application integrates with the OkitSMS API through the Convex backend:

```javascript
// SMS sending is handled by Convex backend
const result = await sendSMSBatchMutation({
  campaignId,
  batchNumber: i + 1,
  phoneNumbers: batch,
  message: plainTextMessage,
  tag
});
```

## Customization

### Changing Batch Size
Edit the `sendSMSBatch` function in `Dashboard.js`:
```javascript
const sendSMSBatch = async (numbers, batchSize = 100) => { // Change from 100 to desired size
```

### Modifying Colors
Update CSS variables in `index.css`:
```css
:root {
  --primary-color: #A8233C;
  --secondary-color: #007A7A;
  /* Add more custom colors */
}
```

### API Configuration
Update the API endpoint and credentials in `Dashboard.js`:
```javascript
const response = await axios.post('YOUR_API_ENDPOINT', {
  // Your API payload
}, {
  headers: {
    'X-API-KEY': 'YOUR_API_KEY'
  }
});
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

### Quick Start
```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev

# Open http://localhost:3000 in your browser
```

### Development Workflow
1. **Frontend**: React development server runs on `http://localhost:3000`
2. **Backend**: Convex development server runs on the URL shown in terminal
3. **Hot Reload**: Both frontend and backend support hot reloading
4. **Database**: Convex provides a development database automatically
5. **Concurrent Development**: Both servers start simultaneously with `npm run dev`

### Development Commands
```bash
# Start both frontend and backend
npm run dev

# Start only frontend
npm start

# Start only backend
npm run convex:dev

# Deploy backend to production
npm run convex:deploy
```

### Available Scripts

- `npm run dev`: Start both frontend and backend development servers
- `npm start`: Start React development server only
- `npm run convex:dev`: Start Convex backend only
- `npm run convex:deploy`: Deploy Convex functions to production
- `npm build`: Build for production
- `npm test`: Run tests
- `npm eject`: Eject from Create React App

### Code Style

- ES6+ JavaScript
- Functional components with hooks
- CSS modules for component styling
- Responsive design principles
- TypeScript for Convex backend functions

## License

This project is licensed under the MIT License.

## Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Kill the process using port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Convex backend not connecting**
   - Check that the Convex URL in `.env.local` is correct
   - Ensure Convex development server is running
   - Try running `npm run convex:dev` separately

3. **Database not initialized**
   - Visit the admin panel at `/admin`
   - Click "Create First Admin" to initialize the database

4. **SMS API errors**
   - Check the API key in `src/convex/sms.ts`
   - Verify the OkitSMS API endpoint is accessible
   - Check the logs in the Reports section

### Development Tips

- Use the browser's developer tools to check for console errors
- Check the Convex dashboard for backend function logs
- The Reports page shows detailed campaign and error logs
- Admin panel allows you to manage users and reset passwords

## Support

For support and questions, please contact the development team. 
=======
# Shaya_sms_tool
>>>>>>> 14ac9835af2d136c26ccec7030f7ef08d407a73c
