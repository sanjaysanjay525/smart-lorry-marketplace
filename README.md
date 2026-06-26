# Smart Lorry Marketplace

A modern digital marketplace platform for connecting truck (lorry) owners with cargo shipment opportunities, enabling efficient logistics operations and real-time load matching.

## Features

- **Load Matching**: Real-time matching between available cargo and trucks
- **Driver Management**: Manage driver profiles, ratings, and certifications
- **Route Optimization**: Intelligent route planning and optimization
- **Payment Processing**: Secure payment and settlement system
- **Real-time Tracking**: GPS tracking and live shipment monitoring
- **Rating System**: Trustworthy marketplace with driver and shipper ratings
- **Admin Dashboard**: Comprehensive analytics and platform management

## Tech Stack

- **Frontend**: React.js with TypeScript
- **Backend**: Node.js/Express.js with PostgreSQL
- **Real-time**: Socket.io for live updates
- **Payment**: Stripe integration
- **Maps**: Google Maps API for routing and tracking
- **Deployment**: Docker & Kubernetes

## Project Structure

```
smart-lorry-marketplace/
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Auth, validation
│   │   └── config/      # Configuration
│   ├── tests/           # Unit & integration tests
│   └── package.json
├── frontend/             # React application
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API clients
│   │   └── styles/      # CSS/styling
│   └── package.json
├── docker-compose.yml    # Local development setup
├── .env.example          # Environment variables template
└── docs/                 # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/sanjaysanjay525/smart-lorry-marketplace.git
   cd smart-lorry-marketplace
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   npm start
   ```

4. **Using Docker Compose**
   ```bash
   docker-compose up -d
   ```

## API Documentation

API endpoints for:
- Authentication (login, register, JWT tokens)
- Load/Shipment Management
- Driver/Truck Management
- Payments & Transactions
- Tracking & Notifications

See `docs/API.md` for detailed endpoint documentation.

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'Add feature description'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## Environment Variables

Create a `.env` file in root and backend directories:

```
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/smart_lorry
JWT_SECRET=your_jwt_secret_key
STRIPE_API_KEY=sk_test_...
GOOGLE_MAPS_API_KEY=your_api_key
PORT=5000

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_KEY=your_api_key
```

## License

MIT License - see LICENSE file for details

## Contact

For questions or support, reach out to sanjaysanjay525 on GitHub.

---

**Status**: 🚀 In Development
