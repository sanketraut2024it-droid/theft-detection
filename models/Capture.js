const mongoose = require("mongoose");

const captureSchema = new mongoose.Schema({
  image: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true,
    index: true
  },
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100
  },
  location: String,
  notes: String,
  isAlertSent: {
    type: Boolean,
    default: false
  },
  faceDetected: {
    type: Boolean,
    default: false
  },
  faceRecognized: {
    type: Boolean,
    default: false
  },
  recognizedFaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Face"
  },
  recognizedFaceName: {
    type: String
  },
  faceMatchConfidence: {
    type: Number,
    min: 0,
    max: 100
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for faster queries
captureSchema.index({ userId: 1, createdAt: -1 });
captureSchema.index({ detectedAt: -1 });

module.exports = mongoose.model("Capture", captureSchema);

