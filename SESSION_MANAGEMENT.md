# Session Management System

This document describes the session management system implemented in the Filmnet SMS Tool to handle user authentication persistence across page refreshes.

## Overview

The session management system ensures that users remain logged in even after refreshing the page or closing and reopening the browser, while maintaining security through session expiration and server-side validation.

## Features

### 1. Session Persistence
- **localStorage Storage**: User session data is stored in browser localStorage
- **24-Hour Expiration**: Sessions automatically expire after 24 hours
- **Automatic Refresh**: Sessions are refreshed every 30 minutes when the user is active

### 2. Server-Side Validation
- **User Existence Check**: Validates that the user still exists in the database
- **Real-time Validation**: Uses Convex queries to check user validity
- **Automatic Logout**: Logs out users if they no longer exist in the database

### 3. Session Status Display
- **Session Age Indicator**: Shows how long the current session has been active
- **Manual Refresh Button**: Allows users to manually refresh their session
- **Visual Feedback**: Session status is displayed in the dashboard header

## Implementation Details

### Core Components

#### 1. SessionManager (`src/utils/sessionManager.js`)
Utility class that handles all session operations:

```javascript
// Save session
SessionManager.saveSession(user);

// Load session
const user = SessionManager.loadSession();

// Check validity
const isValid = SessionManager.isSessionValid();

// Refresh session
const refreshed = SessionManager.refreshSession();

// Clear session
SessionManager.clearSession();
```

#### 2. useAuth Hook (`src/hooks/useAuth.js`)
Custom React hook that manages authentication state:

```javascript
const { isAuthenticated, currentUser, isLoading, login, logout } = useAuth();
```

#### 3. Server-Side Validation (`src/convex/auth.ts`)
Convex query to validate user existence:

```typescript
export const validateSession = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user ? { _id: user._id, phoneNumber: user.phoneNumber, name: user.name } : null;
  },
});
```

### Session Data Structure

```javascript
{
  user: {
    _id: "user_id",
    phoneNumber: "09123456789",
    name: "User Name"
  },
  timestamp: 1703123456789 // Unix timestamp
}
```

## Usage

### For Users
1. **Login**: Enter credentials to start a session
2. **Session Status**: View session age in the dashboard header
3. **Manual Refresh**: Click the refresh button (🔄) to extend session
4. **Automatic Persistence**: Session persists across page refreshes

### For Developers
1. **Testing**: Use `window.testSessionManagement()` in browser console
2. **Debugging**: Check localStorage for `sms_tool_session` key
3. **Customization**: Modify session duration in `SessionManager.js`

## Security Features

1. **Session Expiration**: 24-hour automatic expiration
2. **Server Validation**: Real-time user existence verification
3. **Secure Storage**: Uses localStorage with timestamp validation
4. **Automatic Cleanup**: Expired sessions are automatically cleared

## Troubleshooting

### Common Issues

1. **Session Not Persisting**
   - Check if localStorage is enabled
   - Verify browser supports localStorage
   - Check for JavaScript errors in console

2. **Premature Logout**
   - Check server connectivity
   - Verify user still exists in database
   - Check session expiration time

3. **Session Age Not Updating**
   - Refresh the page
   - Check for JavaScript errors
   - Verify the session status component is mounted

### Debug Commands

```javascript
// Test session management
window.testSessionManagement();

// Check localStorage
console.log(localStorage.getItem('sms_tool_session'));

// Clear session manually
localStorage.removeItem('sms_tool_session');
```

## Configuration

### Session Duration
Modify the session expiration time in `SessionManager.js`:

```javascript
// Change from 24 hours to custom duration
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours
```

### Auto-refresh Interval
Modify the refresh interval in `useAuth.js`:

```javascript
// Change from 30 minutes to custom interval
const refreshInterval = setInterval(updateSessionAge, 15 * 60 * 1000); // 15 minutes
```

## Future Enhancements

1. **Remember Me**: Option to extend session beyond 24 hours
2. **Multi-device Sessions**: Support for multiple active sessions
3. **Session Analytics**: Track session usage patterns
4. **Advanced Security**: JWT tokens with refresh tokens
5. **Offline Support**: Cache user data for offline access
