const mongoose = require("mongoose");
const theftSchema = new mongoose.Schema({
  name: String,
  location: String,
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Theft", theftSchema);
