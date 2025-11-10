const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  action: {
    type: String,
    required: true,
    enum: ['capture', 'login', 'logout', 'settings_update', 'image_delete', 'signup']
  },
  details: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);

