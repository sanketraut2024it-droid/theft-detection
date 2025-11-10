// const mongoose = require("mongoose");
// const captureSchema = new mongoose.Schema({
//   image: String,
//   timestamp: { type: Date, default: Date.now }
// });
// module.exports = mongoose.model("Capture", captureSchema);
// const mongoose = require("mongoose");

// const captureSchema = new mongoose.Schema({
//   image: String,
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model("Capture", captureSchema);
const mongoose = require("mongoose");

const captureSchema = new mongoose.Schema({
  image: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // 👈 add this
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Capture", captureSchema);
