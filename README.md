# Purdue-Parking-App
Purdue Parking App Project for Purdue CS 307

## Project Structure

### Frontend (React Native with Expo)
Location: `Frontend/mobile/`
```
Frontend/mobile/
├── App.tsx                    # Main app component
├── app.json                   # Expo configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
├── assets/                    # Images, icons, etc.
└── app/                       # Main application code
    ├── components/            # Reusable UI components
    │   └── Parking/          # Parking-specific components
    ├── screens/              # Screen components
    │   └── Parking/          # Parking-specific screens
    ├── navigation/           # Navigation setup (future)
    ├── data/                 # Data layer (API, models)
    │   └── parking/          # Parking data logic
    ├── store/                # State management
    ├── theme/                # Styling and theming
    └── utils/                # Utility functions
```

### Backend
Location: `Backend/my_project/`

The backend API is built with Python Django and provides the server-side functionality for the parking app.

## Getting Started

### Frontend Development
1. Navigate to the frontend directory:
```bash
   cd Frontend/mobile
```
2. Install dependencies:
```bash
   npm install --legacy-peer-deps
```
3. Start the development server:
```bash
   npx expo start
```

### Backend Development
1. Navigate to the backend directory:
```bash
   cd Backend/my_project
```
2. Install Python dependencies:
```bash
   pip install -r backend_api_requirements.txt
```
3. Start the backend server on port 7500:
```bash
   python manage.py runserver 7500
```
   The backend will be accessible at `http://localhost:7500`

## Requirements
- **Frontend**: Node.js and npm/yarn
- **Backend**: Python 3.x and pip