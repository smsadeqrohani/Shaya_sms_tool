# Development Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development servers**
   ```bash
   npm run dev
   ```

3. **Open the application**
   - Frontend: http://localhost:3000
   - Backend: URL shown in terminal

## Development Workflow

### Frontend Development
- React development server runs on `http://localhost:3000`
- Hot reload enabled for all React components
- CSS changes are automatically reflected
- Browser developer tools for debugging

### Backend Development
- Convex development server runs automatically
- Backend functions are in `src/convex/`
- Database schema in `src/convex/schema.ts`
- Functions are automatically deployed to development environment

### Database
- Convex provides a development database automatically
- No local database setup required
- Data persists between development sessions
- Can be reset from Convex dashboard

## Project Structure

```
src/
├── components/          # React components
│   ├── Login.js        # Authentication
│   ├── Dashboard.js    # Main SMS interface
│   ├── AdminPanel.js   # User management
│   └── Reports.js      # Campaign reports
├── convex/             # Backend functions
│   ├── schema.ts       # Database schema
│   ├── auth.ts         # Authentication functions
│   ├── sms.ts          # SMS and campaign functions
│   └── setup.ts        # Setup functions
└── App.js              # Main app with routing
```

## Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm start` - Start React frontend only
- `npm run convex:dev` - Start Convex backend only
- `npm run convex:deploy` - Deploy to production
- `npm build` - Build for production

## Development Tips

### Frontend
- Use React Developer Tools for component debugging
- Check browser console for JavaScript errors
- CSS changes are hot-reloaded automatically

### Backend
- Check Convex dashboard for function logs
- Database changes are reflected immediately
- Functions are automatically deployed on save

### Database
- Use Convex dashboard to view data
- Schema changes require function redeployment
- Development data is separate from production

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Convex connection issues**
   - Check `.env.local` for correct Convex URL
   - Ensure Convex development server is running
   - Try `npm run convex:dev` separately

3. **Database initialization**
   - Visit `/admin` and click "Create First Admin"
   - Check Convex dashboard for database status

4. **SMS API issues**
   - Verify API key in `src/convex/sms.ts`
   - Check Reports page for detailed error logs
   - Test API endpoint connectivity

### Debugging

- **Frontend**: Browser developer tools and React DevTools
- **Backend**: Convex dashboard function logs
- **Database**: Convex dashboard data viewer
- **Network**: Browser network tab for API calls

## Deployment

1. **Build frontend**
   ```bash
   npm run build
   ```

2. **Deploy backend**
   ```bash
   npm run convex:deploy
   ```

3. **Deploy frontend** to your hosting service

## Environment Variables

Create `.env.local` for local development:
```
REACT_APP_CONVEX_URL=your_convex_url_here
```

The Convex URL is automatically generated when you run `npx convex dev`. 