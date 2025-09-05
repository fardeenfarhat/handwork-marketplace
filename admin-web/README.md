# Handwork Marketplace Admin Dashboard

A React-based web admin dashboard for managing the Handwork Marketplace platform.

## Features

- **Admin Authentication**: Secure login system for administrators
- **User Management**: View, search, filter, and manage users (clients and workers)
- **Job Oversight**: Monitor all jobs with filtering and detailed views
- **Payment Monitoring**: Track payments, transactions, and financial data
- **Dispute Resolution**: Handle disputes between clients and workers
- **Content Moderation**: Review and moderate user reviews and KYC documents
- **Analytics Dashboard**: Comprehensive analytics with charts and metrics

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Routing**: React Router DOM
- **Charts**: Chart.js with React Chart.js 2
- **HTTP Client**: Axios
- **Styling**: CSS3 with responsive design
- **Icons**: Font Awesome

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running on http://localhost:8000

### Installation

1. Navigate to the admin-web directory:
   ```bash
   cd admin-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file (optional):
   ```bash
   cp .env.example .env
   ```
   
   Set `REACT_APP_API_URL` if your backend is not running on http://localhost:8000

4. Start the development server:
   ```bash
   npm start
   ```

5. Open http://localhost:3000 in your browser

### Default Admin Credentials

Use the admin user created in the backend system. If you haven't created one, run:

```bash
cd ../backend
python create_admin_user.py
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
admin-web/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── sections/
│   │   │   ├── Overview.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   ├── JobOversight.tsx
│   │   │   ├── PaymentMonitoring.tsx
│   │   │   ├── DisputeResolution.tsx
│   │   │   ├── ContentModeration.tsx
│   │   │   └── Analytics.tsx
│   │   ├── Dashboard.tsx
│   │   └── Login.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── services/
│   │   └── apiService.ts
│   ├── App.tsx
│   ├── App.css
│   ├── index.tsx
│   └── index.css
├── package.json
├── tsconfig.json
└── README.md
```

## Features Overview

### Dashboard Sections

1. **Overview**: Platform metrics, charts, and key performance indicators
2. **User Management**: Search, filter, and manage user accounts
3. **Job Oversight**: Monitor job postings, status, and details
4. **Payment Monitoring**: Track payment transactions and status
5. **Dispute Resolution**: Handle disputes and conflicts
6. **Content Moderation**: Review user-generated content and KYC documents
7. **Analytics**: Detailed analytics with interactive charts

### Key Functionality

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Data**: Fetches live data from the backend API
- **Interactive Charts**: Visual representation of platform metrics
- **Advanced Filtering**: Filter and search across all data tables
- **Pagination**: Efficient handling of large datasets
- **Modal Dialogs**: Detailed views and actions in overlay modals
- **Error Handling**: Comprehensive error handling and user feedback

## API Integration

The dashboard integrates with the backend API endpoints:

- `/api/v1/auth/login` - Admin authentication
- `/api/v1/admin/me` - Get current admin info
- `/api/v1/admin/users` - User management
- `/api/v1/admin/jobs` - Job oversight
- `/api/v1/admin/payments` - Payment monitoring
- `/api/v1/admin/disputes` - Dispute management
- `/api/v1/admin/analytics/*` - Analytics data
- `/api/v1/admin/moderation/*` - Content moderation

## Deployment

### Production Build

```bash
npm run build
```

This creates a `build` folder with optimized production files.

### Environment Variables

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:8000)

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript for type safety
3. Implement responsive design for all new components
4. Add error handling for all API calls
5. Update this README for any new features

## License

This project is part of the Handwork Marketplace platform.