# BoilerPark

Real-time parking solution for Purdue University that provides live availability updates, ML-based occupancy predictions, calendar integration, and intelligent routing to help students and visitors find parking spots efficiently.

## Tech Stack

**Frontend:**
- **Framework**: React Native 0.81.4 with Expo SDK 54
- **Language**: TypeScript
- **Key Libraries**: expo-location, react-native-maps, expo-notifications, axios, react-native-calendars

**Backend:**
- **Framework**: Django 5.2.6 with Django REST Framework
- **Language**: Python 3.x
- **Real-time**: Django Channels with WebSocket support
- **Databases**: PostgreSQL (primary storage), Redis (caching and message brokering)
- **Key Libraries**: psycopg2, channels, channels_redis, firebase_admin, icalendar

**Machine Learning:**
- **Models**: GRU (Gated Recurrent Unit), Random Forest
- **Computer Vision**: YOLO for car detection

**Infrastructure:**
- **Authentication**: Apple Sign-In, JWT tokens
- **Maps**: Google Maps API
- **Notifications**: Expo Push Notifications, Firebase Cloud Messaging
- **Architecture**: Client-Server with WebSocket real-time communication

## Features

### Real-Time Parking Availability
- Live parking spot occupancy data across campus
- WebSocket-based instant updates
- Interactive campus map with garage locations
- Push notifications for parking status changes

### Machine Learning Predictions
- GRU neural networks for time-series occupancy forecasting
- Random Forest models for pattern analysis
- Historical data analysis for accurate predictions
- Demand forecasting based on events and schedules

### Smart Integration
- Calendar synchronization with .ics file support
- Location-based routing with Google Maps integration
- Travel time calculations from current location
- Apple Sign-In authentication

### Mobile Application
- Native iOS application built with React Native
- Responsive UI with theme support
- Offline-capable data caching
- Bottom tab navigation for easy access

## Architecture

### Frontend Structure (`/Frontend`)

The mobile application is built with React Native and Expo, providing a native iOS experience.

**Core Components:**
- `App.tsx` - Root component with tab navigation and authentication
- `/screens` - Screen components for different app sections
- `/components` - Reusable UI components including ParkingWS for WebSocket connections
- `/theme` - Theming system for consistent styling
- `/app/utils` - Utility modules including LocationContext for GPS services

**Key Features:**
- Location tracking for proximity-based features
- Real-time WebSocket connections for live updates
- Push notification handling with Expo
- Deep linking support for navigation

### Backend Structure (`/Backend`)

The backend is built with Django and provides RESTful APIs with WebSocket support for real-time updates.

**Architecture:**
- Django REST Framework for API endpoints
- Django Channels for WebSocket communication
- PostgreSQL for persistent data storage
- Redis for caching and WebSocket message brokering
- Firebase Admin for push notifications

**Key Responsibilities:**
- User authentication and session management
- Parking data aggregation and distribution
- Real-time WebSocket message broadcasting
- Calendar parsing and event integration
- ML model inference for predictions

### Machine Learning Models (`/Yolo-Weights`)

Computer vision models for automated car detection using YOLO architecture.

## Project Structure

```
Purdue-Parking-App/
├── Backend/
│   ├── my_project/        # Django project settings
│   ├── postgres/          # PostgreSQL configurations
│   ├── redis/             # Redis configurations
│   └── requirements.txt   # Python dependencies
├── Frontend/
│   └── mobile/
│       ├── app/           # App logic and utilities
│       ├── screens/       # Screen components
│       ├── components/    # Reusable UI components
│       ├── theme/         # Theming and styles
│       ├── App.tsx        # Root component
│       ├── package.json   # Node dependencies
│       └── app.config.js  # Expo configuration
├── Yolo-Weights/          # ML model weights
└── cal.ics                # Calendar data
```

## How to Run

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.9+
- PostgreSQL 13+
- Redis 6+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Expo Go app

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd Backend
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/boilerpark
   REDIS_URL=redis://localhost:6379
   SECRET_KEY=your-django-secret-key
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

6. Start Redis server:
   ```bash
   redis-server
   ```

7. Start Django development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to mobile app directory:
   ```bash
   cd Frontend/mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```env
   API_BASE_URL_PROD=http://localhost:8000
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

4. Start Expo development server:
   ```bash
   npx expo start
   ```

5. Run on device/simulator:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## Implementation Details

### Real-Time WebSocket Communication

The `ParkingWS` component maintains a persistent WebSocket connection to the Django Channels backend for instant parking updates. The connection automatically reconnects on failure and handles authentication via JWT tokens.

### ML-Based Predictions

**GRU Models**: Capture temporal patterns in parking usage by analyzing historical occupancy data. The models are trained on time-series data to predict future availability based on time of day, day of week, and special events.

**Random Forest**: Identify key factors affecting occupancy including class schedules, sporting events, weather conditions, and holidays. The ensemble approach provides robust predictions even with incomplete data.

### Calendar Integration

The system parses `.ics` calendar files to predict parking demand based on:
- Class schedules and academic calendar
- Sporting events and campus activities
- University holidays and breaks
- Special events and conferences

This enables proactive notifications and recommendations for optimal parking times.

### Location Services

Uses Expo Location API for:
- Current GPS position tracking
- Travel time calculations to parking garages
- Distance-based sorting of parking options
- Navigation integration with native map apps

## Features in Development

We are actively working on expanding BoilerPark with several major enhancements:

### Apple CarPlay Integration
- Simplified UI optimized for in-vehicle use
- Voice-guided lot selection with minimal driver interaction
- Map-based visual selection for nearby parking options
- Approved parking category entitlement for CarPlay deployment

### Analytics Dashboard
- Demand forecasting by lot, day, and time for parking managers
- Revenue predictions under various scenarios for financial planning
- Congestion spillover analysis to understand system-wide impacts
- Event impact assessments using machine learning models
- Trend summaries and risk alerts for quick decision-making

### Web Application
- Public landing page with app information and features
- Dynamic UI with animations highlighting core functionality
- Full web version of BoilerPark for browser-based access
- Responsive design for desktop and mobile web users

### Cloud Migration
- Moving PostgreSQL and Redis to major cloud providers for improved performance
- Migrating WebSocket server and data handlers from Render to cloud infrastructure
- Enhanced reliability, scalability, and reduced latency

### Mobile App Enhancements
- Redesigned login page matching app's UI/UX style
- Improved map view with custom styling and enhanced pins
- Timed parking duration display for restricted zones
- Comprehensive amenity information for each garage
- Advanced filtering with saved preferences
- Data reliability indicators based on update timestamps
- App Store submission with full Apple compliance

### Advanced Features
- Multi-stop trip planning with parking recommendations
- Notifications for availability, permit expiration, and events
- In-garage maps showing exact parking spot locations
- Model confidence fallback strategies for uncertain predictions
- Calendar-triggered parking suggestions via notifications
- Time-to-fill predictions so users can plan departure times

## Contact

For more information about BoilerPark, please contact the development team through the repository.
