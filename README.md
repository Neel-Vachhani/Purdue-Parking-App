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
Location: `Backend/`

## Getting Started
From the backend cd into my_project
   ```
   cd Backend
   cd my_project
   ```
Install Dependencies
   ```
   pip install requirements.txt
   ```
Start the server
   ```
   python manage.py runserve
   ```

### Frontend Development
1. Navigate to the frontend directory:
   ```
   cd Frontend/mobile
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npx expo start
   ```
