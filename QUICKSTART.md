# Quick Start Guide

## Make It Live in 5 Steps

### 1. Install Dependencies (if not already done)
```bash
npm install
```

### 2. Set Up Environment Variables
Copy `.env.example` to `.env` and update these values:
```env
PORT=8080
MONGODB_URI=mongodb://127.0.0.1:27017/theftdetection
SESSION_SECRET=change-this-to-random-string
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
ALERT_EMAIL=recipient-email@gmail.com
```

### 3. Start MongoDB
Make sure MongoDB is running:
- **Windows**: Check if MongoDB service is running
- **Mac/Linux**: `sudo systemctl start mongod` or `brew services start mongodb-community`

### 4. Start the Server
```bash
npm start
```

### 5. Access the Application
Open your browser and go to: `http://localhost:8080`

## What's Changed?

✅ **Project Structure**: Files reorganized into proper folders (models/, views/, public/)
✅ **Environment Variables**: Configuration now uses .env file
✅ **Production Ready**: Added proper error handling and security
✅ **Start Script**: Added npm start command
✅ **Documentation**: Full README with deployment instructions

## Making It Publicly Accessible

### Option 1: Use ngrok (Quick Testing)
```bash
npm install -g ngrok
ngrok http 8080
```

### Option 2: Deploy to Cloud Platform
- **Heroku**: `heroku create` → `git push heroku main`
- **Railway**: Connect GitHub repo
- **Render**: New Web Service → Connect repo
- **Vercel**: Import project

### Option 3: VPS/Server
1. Set up server (Ubuntu/Debian)
2. Install Node.js, MongoDB
3. Use PM2: `pm2 start index.js`
4. Configure reverse proxy (Nginx)
5. Set up SSL (Let's Encrypt)

## Troubleshooting

- **Port already in use**: Change PORT in .env
- **MongoDB connection failed**: Ensure MongoDB is running
- **Email not working**: Verify Gmail App Password
- **Camera not working**: Check browser permissions

## Next Steps

1. Configure your email settings in `.env`
2. Test the camera access
3. Set up Python API for motion detection (optional)
4. Deploy to your preferred platform

Your theft detection system is now ready to go live! 🚀

