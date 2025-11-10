# DeepFace Integration Setup Guide

This guide will help you set up the DeepFace backend service for enhanced face recognition.

## What is DeepFace?

DeepFace is a lightweight face recognition and facial attribute analysis framework for Python. It provides:
- **More accurate face recognition** using state-of-the-art models (VGG-Face, Facenet, ArcFace, etc.)
- **Facial attribute analysis**: Age, Gender, Emotion, and Race detection
- **Multiple face detection backends**: OpenCV, SSD, Dlib, MTCNN, RetinaFace, MediaPipe, etc.

## Prerequisites

1. **Python 3.8+** installed on your system
2. **pip** (Python package manager)
3. **Node.js** application running (already set up)

## Installation Steps

### 1. Install Python Dependencies

Navigate to the project directory and install the required Python packages:

```bash
pip install -r requirements.txt
```

**Note**: This will install:
- Flask (web framework)
- DeepFace (face recognition library)
- OpenCV (computer vision)
- TensorFlow (deep learning framework)
- And other dependencies

**Installation may take 10-15 minutes** as it downloads large model files.

### 2. Start the DeepFace API Server

Run the Python backend service:

```bash
python python_api.py
```

Or on Windows:
```bash
python python_api.py
```

The server will start on `http://127.0.0.1:5099` by default.

You should see:
```
🚀 DeepFace API Server starting on port 5099
📦 Using model: VGG-Face
🔍 Using detector: opencv
✅ DeepFace API Server ready!
📡 Listening on http://0.0.0.0:5099
```

### 3. Configure Environment Variables (Optional)

You can customize the DeepFace configuration by setting environment variables:

```bash
# Windows PowerShell
$env:PYTHON_API_PORT="5099"
$env:DEEPFACE_MODEL="VGG-Face"  # Options: VGG-Face, Facenet, OpenFace, DeepFace, DeepID, ArcFace, Dlib, SFace
$env:DETECTOR_BACKEND="opencv"   # Options: opencv, ssd, dlib, mtcnn, retinaface, mediapipe, yunet, yolo, centerface

# Linux/Mac
export PYTHON_API_PORT=5099
export DEEPFACE_MODEL=VGG-Face
export DETECTOR_BACKEND=opencv
```

### 4. Verify the Setup

1. Open your browser and go to: `http://localhost:5099/health`
2. You should see a JSON response with the server status

Or check from the Node.js app:
- The faces page will automatically check if DeepFace is available
- You'll see a checkbox option to "Use DeepFace for enhanced recognition"

## Usage

### In the Faces Module

1. Go to the **Faces** page in your application
2. Check the box: **"Use DeepFace for enhanced recognition"**
3. Capture a face using the camera
4. Fill in the person's name and description
5. Click **"Save to Database"**

When using DeepFace:
- The system will automatically extract face embeddings
- It will analyze age, gender, and other attributes
- More accurate face recognition compared to face-api.js

### API Endpoints

The DeepFace backend provides these endpoints:

- `GET /health` - Health check
- `POST /detect` - Detect faces in an image
- `POST /analyze` - Analyze facial attributes (age, gender, emotion, race)
- `POST /represent` - Get face embedding/descriptor
- `POST /verify` - Verify if two faces match
- `POST /find` - Find faces with full analysis (detection + embedding + analysis)

## Model Options

### Face Recognition Models

- **VGG-Face** (default) - Good balance of accuracy and speed
- **Facenet** - High accuracy, 128-dimensional embeddings
- **ArcFace** - State-of-the-art accuracy
- **OpenFace** - Fast and lightweight
- **DeepFace** - Good accuracy
- **DeepID** - Fast recognition
- **Dlib** - Classic approach
- **SFace** - Modern and accurate

### Face Detection Backends

- **opencv** (default) - Fast, good for most cases
- **ssd** - More accurate detection
- **retinaface** - Very accurate, slower
- **mtcnn** - Good balance
- **mediapipe** - Fast, good for real-time
- **yunet** - Fast and accurate
- **yolo** - Very fast detection
- **centerface** - Good accuracy

## Troubleshooting

### Issue: "DeepFace API unavailable"

**Solution**: Make sure the Python server is running:
```bash
python python_api.py
```

### Issue: Import errors or missing modules

**Solution**: Reinstall dependencies:
```bash
pip install -r requirements.txt --upgrade
```

### Issue: Models not downloading

**Solution**: DeepFace downloads models on first use. Make sure you have:
- Internet connection
- Sufficient disk space (models can be 100-500MB each)
- Wait for the first request to complete (may take a few minutes)

### Issue: Slow performance

**Solutions**:
1. Use a faster detector backend (e.g., `opencv` or `mediapipe`)
2. Use a lighter model (e.g., `OpenFace` instead of `VGG-Face`)
3. Ensure you have a GPU for faster processing (optional)

### Issue: Port already in use

**Solution**: Change the port:
```bash
# Windows PowerShell
$env:PYTHON_API_PORT="5100"
python python_api.py

# Or edit python_api.py and change PORT = 5100
```

## Running Both Services

You need to run both services simultaneously:

1. **Terminal 1** - Node.js server:
```bash
npm start
```

2. **Terminal 2** - Python DeepFace server:
```bash
python python_api.py
```

## Performance Notes

- **First request**: May take 30-60 seconds as models download
- **Subsequent requests**: Usually 1-3 seconds per face
- **GPU acceleration**: If you have a compatible GPU, DeepFace will use it automatically for faster processing

## References

- DeepFace GitHub: https://github.com/serengil/deepface
- DeepFace Documentation: https://github.com/serengil/deepface#documentation
- Flask Documentation: https://flask.palletsprojects.com/

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify both servers are running
3. Check network connectivity
4. Review the DeepFace documentation

