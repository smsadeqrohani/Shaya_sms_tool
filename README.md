# Shaya SMS Tool

A modern, dark-themed web application for sending SMS messages in batches using CSV files. Built with React and featuring a beautiful glass-morphism design.

## Features

- 🔐 **Authentication**: Phone number format validation (09xxxxxxx) with password requirements
- 📁 **CSV Upload**: Upload CSV files with phone numbers in the first column
- ✍️ **Rich Text Editor**: HTML editor with emoji support for message content
- 🏷️ **Tagging System**: Add tags to organize your SMS campaigns
- 📱 **Batch Processing**: Send SMS in batches of 100 (configurable)
- 📊 **Real-time Logs**: Monitor SMS sending progress and status
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

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Authentication
- Use phone number format: `09xxxxxxx`
- Password must be at least 8 characters
- Demo credentials: `09127726273` / `doosetdaram`

### CSV Format
Your CSV file should have phone numbers in the first column:
```csv
PhoneNumber
989127726273
989382663333
09123456789
```

**Note**: Create your own CSV file with phone numbers in the first column. The first row should be the header (e.g., "PhoneNumber").

### SMS Sending Process
1. **Upload CSV**: Select a CSV file with phone numbers
2. **Compose Message**: Use the rich text editor to write your message
3. **Add Tag**: Optionally add a tag for campaign tracking
4. **Send**: Click "Send SMS" to start batch processing

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
│   └── Dashboard.css     # Dashboard styling
├── App.js               # Main app component with routing
├── App.css              # Global app styling
├── index.js             # React entry point
└── index.css            # Global styles and variables
```

## Technologies Used

- **React 18**: Modern React with hooks
- **React Router**: Client-side routing
- **React Quill**: Rich text editor with emoji support
- **Papa Parse**: CSV parsing library
- **Axios**: HTTP client for API calls
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
- Emoji support
- Bold, italic, underline formatting
- Link and image insertion
- Clean HTML output

### Batch Processing
- Configurable batch size (currently 10)
- Progress tracking with visual indicators
- Error handling for failed batches
- Rate limiting with delays between batches

### Real-time Logging
- Timestamped activity logs
- Success and error message tracking
- Scrollable log container
- Clear all functionality

## API Integration

The application integrates with the OkitSMS API:

```javascript
// Example API call
const response = await axios.post('https://api.okitsms.com/api/v1/sms/send/1tn', {
  SourceNumber: "981000007711",
  DestinationNumbers: ["09123456789,09876543210"],
  Message: "Your message content",
  UserTag: "campaign-tag"
}, {
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': 'CV@%0RlPM4pIjGp5j8kBFBYmAtEh#%Sr'
  }
});
```

## Customization

### Changing Batch Size
Edit the `sendSMSBatch` function in `Dashboard.js`:
```javascript
const sendSMSBatch = async (numbers, batchSize = 20) => { // Change from 10 to desired size
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

### Available Scripts

- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run tests
- `npm eject`: Eject from Create React App

### Code Style

- ES6+ JavaScript
- Functional components with hooks
- CSS modules for component styling
- Responsive design principles

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team. 
=======
# Shaya_sms_tool
>>>>>>> 14ac9835af2d136c26ccec7030f7ef08d407a73c
