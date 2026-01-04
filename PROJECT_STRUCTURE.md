# Project Structure

```
Dairy Sense NEW/
├── backend/                    # Express.js Backend Server
│   ├── config/
│   │   ├── database.js        # PostgreSQL connection
│   │   └── dbSchema.js        # Database schema initialization
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js            # Authentication routes (login/register)
│   │   └── dailyLaneLog.js    # Daily lane log routes (feed/milk)
│   ├── services/
│   │   ├── authService.js     # User authentication logic
│   │   └── dailyLaneLogService.js  # Business logic for daily logs
│   ├── server.js              # Express server entry point
│   ├── package.json           # Backend dependencies
│   └── .env                   # Backend environment variables (create this)
│
├── frontend/                   # React Frontend Application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ScanCow.jsx    # Feed recording component
│   │   │   ├── RecordMilkYield.jsx  # Milk yield recording
│   │   │   ├── LiveTable.jsx  # Dashboard table view
│   │   │   └── ProtectedRoute.jsx   # Auth guard
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx  # Login page
│   │   │   └── Dashboard.jsx    # Main dashboard
│   │   ├── services/
│   │   │   └── api.js         # API client (HTTP requests)
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication context
│   │   ├── config/
│   │   │   └── api.js         # API base URL configuration
│   │   ├── utils/
│   │   │   └── feedSuggestions.js  # Feed calculation utilities
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # React entry point
│   ├── index.html             # HTML entry point
│   ├── vite.config.js         # Vite configuration
│   ├── package.json           # Frontend dependencies
│   └── .env                   # Frontend environment variables (optional)
│
├── README.md                   # Main documentation
├── SETUP_GUIDE.md             # Detailed setup instructions
├── RUN.md                     # Quick run guide
└── .gitignore                 # Git ignore rules
```

## Key Points

- **Backend**: All business logic, database access, authentication
- **Frontend**: UI only, makes HTTP requests to backend API
- **Database**: PostgreSQL managed by Supabase (no manual setup needed)
- **Separation**: Backend and frontend are completely separate projects

