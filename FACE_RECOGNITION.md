# Face Recognition Feature

## Overview

The theft detection system now includes comprehensive face recognition functionality that allows you to:

1. **Add known faces** to the database
2. **Automatically recognize** faces in captured images
3. **Send alerts only** for unknown/unrecognized faces
4. **Track face recognition** status for all captures

## How It Works

### 1. Face Detection
- Uses **face-api.js** library for real-time face detection
- Detects faces in video stream using TinyFaceDetector
- Extracts face descriptors (128-dimensional vectors) for recognition

### 2. Face Recognition
- Compares detected faces against known faces in database
- Uses Euclidean distance for matching
- Confidence threshold set to 0.6 (60% similarity required)
- Normalizes face descriptors for better matching accuracy

### 3. Alert System
- **Known faces**: No alert sent (configurable)
- **Unknown faces**: Alert sent immediately
- **No face detected**: Regular motion alert sent

## Adding Faces to Database

### Step 1: Go to Face Management Page
1. Navigate to **"Faces"** in the navigation menu
2. You'll see the face management interface

### Step 2: Capture Face
1. Ensure your camera is enabled
2. Wait for face detection models to load
3. Position the person in front of the camera
4. Click **"📸 Capture Face"** button
5. System will detect and capture the face

### Step 3: Add Face Details
1. Enter the person's **name** (required)
2. Add optional **description** or notes
3. Click **"💾 Save to Database"**

### Step 4: Verify
- Face will appear in the "Known Faces" section
- Face is now available for recognition

## Face Recognition Process

### During Monitoring

1. **Face Detection**: System continuously detects faces in video stream
2. **Descriptor Extraction**: Face descriptor (128-D vector) is extracted
3. **Database Matching**: System compares against all known faces
4. **Recognition Result**: 
   - **Match found**: Person is recognized (no alert)
   - **No match**: Unknown person detected (alert sent)

### Recognition Accuracy

- **Matching Algorithm**: Euclidean distance
- **Threshold**: 0.6 (60% similarity)
- **Confidence Score**: 0-100% displayed for matches
- **Normalization**: Face descriptors are normalized for better matching

## API Endpoints

### Get All Faces
```
GET /api/faces
```
Returns list of all known faces for the current user.

### Add Face
```
POST /api/faces
Body: {
  name: string,
  descriptor: number[],
  image: string (base64),
  description?: string
}
```

### Delete Face
```
DELETE /api/faces/:id
```
Soft deletes a face from the database.

## Database Schema

### Face Model
```javascript
{
  userId: ObjectId,
  name: String,
  descriptor: [Number], // 128-dimensional face vector
  image: String, // Base64 image
  description: String,
  isActive: Boolean,
  createdAt: Date,
  lastSeen: Date
}
```

### Capture Model (Updated)
```javascript
{
  // ... existing fields
  faceDetected: Boolean,
  faceRecognized: Boolean,
  recognizedFaceId: ObjectId,
  recognizedFaceName: String,
  faceMatchConfidence: Number
}
```

## Technical Details

### Face Detection Library
- **Library**: face-api.js (v0.22.2)
- **Model**: TinyFaceDetector
- **Landmarks**: 68-point face landmarks
- **Descriptor**: 128-dimensional face recognition vector

### Models Loading
- Models are loaded from jsdelivr CDN
- Models automatically downloaded on first use
- Cached in browser for faster subsequent loads

### Performance
- **Detection Speed**: ~30-60 FPS (depending on hardware)
- **Recognition Speed**: < 100ms per face
- **Memory Usage**: ~50MB for models

## Configuration

### Face Recognition Settings
- **Matching Threshold**: 0.6 (configured in `utils/faceRecognition.js`)
- **Alert on Known Faces**: Currently disabled (only alerts on unknown)
- **Min Confidence**: 60% required for recognition

### Adjusting Recognition Sensitivity

Edit `utils/faceRecognition.js`:
```javascript
const match = findBestMatch(normalizedDescriptor, knownFaces, 0.6);
// Change 0.6 to lower value (e.g., 0.5) for more lenient matching
// Change to higher value (e.g., 0.7) for stricter matching
```

## Troubleshooting

### Face Not Detected
- Ensure good lighting
- Face should be clearly visible
- Camera should have sufficient resolution
- Try adjusting camera angle

### Face Not Recognized (False Negative)
- Ensure face was captured clearly
- Try adding multiple samples of the same person
- Check matching threshold settings
- Verify face descriptor was saved correctly

### Wrong Person Recognized (False Positive)
- Increase matching threshold (e.g., to 0.7)
- Add more samples of the correct person
- Verify known faces in database

### Models Not Loading
- Check internet connection (models loaded from CDN)
- Try refreshing the page
- Check browser console for errors
- Models are cached after first load

## Best Practices

1. **Add Multiple Samples**: Add 2-3 different angles/expressions per person
2. **Good Lighting**: Ensure consistent, good lighting when capturing faces
3. **Clear Images**: Use high-quality images with clear face visibility
4. **Regular Updates**: Update face database as people's appearance changes
5. **Monitor Recognition**: Review recognition results regularly

## Future Enhancements

- [ ] Multiple face samples per person
- [ ] Face learning from captures
- [ ] Recognition accuracy statistics
- [ ] Face grouping and categorization
- [ ] Advanced recognition algorithms
- [ ] Real-time face tracking
- [ ] Face mask detection

## Security & Privacy

- Face descriptors are stored securely in database
- Face images are stored as base64 strings
- Only user who added face can see/delete it
- Face recognition happens locally in browser
- Descriptors are sent to server only for matching

## Support

For issues or questions:
1. Check browser console for errors
2. Verify models are loading correctly
3. Ensure camera permissions are granted
4. Check face database for duplicate names
5. Review recognition threshold settings

