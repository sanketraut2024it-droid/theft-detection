const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  image: { type: String, required: true }, // base64 image
  timestamp: { type: Date, default: Date.now },
  detected: { type: Boolean, default: false }
});

module.exports = mongoose.model("Alert", alertSchema);

