const mongoose = require("mongoose");

const faceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  descriptor: {
    type: [Number], // Face descriptor/encoding array
    required: true
  },
  image: {
    type: String, // Base64 image of the face
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Index for faster face matching queries
faceSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model("Face", faceSchema);

