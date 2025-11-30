# OpenTable Clone - Frontend

A modern, full-featured restaurant reservation platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

### Core Functionality
- **Restaurant Discovery**: Browse, search, and filter restaurants
- **Reservation System**: Real-time availability and booking
- **User Authentication**: Secure login with NextAuth.js (OAuth & credentials)
- **Payment Integration**: Stripe integration for deposits and payments
- **Delivery System**: Complete food delivery with driver management
- **Reviews & Ratings**: User-generated content with photos

### Advanced Features
- **Progressive Web App (PWA)**: Offline support, push notifications
- **Real-time Updates**: WebSocket integration for live notifications
- **AI Recommendations**: Machine learning-powered restaurant suggestions
- **Social Features**: Friend system, group dining, activity feeds
- **Smart Restaurant Tech**: IoT device management, kitchen displays
- **Multi-platform Calendar**: Google, Outlook, Apple calendar integration
- **Geolocation Services**: Maps integration, location-based search
- **Analytics Dashboard**: Business intelligence and reporting

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **State Management**: Zustand, React Query
- **Payments**: Stripe
- **Real-time**: WebSockets
- **PWA**: Service Workers, Web Push API
- **Maps**: Google Maps API
- **Deployment**: Vercel/Docker

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database
- Redis (for caching)
- Stripe account (for payments)
- Google Cloud account (for Maps & OAuth)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/opentable-clone.git
cd opentable-clone/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Google Services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/opentable
```

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication pages
│   ├── admin/             # Admin dashboard
│   ├── restaurants/       # Restaurant pages
│   └── ...
├── components/            # React components
│   ├── common/           # Shared components
│   ├── restaurant/       # Restaurant-specific
│   └── ...
├── lib/                   # Utilities and services
│   ├── api/              # API client services
│   ├── integrations/     # Third-party integrations
│   └── ...
├── hooks/                # Custom React hooks
├── types/                # TypeScript definitions
└── styles/               # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check
- `npm run test` - Run tests
- `npm run analyze` - Analyze bundle size

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
# Build the image
docker build -t opentable-frontend .

# Run the container
docker run -p 3000:3000 --env-file .env.local opentable-frontend
```

### Manual Deployment

```bash
# Build the application
npm run build

# Start the production server
npm run start
```

## Environment Variables

See `.env.example` for all required environment variables. Key variables:

- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXTAUTH_SECRET` - Secret for NextAuth.js
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- Google OAuth credentials
- Stripe API keys
- AWS S3 credentials (for file uploads)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Performance Optimizations

- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Service worker caching
- Database query optimization
- CDN integration for static assets
- Compression and minification

## Security

- Input validation and sanitization
- CSRF protection
- Rate limiting
- Secure headers
- Environment variable encryption
- Regular dependency updates

## Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@opentable-clone.com or join our Discord community.

## Acknowledgments

- Next.js team for the amazing framework
- Vercel for hosting and deployment
- All contributors and open source projects used