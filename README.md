# Theft Detection System

A real-time theft detection system built with Node.js, Express, MongoDB, and camera integration.

## Features

### Core Features
- 🔐 **Secure Authentication**: Password hashing with bcrypt, session management
- 📸 **Real-time Camera Monitoring**: Live video feed with motion detection
- 🚨 **Motion Detection Alerts**: Instant notifications for detected motion
- 📧 **Email Notifications**: Professional HTML email alerts
- 📷 **Image Gallery**: View all captured images with pagination
- 🎵 **Audio Alerts**: Sound notifications for motion detection

### Professional Features
- 📊 **Dashboard**: Statistics, charts, and activity overview
- ⚙️ **Settings Page**: Customizable preferences (notifications, sensitivity, storage)
- 🚨 **Alert History**: Complete alert log with status tracking
- 🗑️ **Image Management**: Delete unwanted captures
- 📝 **Activity Logging**: Track all user actions
- ✅ **Input Validation**: Secure form validation with real-time feedback
- 🎨 **Modern UI/UX**: Professional design with responsive layout
- 📱 **Mobile Responsive**: Works perfectly on all devices
- 🔒 **Protected Routes**: Authentication middleware for security

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas)
- Python API (for motion detection) - Optional, runs on port 5099
- Gmail account with App Password (for email alerts)

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your configuration:
     ```env
     PORT=8080
     MONGODB_URI=mongodb://127.0.0.1:27017/theftdetection
     SESSION_SECRET=your-secret-key-here
     EMAIL_USER=your-email@gmail.com
     EMAIL_PASS=your-app-password
     ALERT_EMAIL=recipient-email@gmail.com
     ```

4. Start MongoDB:
   - Make sure MongoDB is running on your system
   - Default: `mongodb://127.0.0.1:27017/theftdetection`

5. (Optional) Start Python API for motion detection:
   - The Python API should be running on port 5099
   - Update `PYTHON_API_URL` in `.env` if different

## Running the Application

### Development Mode

```bash
npm start
```

or

```bash
npm run dev
```

The server will start on `http://localhost:8080` (or the port specified in `.env`)

## Usage

1. **Sign Up / Login**: 
   - Visit `http://localhost:8080`
   - Create an account or login with existing credentials

2. **Start Monitoring**:
   - After login, you'll be redirected to the home page
   - Grant camera permissions when prompted
   - The system will start monitoring and capturing images

3. **View Gallery**:
   - Click "View Gallery" to see all captured images
   - Images are stored in MongoDB

4. **Email Alerts**:
   - When motion is detected, an email alert is sent to the configured email address

## Project Structure

```
theft-detection/
├── models/
│   ├── User.js          # User model with password hashing
│   ├── Capture.js       # Image capture model
│   └── ActivityLog.js   # Activity logging model
├── views/
│   ├── auth.ejs         # Login/Signup page
│   ├── dashboard.ejs    # User dashboard with statistics
│   ├── home.ejs         # Main monitoring page
│   ├── gallery.ejs      # Image gallery with pagination
│   ├── alerts.ejs       # Alert history page
│   ├── settings.ejs    # User settings page
│   └── error.ejs        # Error page
├── middleware/
│   └── auth.js          # Authentication middleware
├── utils/
│   └── validators.js    # Input validation rules
├── public/
│   ├── script.js        # Frontend JavaScript
│   ├── style.css        # Professional styles
│   └── sound/
│       └── alert.mp3    # Alert sound
├── index.js             # Main server file
├── package.json         # Dependencies
├── README.md            # Documentation
├── FEATURES.md          # Detailed feature list
└── .env                 # Environment variables (create from .env.example)
```

## Configuration

### Gmail App Password Setup

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Generate an app password for "Mail"
5. Use this password in `EMAIL_PASS` (not your regular password)

### MongoDB Setup

**Local MongoDB:**
- Install MongoDB locally
- Start MongoDB service
- Use: `mongodb://127.0.0.1:27017/theftdetection`

**MongoDB Atlas (Cloud):**
- Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Get connection string
- Update `MONGODB_URI` in `.env`

## API Endpoints

### Public Routes
- `GET /` - Login/Signup page
- `POST /signup` - User registration (with validation)
- `POST /login` - User authentication (with validation)
- `POST /logout` - User logout

### Protected Routes
- `GET /dashboard` - User dashboard with statistics
- `GET /home` - Main monitoring page
- `GET /gallery` - Image gallery with pagination
- `GET /alerts` - Alert history page
- `GET /settings` - Settings page
- `POST /settings` - Update user settings

### API Endpoints
- `POST /api/send` - Send image to Python API
- `POST /api/save` - Save captured image
- `GET /api/check-new` - Check for new captures
- `GET /api/stats` - Get user statistics
- `DELETE /api/capture/:id` - Delete a capture

## Deployment

### For Production:

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `SESSION_SECRET`
3. Configure secure MongoDB connection
4. Set up HTTPS for secure cookies
5. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start index.js --name theft-detection
   pm2 save
   pm2 startup
   ```

### Deployment Platforms:

- **Heroku**: Add `Procfile` with `web: node index.js`
- **Railway**: Auto-detects Node.js apps
- **Render**: Connect GitHub repo
- **Vercel**: Configure for Node.js

## Troubleshooting

- **MongoDB Connection Error**: Ensure MongoDB is running
- **Camera Not Working**: Check browser permissions
- **Email Not Sending**: Verify Gmail App Password
- **Python API Error**: Ensure Python API is running on port 5099

## License

ISC

## Support

For issues or questions, check the configuration in `.env` and ensure all services are running properly.

