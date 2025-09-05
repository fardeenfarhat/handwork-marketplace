# Handwork Marketplace

A dual-sided marketplace platform that connects clients who need manual work services with skilled workers.

## Project Structure

```
├── backend/                 # Python FastAPI backend
│   ├── app/                # Application code
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Core configuration
│   │   ├── db/            # Database models and connection
│   │   └── main.py        # FastAPI application
│   ├── alembic/           # Database migrations
│   ├── tests/             # Backend tests
│   └── requirements.txt   # Python dependencies
├── mobile/                # React Native mobile app
│   ├── src/               # Source code
│   │   ├── components/    # Reusable components
│   │   ├── screens/       # Screen components
│   │   ├── navigation/    # Navigation configuration
│   │   ├── services/      # API services
│   │   ├── store/         # Redux store
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── package.json       # Node.js dependencies
├── admin-web/             # React web admin dashboard
│   ├── src/               # Source code
│   │   ├── components/    # Dashboard components
│   │   │   └── sections/  # Dashboard sections
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── App.tsx        # Main application
│   ├── public/            # Static assets
│   └── package.json       # Node.js dependencies
└── docker-compose.yml     # Docker configurati

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: SQLAlchemy
- **Authentication**: JWT with OAuth2
- **Payments**: Stripe/PayPal integration
- **Testing**: pytest

### Mobile App
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **UI Components**: Custom components with Expo Vector Icons
- **Maps**: React Native Maps
- **Push Notifications**: Firebase Cloud Messaging

### Admin Dashboard
- **Framework**: React 18 with TypeScript
- **Routing**: React Router DOM
- **Charts**: Chart.js with React Chart.js 2
- **HTTP Client**: Axios
- **Styling**: CSS3 with responsive design
- **Icons**: Font Awesome

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

6. Start the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`

### Mobile App Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```

4. Use the Expo Go app on your phone to scan the QR code, or run on simulator:
   ```bash
   npm run ios     # iOS simulator
   npm run android # Android emulator
   ```

### Admin Dashboard Setup

1. Navigate to the admin-web directory:
   ```bash
   cd admin-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open http://localhost:3000 in your browser

**Note**: Make sure the backend API is running on http://localhost:8000 before starting the admin dashboard.

### Docker Setup

To run the entire application with Docker:

```bash
docker-compose up --build
```

## Development

### Backend Development

- **Code formatting**: `black app tests`
- **Linting**: `flake8 app tests`
- **Testing**: `pytest`
- **Create migration**: `alembic revision --autogenerate -m "description"`
- **Apply migrations**: `alembic upgrade head`

### Mobile Development

- **Type checking**: `npm run type-check`
- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Testing**: `npm test`

## API Documentation

When the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Features

- **User Authentication**: Email/password and social login (Google, Facebook, Apple)
- **Role-based Access**: Separate interfaces for Workers and Clients
- **Job Management**: Post, browse, and apply for jobs
- **Real-time Messaging**: In-app chat between users
- **Payment Processing**: Secure payments with escrow functionality
- **Rating & Reviews**: Mutual rating system for quality assurance
- **Geolocation**: Location-based job matching
- **Push Notifications**: Real-time updates and alerts
- **Admin Dashboard**: Platform management and analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.