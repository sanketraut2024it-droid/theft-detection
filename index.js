require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const { validationResult } = require("express-validator");
const User = require("./models/User"); 
const Capture = require("./models/Capture"); 
const Face = require("./models/Face");
const ActivityLog = require("./models/ActivityLog");
const fetch = require("node-fetch");
const { requireAuth } = require("./middleware/auth");
const { validateSignup, validateLogin, validateSettings } = require("./utils/validators");
const { findBestMatch, normalizeDescriptor } = require("./utils/faceRecognition");

const app = express();
const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/theftdetection";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(console.error);

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const session = require("express-session");
const nodemailer = require("nodemailer");

// Email configuration from environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER || "youremail@gmail.com",
    pass: process.env.EMAIL_PASS || "your-app-password"
  }
});

app.use(session({
  secret: process.env.SESSION_SECRET || "theftsecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Helper function to log activities
async function logActivity(userId, action, details = "", metadata = {}) {
  try {
    await ActivityLog.create({
      userId,
      action,
      details,
      metadata
    });
  } catch (error) {
    console.error("Activity log error:", error);
  }
}

// Helper function to send email notifications
async function sendEmailAlert(user, capture) {
  if (!user.settings.emailNotifications) return;
  
  const EMAIL_FROM = process.env.EMAIL_USER || "youremail@gmail.com";
  const EMAIL_TO = user.email;
  
  // Determine alert type based on face recognition
  let subject = "🚨 Theft Detection Alert!";
  let alertType = "Unknown Person Detected";
  let alertColor = "#e74c3c";
  
  if (capture.faceRecognized && capture.recognizedFaceName) {
    subject = "✅ Known Person Detected";
    alertType = `Recognized: ${capture.recognizedFaceName}`;
    alertColor = "#27ae60";
    // Don't send alert for recognized faces (optional - can be configured)
    // return;
  } else if (capture.faceDetected) {
    subject = "⚠️ Unknown Person Detected!";
    alertType = "Unknown Person Detected";
    alertColor = "#e67e22";
  } else {
    subject = "🚨 Motion Detected!";
    alertType = "Motion Detected (No face detected)";
  }
  
  const mailOptions = {
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${alertColor};">${alertType}</h2>
        <p>Your theft detection system has detected activity.</p>
        <p><strong>Time:</strong> ${new Date(capture.detectedAt || capture.createdAt).toLocaleString()}</p>
        <p><strong>Motion Confidence:</strong> ${capture.confidence || 'N/A'}%</p>
        ${capture.faceDetected ? `
          <p><strong>Face Detection:</strong> ✅ Face Detected</p>
          ${capture.faceRecognized ? `
            <p><strong>Face Recognition:</strong> ✅ Recognized as: <strong>${capture.recognizedFaceName}</strong></p>
            <p><strong>Match Confidence:</strong> ${capture.faceMatchConfidence || 'N/A'}%</p>
          ` : `
            <p><strong>Face Recognition:</strong> ❌ Unknown Person</p>
          `}
        ` : `
          <p><strong>Face Detection:</strong> ⚠️ No face detected</p>
        `}
        <img src="${capture.image}" alt="Captured Image" style="max-width: 100%; border: 3px solid ${alertColor}; border-radius: 8px; margin: 20px 0;"/>
        <p style="color: #666; font-size: 12px;">This is an automated alert from your theft detection system.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    await Capture.findByIdAndUpdate(capture._id, { isAlertSent: true });
    console.log("✅ Email alert sent to:", EMAIL_TO);
  } catch (error) {
    console.error("❌ Email Error:", error);
  }
}

// Helper function to recognize face in captured image
async function recognizeFace(userId, faceDescriptor) {
  try {
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
      return null;
    }

    // Get all active known faces for this user
    const knownFaces = await Face.find({ 
      userId: userId,
      isActive: true 
    });

    if (knownFaces.length === 0) {
      return null; // No known faces in database
    }

    // Normalize the unknown descriptor
    const normalizedDescriptor = normalizeDescriptor(faceDescriptor);
    if (!normalizedDescriptor) {
      return null;
    }

    // Find best match
    const match = findBestMatch(normalizedDescriptor, knownFaces, 0.6);
    
    if (match) {
      // Update last seen for the recognized face
      await Face.findByIdAndUpdate(match.face._id, { lastSeen: new Date() });
      
      return {
        faceId: match.face._id,
        faceName: match.face.name,
        confidence: match.confidence
      };
    }

    return null; // No match found
  } catch (error) {
    console.error("Face recognition error:", error);
    return null;
  }
}

// ========== PUBLIC ROUTES ==========

app.get("/", (req, res) => {
  const error = req.query.error;
  const success = req.query.success;
  res.render("auth", { error, success });
});

app.post("/signup", validateSignup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("auth", { 
        error: errors.array()[0].msg,
        signupErrors: errors.array()
      });
    }

    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    
    if (existing) {
      return res.render("auth", { error: "User with this email already exists!" });
    }

    const user = new User({ name, email, password });
    await user.save();
    
    await logActivity(user._id, "signup", "New user registration");
    
    req.session.userId = user._id;
    res.redirect("/dashboard?success=Account created successfully!");
  } catch (error) {
    console.error("Signup error:", error);
    res.render("auth", { error: "An error occurred. Please try again." });
  }
});

app.post("/login", validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("auth", { 
        error: errors.array()[0].msg,
        loginErrors: errors.array()
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.render("auth", { error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render("auth", { error: "Invalid email or password" });
    }

    user.lastLogin = new Date();
    await user.save();
    
    await logActivity(user._id, "login", "User logged in");
    
    req.session.userId = user._id;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    res.render("auth", { error: "An error occurred. Please try again." });
  }
});

app.post("/logout", requireAuth, async (req, res) => {
  try {
    await logActivity(req.session.userId, "logout", "User logged out");
    req.session.destroy();
    res.redirect("/?success=Logged out successfully");
  } catch (error) {
    console.error("Logout error:", error);
    res.redirect("/");
  }
});

// ========== PROTECTED ROUTES ==========

app.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const success = req.query.success;
    
    // Get statistics
    const totalCaptures = await Capture.countDocuments({ userId: user._id });
    
    // Get today's date at midnight (UTC) for accurate comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    
    const capturesToday = await Capture.countDocuments({ 
      userId: user._id,
      detectedAt: { $gte: today, $lt: tomorrow }
    });
    
    const lastCapture = await Capture.findOne({ userId: user._id })
      .sort({ detectedAt: -1 });
    
    const recentActivity = await ActivityLog.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name email");

    // Get captures by day for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const capturesByDay = await Capture.aggregate([
      { 
        $match: { 
          userId: user._id,
          detectedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$detectedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.render("dashboard", {
      user,
      success,
      stats: {
        totalCaptures,
        capturesToday,
        lastCapture,
        capturesByDay
      },
      recentActivity
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).render("error", { error: "Error loading dashboard" });
  }
});

app.get("/home", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    res.render("home", { user });
  } catch (error) {
    console.error("Home error:", error);
    res.status(500).render("error", { error: "Error loading page" });
  }
});

app.get("/gallery", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const captures = await Capture.find({ userId: user._id })
      .sort({ detectedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Capture.countDocuments({ userId: user._id });
    const totalPages = Math.ceil(total / limit);

    res.render("gallery", {
      user,
      captures,
      currentPage: page,
      totalPages,
      total
    });
  } catch (error) {
    console.error("Gallery error:", error);
    res.status(500).render("error", { error: "Error fetching images" });
  }
});

app.get("/alerts", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const alerts = await Capture.find({ userId: user._id })
      .sort({ detectedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("image detectedAt confidence isAlertSent createdAt");

    const total = await Capture.countDocuments({ userId: user._id });
    const totalPages = Math.ceil(total / limit);

    res.render("alerts", {
      user,
      alerts,
      currentPage: page,
      totalPages,
      total
    });
  } catch (error) {
    console.error("Alerts error:", error);
    res.status(500).render("error", { error: "Error loading alerts" });
  }
});

app.get("/settings", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const success = req.query.success;
    res.render("settings", { user, success });
  } catch (error) {
    console.error("Settings error:", error);
    res.status(500).render("error", { error: "Error loading settings" });
  }
});

app.post("/settings", requireAuth, validateSettings, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("settings", {
        user: req.user,
        error: errors.array()[0].msg
      });
    }

    const user = req.user;
    const { name, email, emailNotifications, soundAlerts, motionSensitivity, autoDeleteOldImages, imageRetentionDays } = req.body;

    if (name) user.name = name;
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.render("settings", {
          user,
          error: "Email already in use"
        });
      }
      user.email = email;
    }

    // Update settings
    if (emailNotifications !== undefined) user.settings.emailNotifications = emailNotifications === "on";
    if (soundAlerts !== undefined) user.settings.soundAlerts = soundAlerts === "on";
    if (motionSensitivity) user.settings.motionSensitivity = parseInt(motionSensitivity);
    if (autoDeleteOldImages !== undefined) user.settings.autoDeleteOldImages = autoDeleteOldImages === "on";
    if (imageRetentionDays) user.settings.imageRetentionDays = parseInt(imageRetentionDays);

    await user.save();
    
    await logActivity(user._id, "settings_update", "Settings updated", { 
      changes: Object.keys(req.body)
    });

    res.redirect("/settings?success=Settings updated successfully!");
  } catch (error) {
    console.error("Settings update error:", error);
    res.render("settings", {
      user: req.user,
      error: "Error updating settings"
    });
  }
});

// ========== API ROUTES ==========

app.post("/api/send", requireAuth, async (req, res) => {
  try {
    const { image, faceDescriptor, faceConfidence } = req.body;
    const userId = req.session.userId;

    if (!image) {
      return res.status(400).json({ success: false, error: "No image provided" });
    }

    // Automatically save the image with face detection enabled
    // This will use face-api.js descriptor if provided, or try DeepFace if not
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Process face detection (same logic as /api/save)
      const captureData = {
        image,
        userId,
        confidence: faceConfidence ? Math.round(faceConfidence * 100) : null,
        detectedAt: new Date(),
        faceDetected: false,
        faceRecognized: false
      };

      let finalFaceDescriptor = faceDescriptor;

      // If no face descriptor provided, try DeepFace for face detection
      if (!finalFaceDescriptor || !Array.isArray(finalFaceDescriptor) || finalFaceDescriptor.length === 0) {
        const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:5099";
        
        try {
          // First try to detect if there's a face
          const detectRes = await fetch(`${PYTHON_API_URL}/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image })
          });

          if (detectRes.ok) {
            const detectData = await detectRes.json();
            
            if (detectData.success && detectData.faces_detected > 0) {
              console.log(`✅ ${detectData.faces_detected} face(s) detected using DeepFace`);

              if (!captureData.confidence) {
                captureData.confidence = detectData.confidence
                  ? Math.round(detectData.confidence * 100)
                  : 95;
              }
              
              // Now get the face embedding
              const deepFaceRes = await fetch(`${PYTHON_API_URL}/find`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image })
              });

              if (deepFaceRes.ok) {
                const deepFaceData = await deepFaceRes.json();
                
                if (deepFaceData.success && (deepFaceData.descriptor || deepFaceData.embedding)) {
                  let descriptorFromDeepFace = deepFaceData.descriptor || deepFaceData.embedding;
                  if (descriptorFromDeepFace && !Array.isArray(descriptorFromDeepFace) && descriptorFromDeepFace.data) {
                    descriptorFromDeepFace = Array.from(descriptorFromDeepFace.data);
                  }

                  if (Array.isArray(descriptorFromDeepFace) && descriptorFromDeepFace.length > 0) {
                    finalFaceDescriptor = descriptorFromDeepFace;
                    captureData.faceDetected = true;
                    if (!captureData.confidence) {
                      captureData.confidence = 95;
                    }
                    console.log("✅ Face embedding extracted using DeepFace");
                  } else {
                    console.warn("⚠️ DeepFace find endpoint returned empty descriptor");
                  }
                } else if (deepFaceData.success === false) {
                  console.warn("DeepFace find endpoint failed:", deepFaceData.error);
                }
              }
            } else {
              console.log("ℹ️ No face detected in image (DeepFace)");
            }
          }
        } catch (error) {
          console.log("⚠️ DeepFace not available, saving without face detection");
        }
      } else {
        // Face descriptor provided from face-api.js
        captureData.faceDetected = true;
        console.log("✅ Face detected using face-api.js");
      }

      // Recognize face if descriptor available
      if (finalFaceDescriptor && Array.isArray(finalFaceDescriptor) && finalFaceDescriptor.length > 0) {
        captureData.faceDetected = true;
        const recognition = await recognizeFace(userId, finalFaceDescriptor);
        
        if (recognition) {
          captureData.faceRecognized = true;
          captureData.recognizedFaceId = recognition.faceId;
          captureData.recognizedFaceName = recognition.faceName;
          captureData.faceMatchConfidence = recognition.confidence;
          console.log(`✅ Face recognized: ${recognition.faceName} (${recognition.confidence}%)`);
        } else {
          console.log("⚠️ Face detected but not recognized (UNKNOWN PERSON)");
          // This is an unknown face - should trigger alert
        }
      } else {
        // No face detected - this is motion only
        console.log("ℹ️ Motion detected but no face identified");
      }

      // Always save capture (whether face detected or just motion)
      const newCap = new Capture(captureData);
      await newCap.save();
      
      console.log(`✅ Capture saved: ID=${newCap._id}, FaceDetected=${captureData.faceDetected}, FaceRecognized=${captureData.faceRecognized || false}, Time=${new Date().toISOString()}`);
      
      await logActivity(userId, "capture", "New motion detected", {
        captureId: newCap._id,
        faceDetected: captureData.faceDetected,
        faceRecognized: captureData.faceRecognized
      });

      // ALERT SYSTEM: Alert if face doesn't match saved images
      // Alert triggers for:
      // 1. Unknown person (face detected but not recognized)
      // 2. Motion without face (no face detected)
      // No alert for: Known/recognized faces
      
      const shouldAlert = !captureData.faceRecognized;
      
      if (shouldAlert) {
        // This is an unknown person or motion without face - TRIGGER ALERT
        const alertType = captureData.faceDetected 
          ? '🚨 ALERT: Unknown person detected - Face does not match saved images!' 
          : '🚨 ALERT: Motion detected (no face identified)';
        
        console.log(alertType);
        console.log(`   Capture ID: ${newCap._id}`);
        console.log(`   Time: ${new Date().toISOString()}`);
        
        // Mark capture as alert sent
        newCap.isAlertSent = true;
        await newCap.save();
        
        // Send email alert if enabled
        if (user.settings.emailNotifications) {
          try {
            await sendEmailAlert(user, newCap);
            console.log("📧 Email alert sent successfully");
          } catch (emailError) {
            console.error("❌ Email alert failed:", emailError);
          }
        }
        
        // Frontend will check for new captures and show alerts
        console.log("✅ Alert triggered - Frontend will display notification");
      } else {
        // Known person detected - no alert needed
        console.log(`✅ Known person detected: ${captureData.recognizedFaceName}`);
        console.log(`   Status: Face matches saved image - No alert needed`);
      }
      
      // Log for debugging
      console.log(`📊 Capture stats: FaceDetected=${captureData.faceDetected}, FaceRecognized=${captureData.faceRecognized}, ShouldAlert=${shouldAlert}`);

      return res.json({ 
        success: true, 
        message: "Image processed and saved",
        faceDetected: captureData.faceDetected,
        faceRecognized: captureData.faceRecognized,
        recognizedFaceName: captureData.recognizedFaceName || null
      });
    } catch (saveError) {
      console.error("Error processing image:", saveError);
      return res.status(500).json({ success: false, error: "Error processing image" });
    }
  } catch (err) {
    console.error("Error in /api/send:", err);
    res.status(500).json({ success: false, error: "Error processing image" });
  }
});

app.post("/api/save", async (req, res) => {
  try {
    const { image, userId, confidence, faceDescriptor } = req.body;
    
    if (!image) {
      return res.status(400).json({ success: false, error: "No image found" });
    }

    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Initialize capture data
    const captureData = {
      image,
      userId,
      confidence: confidence ? parseInt(confidence) : null,
      detectedAt: new Date(),
      faceDetected: false,
      faceRecognized: false
    };

    let finalFaceDescriptor = faceDescriptor;

    // If no face descriptor provided, try to detect face using DeepFace
    if (!finalFaceDescriptor || !Array.isArray(finalFaceDescriptor) || finalFaceDescriptor.length === 0) {
      const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:5099";
      
      try {
        // Try to get face embedding from DeepFace
        const deepFaceRes = await fetch(`${PYTHON_API_URL}/find`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image })
        });

        if (deepFaceRes.ok) {
          const deepFaceData = await deepFaceRes.json();
          
          if (deepFaceData.success && deepFaceData.descriptor) {
            finalFaceDescriptor = deepFaceData.descriptor || deepFaceData.embedding;
            captureData.faceDetected = true;
            console.log("✅ Face detected using DeepFace");
          }
        }
      } catch (error) {
        console.log("⚠️ DeepFace not available, continuing without face detection");
      }
    }

    // If face descriptor is available (from face-api.js or DeepFace), try to recognize the face
    if (finalFaceDescriptor && Array.isArray(finalFaceDescriptor) && finalFaceDescriptor.length > 0) {
      captureData.faceDetected = true;
      
      // Try to recognize the face
      const recognition = await recognizeFace(userId, finalFaceDescriptor);
      
      if (recognition) {
        captureData.faceRecognized = true;
        captureData.recognizedFaceId = recognition.faceId;
        captureData.recognizedFaceName = recognition.faceName;
        captureData.faceMatchConfidence = recognition.confidence;
        console.log(`✅ Face recognized: ${recognition.faceName} (${recognition.confidence}%)`);
      } else {
        console.log("⚠️ Face detected but not recognized (unknown person)");
      }
    } else {
      console.log("ℹ️ No face detected in image");
    }

    const newCap = new Capture(captureData);
    await newCap.save();
    console.log("✅ Image saved to MongoDB");

    await logActivity(userId, "capture", "New motion detected", {
      captureId: newCap._id,
      confidence,
      faceDetected: captureData.faceDetected,
      faceRecognized: captureData.faceRecognized
    });

    // Send email alert only for unknown faces or if no face detected
    // (Don't send alert for recognized faces - can be configured)
    const shouldAlert = !captureData.faceRecognized; // Alert if face not recognized
    
    if (user.settings.emailNotifications && shouldAlert) {
      await sendEmailAlert(user, newCap);
    }

    res.json({ 
      success: true, 
      message: "Image saved successfully",
      faceDetected: captureData.faceDetected,
      faceRecognized: captureData.faceRecognized,
      recognizedFaceName: captureData.recognizedFaceName || null
    });
  } catch (err) {
    console.error("Error saving image:", err);
    res.status(500).json({ success: false, error: "Error saving image" });
  }
});

app.delete("/api/capture/:id", requireAuth, async (req, res) => {
  try {
    const capture = await Capture.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!capture) {
      return res.status(404).json({ success: false, error: "Capture not found" });
    }

    await Capture.findByIdAndDelete(req.params.id);
    
    await logActivity(req.session.userId, "image_delete", "Image deleted", {
      captureId: req.params.id
    });

    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ success: false, error: "Error deleting image" });
  }
});

// Test endpoint to verify system is working
app.get("/api/test", requireAuth, (req, res) => {
  res.json({ 
    success: true, 
    message: "System is working",
    userId: req.session.userId,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/check-new", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get the latest capture
    const latest = await Capture.findOne({ userId: userId })
      .sort({ detectedAt: -1 });

    if (!latest) {
      // Initialize last check time if no captures exist
      if (!req.session.lastCaptureCheck) {
        req.session.lastCaptureCheck = new Date();
      }
      return res.json({ newCapture: false });
    }

    // Get or initialize last check time
    let lastCheck = req.session.lastCaptureCheck;
    
    // If no last check time, set it to the latest capture time (so we don't alert on old captures)
    if (!lastCheck) {
      req.session.lastCaptureCheck = latest.detectedAt;
      return res.json({ newCapture: false });
    }

    // Convert to Date objects for proper comparison
    const lastCheckDate = new Date(lastCheck);
    const latestDate = new Date(latest.detectedAt);
    
    // Check if there's a new capture (detected after last check)
    if (latestDate > lastCheckDate) {
      req.session.lastCaptureCheck = latest.detectedAt;
      console.log(`✅ New capture detected: ${latestDate.toISOString()}`);
      return res.json({
        newCapture: true,
        capture: {
          id: latest._id,
          detectedAt: latest.detectedAt,
          confidence: latest.confidence,
          faceDetected: latest.faceDetected,
          faceRecognized: latest.faceRecognized,
          recognizedFaceName: latest.recognizedFaceName,
          faceMatchConfidence: latest.faceMatchConfidence,
          isAlertSent: latest.isAlertSent,
          image: latest.image
        }
      });
    }

    res.json({ newCapture: false });
  } catch (error) {
    console.error("Check new error:", error);
    res.status(500).json({ success: false, error: "Error checking for new captures" });
  }
});

app.get("/api/stats", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    // Get today's date at midnight (UTC) for accurate comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    
    const stats = {
      totalCaptures: await Capture.countDocuments({ userId: user._id }),
      capturesToday: await Capture.countDocuments({
        userId: user._id,
        detectedAt: { $gte: today, $lt: tomorrow }
      }),
      capturesThisWeek: await Capture.countDocuments({
        userId: user._id,
        detectedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      capturesThisMonth: await Capture.countDocuments({
        userId: user._id,
        detectedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ success: false, error: "Error fetching statistics" });
  }
});

// ========== FACE RECOGNITION ROUTES ==========

app.get("/faces", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const success = req.query.success;
    const error = req.query.error;
    
    // Only show active faces (not deleted)
    const faces = await Face.find({ userId: user._id, isActive: true })
      .sort({ createdAt: -1 });
    
    res.render("faces", { user, faces, success, error });
  } catch (error) {
    console.error("Faces page error:", error);
    res.status(500).render("error", { error: "Error loading faces page" });
  }
});

app.get("/api/faces", requireAuth, async (req, res) => {
  try {
    const faces = await Face.find({ userId: req.session.userId, isActive: true })
      .select("name description image lastSeen createdAt metadata")
      .sort({ createdAt: -1 });
    
    res.json({ success: true, faces });
  } catch (error) {
    console.error("Get faces error:", error);
    res.status(500).json({ success: false, error: "Error fetching faces" });
  }
});

// Check DeepFace API health
app.get("/api/deepface/health", async (req, res) => {
  try {
    const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:5099";
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Health check timeout')), 5000)
    );
    
    const fetchPromise = fetch(`${PYTHON_API_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (response.ok) {
      const data = await response.json();
      res.json({ 
        success: true, 
        available: true,
        model: data.model,
        detector: data.detector
      });
    } else {
      res.json({ success: false, available: false });
    }
  } catch (error) {
    console.error("DeepFace health check error:", error);
    res.json({ success: false, available: false, error: error.message });
  }
});

app.post("/api/faces", requireAuth, async (req, res) => {
  try {
    const { name, descriptor, image, description, useDeepFace } = req.body;
    
    if (!name || !image) {
      return res.status(400).json({ 
        success: false, 
        error: "Name and image are required" 
      });
    }

    let finalDescriptor = descriptor;
    let faceAnalysis = null;
    let attemptedDeepFace = false;
    let deepFaceError = null;

    // If useDeepFace is true or descriptor is not provided, use DeepFace
    if (useDeepFace || !descriptor) {
      const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:5099";
      attemptedDeepFace = true;

      try {
        // Get face embedding and analysis from DeepFace
        const deepFaceRes = await fetch(`${PYTHON_API_URL}/find`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image })
        });

        if (!deepFaceRes.ok) {
          deepFaceError = `DeepFace server responded with status ${deepFaceRes.status}`;
        } else {
          const deepFaceData = await deepFaceRes.json();
          
          if (deepFaceData.success) {
            let descriptorFromDeepFace = deepFaceData.descriptor || deepFaceData.embedding;

            if (descriptorFromDeepFace && !Array.isArray(descriptorFromDeepFace) && descriptorFromDeepFace.data) {
              descriptorFromDeepFace = Array.from(descriptorFromDeepFace.data);
            }

            if (descriptorFromDeepFace && Array.isArray(descriptorFromDeepFace) && descriptorFromDeepFace.length > 0) {
              finalDescriptor = descriptorFromDeepFace;
              faceAnalysis = {
                age: deepFaceData.age,
                gender: deepFaceData.gender,
                gender_confidence: deepFaceData.gender_confidence,
                face_region: deepFaceData.face_region
              };
              console.log("✅ DeepFace analysis:", faceAnalysis);
            } else if (deepFaceData.faces_detected === 0) {
              deepFaceError = "DeepFace did not detect any faces in the image. Please recapture with a clearer view of the face.";
            } else {
              deepFaceError = "DeepFace returned an empty descriptor. Trying fallback...";
            }
          } else {
            deepFaceError = deepFaceData.error || "DeepFace reported a failure";
            console.warn("DeepFace analysis failed:", deepFaceError);
          }
        }
      } catch (error) {
        deepFaceError = error.message;
        console.error("DeepFace API error:", error);
      }

      // Fallback: try /represent endpoint if descriptor still missing
      if ((!finalDescriptor || !Array.isArray(finalDescriptor) || finalDescriptor.length === 0) && !deepFaceError) {
        try {
          const representRes = await fetch(`${PYTHON_API_URL}/represent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image })
          });

          if (!representRes.ok) {
            deepFaceError = `DeepFace /represent responded with status ${representRes.status}`;
          } else {
            const representData = await representRes.json();
            if (representData.success) {
              const descriptorFromRepresent = representData.descriptor || representData.embedding;
              if (descriptorFromRepresent && Array.isArray(descriptorFromRepresent) && descriptorFromRepresent.length > 0) {
                finalDescriptor = descriptorFromRepresent;
                console.log("✅ DeepFace /represent fallback succeeded");
              } else {
                deepFaceError = "DeepFace /represent did not return a valid descriptor";
              }
            } else {
              deepFaceError = representData.error || "DeepFace /represent reported a failure";
            }
          }
        } catch (fallbackError) {
          deepFaceError = fallbackError.message;
          console.error("DeepFace /represent error:", fallbackError);
        }
      }
    }

    if (!finalDescriptor || !Array.isArray(finalDescriptor) || finalDescriptor.length === 0) {
      const errorMessage = attemptedDeepFace
        ? `DeepFace could not extract a face descriptor. ${deepFaceError ? deepFaceError : "Please ensure the DeepFace server is running and the face is clearly visible in the capture."}`
        : "Face descriptor is required. Please ensure a face is detected in the image.";

      return res.status(400).json({ 
        success: false, 
        error: errorMessage 
      });
    }

    // Normalize descriptor
    const normalizedDescriptor = normalizeDescriptor(finalDescriptor);
    if (!normalizedDescriptor) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid face descriptor format" 
      });
    }

    // Check if face with same name already exists
    const existing = await Face.findOne({ 
      userId: req.session.userId,
      name: name.trim(),
      isActive: true
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: "Face with this name already exists" 
      });
    }

    const newFace = new Face({
      userId: req.session.userId,
      name: name.trim(),
      descriptor: normalizedDescriptor,
      image: image,
      description: description || "",
      metadata: faceAnalysis || {}
    });

    await newFace.save();
    
    await logActivity(req.session.userId, "face_add", "Face added to database", {
      faceId: newFace._id,
      faceName: newFace.name,
      method: useDeepFace ? "DeepFace" : "face-api.js"
    });

    res.json({ 
      success: true, 
      message: "Face added successfully",
      face: {
        id: newFace._id,
        name: newFace.name,
        image: newFace.image,
        analysis: faceAnalysis
      }
    });
  } catch (error) {
    console.error("Add face error:", error);
    res.status(500).json({ success: false, error: "Error adding face" });
  }
});

app.delete("/api/faces/:id", requireAuth, async (req, res) => {
  try {
    const face = await Face.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!face) {
      return res.status(404).json({ success: false, error: "Face not found" });
    }

    // Soft delete by setting isActive to false
    face.isActive = false;
    await face.save();
    
    await logActivity(req.session.userId, "face_delete", "Face removed from database", {
      faceId: face._id,
      faceName: face.name
    });

    res.json({ success: true, message: "Face deleted successfully" });
  } catch (error) {
    console.error("Delete face error:", error);
    res.status(500).json({ success: false, error: "Error deleting face" });
  }
});

// ========== ERROR HANDLING ==========

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).render("error", {
    error: process.env.NODE_ENV === "production" 
      ? "An error occurred" 
      : err.message
  });
});

// ========== START SERVER ==========

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});
