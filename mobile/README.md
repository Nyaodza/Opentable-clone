# OpenTable Clone Mobile App

This is the React Native mobile application for the OpenTable Clone project.

## Prerequisites

- Node.js 18+
- React Native development environment set up
- iOS: Xcode 14+ (for iOS development)
- Android: Android Studio (for Android development)

## Getting Started

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Project Structure

```
mobile/
├── src/
│   ├── components/     # Reusable components
│   ├── screens/       # Screen components
│   ├── navigation/    # Navigation configuration
│   ├── services/      # API and external services
│   ├── store/         # State management
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript types
├── assets/            # Images, fonts, etc.
├── ios/              # iOS-specific code
├── android/          # Android-specific code
└── __tests__/        # Test files
```

## Features

- Cross-platform support (iOS & Android)
- Native navigation
- Push notifications
- Offline support
- Biometric authentication
- Camera integration for reviews
- Location services
- Deep linking

## Development

### Running Tests

```bash
npm test
```

### Building for Production

#### iOS
```bash
cd ios
xcodebuild -workspace OpenTableClone.xcworkspace -scheme OpenTableClone archive
```

#### Android
```bash
cd android
./gradlew assembleRelease
```

## Environment Variables

Create `.env` file:

```env
API_URL=https://api.opentable-clone.com
GOOGLE_MAPS_API_KEY=your_api_key
SENTRY_DSN=your_sentry_dsn
```

## Debugging

- React Native Debugger
- Flipper
- Remote JS Debugging
- Console logs

## Performance

- Use React Native Performance Monitor
- Profile with Flipper
- Optimize images and assets
- Implement lazy loading
- Use FlatList for long lists

## Code Style

- Follow React Native best practices
- Use TypeScript
- ESLint configuration
- Prettier for formatting