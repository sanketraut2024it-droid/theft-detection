// ============================================
// NEW CAPTURE MODEL - Direct Continuous Capture
// Uses continuous monitoring with direct video access
// ============================================

console.log("🚀 NEW CAPTURE MODEL - Initializing...");

// ============================================
// GLOBAL STATE
// ============================================

let videoElement = null;
let captureTimer = null;
let captureCounter = 0;
let isProcessing = false;
let lastCaptureTime = 0;
const CAPTURE_DELAY = 5000; // 5 seconds

// Face detection
let faceModelsReady = false;
let faceDetectionActive = false;

// ============================================
// INITIALIZATION - NEW APPROACH
// ============================================

// Wait for page to fully load
window.addEventListener('load', function() {
  console.log("📋 Page loaded, starting capture system...");
  setTimeout(initCaptureSystem, 1000);
});

// Also try immediately if already loaded
if (document.readyState === 'complete') {
  setTimeout(initCaptureSystem, 1000);
}

function initCaptureSystem() {
  console.log("🔍 Step 1: Looking for video element...");
  
  // Try multiple ways to find video
  videoElement = document.getElementById("cam");
  
  if (!videoElement) {
    console.error("❌ Video element not found! Retrying in 2 seconds...");
    setTimeout(initCaptureSystem, 2000);
    return;
  }
  
  console.log("✅ Video element found!");
  
  // Start camera stream
  console.log("🔍 Step 2: Requesting camera access...");
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("❌ Camera API not available!");
    alert("Camera API not available in this browser!");
    return;
  }
  
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      width: { ideal: 640 },
      height: { ideal: 480 }
    } 
  })
  .then(function(stream) {
    console.log("✅ Camera stream obtained!");
    videoElement.srcObject = stream;
    
    // Wait for video to be ready
    videoElement.addEventListener('loadedmetadata', function() {
      console.log(`✅ Video metadata loaded: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
      startContinuousCapture();
    }, { once: true });
    
    // Also try after delay
    setTimeout(function() {
      if (videoElement.videoWidth > 0) {
        console.log(`✅ Video ready (delayed check): ${videoElement.videoWidth}x${videoElement.videoHeight}`);
        startContinuousCapture();
      }
    }, 2000);
  })
  .catch(function(error) {
    console.error("❌ Camera error:", error);
    alert("Camera error: " + error.message);
  });
  
  // Load face detection models in background
  loadFaceModels();
}

// ============================================
// CONTINUOUS CAPTURE SYSTEM - NEW MODEL
// ============================================

function startContinuousCapture() {
  if (captureTimer) {
    console.log("ℹ️ Capture already running");
    return;
  }
  
  console.log("🚀 Starting face detection monitoring...");
  console.log("   Will capture images ONLY when faces are detected");
  
  // Check for faces every 2 seconds
  captureTimer = setInterval(function() {
    checkForFaceAndCapture();
  }, 2000);
  
  console.log("✅ Face detection monitoring started!");
}

function stopContinuousCapture() {
  if (captureTimer) {
    clearInterval(captureTimer);
    captureTimer = null;
    console.log("⏹️ Capture stopped");
  }
}

// Check for face and capture if detected
async function checkForFaceAndCapture() {
  // Prevent overlapping
  if (isProcessing) {
    return;
  }
  
  // Check video is ready
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return;
  }
  
  // Check if face detection models are ready
  if (!faceModelsReady || !faceDetectionActive) {
    // If models not ready, try to detect anyway (server will use DeepFace)
    // But only capture occasionally to avoid too many captures
    const timeSinceLastCapture = Date.now() - lastCaptureTime;
    if (timeSinceLastCapture < 10000) { // Wait at least 10 seconds between captures without face detection
      return;
    }
  }
  
  // Try to detect face first
  let faceInfo = null;
  
  if (faceModelsReady && faceDetectionActive) {
    try {
      faceInfo = await detectFaceNow();
    } catch (err) {
      console.warn("Face detection error:", err);
    }
  }
  
  // ONLY capture if face is detected AND confidence >= 90%
  if (!faceInfo || !faceInfo.descriptor) {
    // No face detected - don't capture
    return;
  }
  
  // Check confidence level - only capture if confidence >= 90%
  const confidencePercent = faceInfo.confidence * 100;
  const CONFIDENCE_THRESHOLD = 90; // 90% confidence required
  
  if (confidencePercent < CONFIDENCE_THRESHOLD) {
    // Confidence too low - don't capture
    console.log(`   ⏳ Face detected but confidence too low: ${Math.round(confidencePercent)}% (need ${CONFIDENCE_THRESHOLD}%)`);
    return;
  }
  
  // Face detected with 90%+ confidence! Capture and save to gallery
  console.log(`👤 FACE DETECTED! Confidence: ${Math.round(confidencePercent)}% - Capturing image...`);
  captureImageWithFace(faceInfo);
}

// Capture image when face is detected with 90%+ confidence
function captureImageWithFace(faceInfo) {
  // Prevent overlapping captures
  if (isProcessing) {
    return;
  }
  
  // Check video is ready
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return;
  }
  
  // Throttle captures - don't capture too frequently (at least 3 seconds apart)
  const timeSinceLastCapture = Date.now() - lastCaptureTime;
  if (timeSinceLastCapture < 3000) {
    return;
  }
  
  isProcessing = true;
  captureCounter++;
  const now = Date.now();
  
  const confidencePercent = Math.round(faceInfo.confidence * 100);
  console.log(`📸 CAPTURING IMAGE #${captureCounter} (Confidence: ${confidencePercent}%) at ${new Date().toLocaleTimeString()}`);
  
  try {
    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    
    // Draw video frame to canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 image
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
    const imageSizeKB = Math.round(imageBase64.length / 1024);
    
    console.log(`   📷 Image size: ${imageSizeKB}KB`);
    console.log(`   👤 Face confidence: ${confidencePercent}% (threshold: 90%)`);
    
    // Prepare data with face descriptor
    const dataToSend = {
      image: imageBase64,
      faceDescriptor: faceInfo.descriptor,
      faceConfidence: faceInfo.confidence
    };
    
    // Send to server to save in gallery
    console.log("   📤 Saving to database and gallery...");
    
    // Store faceInfo for use in the callback
    const currentFaceInfo = faceInfo;
    
    fetch("/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dataToSend)
    })
    .then(function(response) {
      if (!response.ok) {
        return response.text().then(function(text) {
          throw new Error(`Server error ${response.status}: ${text}`);
        });
      }
      return response.json();
    })
    .then(function(result) {
      if (result.success) {
        // Check result and handle accordingly
        if (result.faceRecognized && result.recognizedFaceName) {
          // Known person detected - save image, no alert
          console.log(`   ✅ RECOGNIZED: ${result.recognizedFaceName}`);
          console.log(`   📸 Image saved to database and gallery`);
          console.log(`   ℹ️ No alert needed - Known person`);
        } else if (result.faceDetected) {
          // Unknown person detected - save image AND send alert
          console.log(`   ⚠️ UNKNOWN PERSON DETECTED!`);
          console.log(`   📸 Image saved to database and gallery`);
          console.log(`   🚨 ALERT SENT - Unknown person detected!`);
          console.log(`   📧 Email alert sent (if enabled)`);
          console.log(`   🔔 Browser notification will be shown`);
        } else {
          // Face detected but recognition failed
          console.log(`   ℹ️ Face detected`);
          console.log(`   📸 Image saved to database and gallery`);
        }
        console.log(`   ✅ Image #${captureCounter} saved to database and gallery`);
        
        // Update the captured image display on monitoring page for unknown faces only
        if (!result.faceRecognized) {
          updateCapturedImageDisplay(imageBase64, result, currentFaceInfo);
        } else {
          console.log('   ℹ️ Known person detected - skipping live display update');
        }
      } else {
        throw new Error(result.error || "Unknown error");
      }
    })
    .catch(function(error) {
      console.error(`   ❌ Error saving to gallery: ${error.message}`);
    })
    .finally(function() {
      isProcessing = false;
      lastCaptureTime = now;
    });
    
  } catch (error) {
    console.error(`❌ Capture #${captureCounter} failed:`, error);
    isProcessing = false;
  }
}

// ============================================
// FACE DETECTION - SAME MODEL AS FACES PAGE
// ============================================

// Wait for face-api.js to be loaded (same as faces.ejs)
async function waitForFaceAPI() {
  let attempts = 0;
  const maxAttempts = 100; // 10 seconds max wait
  
  while (typeof faceapi === 'undefined' && attempts < maxAttempts) {
    await new Promise(function(resolve) { setTimeout(resolve, 100); });
    attempts++;
  }
  
  if (typeof faceapi === 'undefined') {
    console.error('face-api.js not loaded after', maxAttempts * 100, 'ms');
    return false;
  }

  // Additional check to ensure faceapi is fully initialized
  if (!faceapi.nets) {
    console.warn('face-api.js loaded but nets not available, waiting...');
    await new Promise(function(resolve) { setTimeout(resolve, 1000); });
    if (!faceapi.nets) {
      console.error('face-api.js nets still not available after additional wait');
      return false;
    }
  }
  
  console.log('✅ face-api.js is ready');
    return true;
}

// Load face detection models (same approach as faces.ejs)
async function loadFaceModels() {
  console.log("📋 Loading face detection models (same as faces page)...");
  
  // First, wait for face-api.js to be available
  const faceAPILoaded = await waitForFaceAPI();
  
  if (!faceAPILoaded) {
    console.error('face-api.js library not loaded');
    return false;
  }
  
  // Try multiple CDN sources (same as faces.ejs)
  const cdnSources = [
    {
      base: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.6.9/model',
      name: 'jsDelivr (vladmandic fork)'
    },
    {
      base: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
      name: 'jsDelivr (original)'
    },
    {
      base: 'https://unpkg.com/face-api.js@0.22.2/weights',
      name: 'unpkg'
    },
    {
      base: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights',
      name: 'GitHub raw'
    }
  ];
  
  for (let i = 0; i < cdnSources.length; i++) {
    const cdnSource = cdnSources[i];
    
    try {
      console.log(`   Trying: ${cdnSource.name} (${cdnSource.base})`);
      
      // Try loading with TinyFaceDetector first (smaller, faster to load) - same as faces.ejs
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(cdnSource.base);
        console.log('   ✅ TinyFaceDetector loaded');
      } catch (tinyError) {
        console.warn('   TinyFaceDetector failed:', tinyError.message);
        throw new Error('TinyFaceDetector failed');
      }
      
      // Load essential models
      const loadPromise = Promise.all([
        faceapi.nets.faceLandmark68Net.loadFromUri(cdnSource.base).catch(function(err) {
          console.warn('   FaceLandmark68Net failed, continuing...');
          return null;
        }),
        faceapi.nets.faceRecognitionNet.loadFromUri(cdnSource.base).catch(function(err) {
          console.warn('   FaceRecognitionNet failed, continuing...');
          return null;
        })
      ]);
      
      const timeoutPromise = new Promise(function(_, reject) {
        setTimeout(function() { reject(new Error('Model loading timeout')); }, 60000);
      });
      
      await Promise.race([loadPromise, timeoutPromise]);
      
      // Try loading optional models (same as faces.ejs)
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(cdnSource.base);
        console.log('   ✅ SSD MobileNet V1 loaded');
      } catch (ssdError) {
        console.warn('   SSD MobileNet V1 failed to load (optional):', ssdError.message);
      }
      
      try {
        await faceapi.nets.ageGenderNet.loadFromUri(cdnSource.base);
        console.log('   ✅ Age/Gender models loaded');
      } catch (ageError) {
        console.warn('   Age/Gender models failed to load (optional):', ageError.message);
      }
      
      faceModelsReady = true;
      faceDetectionActive = true;
      console.log("✅ Face detection models loaded successfully from " + cdnSource.name);
      return true;
      
    } catch (error) {
      console.warn(`   Failed to load from ${cdnSource.name}:`, error.message);
      continue;
    }
  }
  
  console.warn("⚠️ All face detection model sources failed, continuing without face detection");
  return false;
}

// Detect face (same approach as faces.ejs)
async function detectFaceNow() {
  if (!faceModelsReady || !faceDetectionActive || !videoElement) {
    return null;
  }
  
  if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return null;
  }

  try {
    let detections = [];
    
    // Try SSD MobileNet V1 first (same as faces.ejs)
    if (faceapi.nets.ssdMobilenetv1 && faceapi.nets.ssdMobilenetv1.isLoaded) {
      try {
        detections = await faceapi
          .detectAllFaces(videoElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors();
      } catch (ssdError) {
        console.warn('SSD MobileNet detection failed, trying TinyFaceDetector:', ssdError);
      }
    }
    
    // Fallback to TinyFaceDetector if SSD failed or not loaded (same as faces.ejs)
    if (detections.length === 0 && faceapi.nets.tinyFaceDetector && faceapi.nets.tinyFaceDetector.isLoaded) {
      try {
        detections = await faceapi
          .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
      } catch (tinyError) {
        console.warn('TinyFaceDetector failed:', tinyError);
      }
    }

    if (detections.length > 0) {
      const detection = detections[0];
      return {
        descriptor: Array.from(detection.descriptor),
        confidence: detection.detection.score
      };
    }
  } catch (error) {
    console.error("Face detection error:", error);
  }

  return null;
}

// ============================================
// UPDATE CAPTURED IMAGE DISPLAY
// ============================================

function updateCapturedImageDisplay(imageBase64, result, faceInfo) {
  if (result && result.faceRecognized) {
    console.log('   ℹ️ Known person detected - captured image display not updated');
    return;
  }

  // Find or create the captured image display element
  let capturedImageDiv = document.getElementById('capturedImageDisplay');
  
  if (!capturedImageDiv) {
    // Create the display element if it doesn't exist
    capturedImageDiv = document.createElement('div');
    capturedImageDiv.id = 'capturedImageDisplay';
    capturedImageDiv.style.cssText = 'margin: 1rem 0; padding: 1rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
    
    // Find where to insert it (after faceInfo or before status)
    const statusDiv = document.getElementById('status');
    if (statusDiv && statusDiv.parentNode) {
      statusDiv.parentNode.insertBefore(capturedImageDiv, statusDiv);
    } else {
      // Fallback: insert after video
      const videoContainer = document.getElementById('cam');
      if (videoContainer && videoContainer.parentNode) {
        videoContainer.parentNode.appendChild(capturedImageDiv);
      }
    }
  }
  
  // Show the display
  capturedImageDiv.style.display = 'block';
  
  // Update the display
  let statusText = '';
  let statusColor = '#667eea';
  
  if (result.faceRecognized && result.recognizedFaceName) {
    statusText = `✅ Recognized: ${result.recognizedFaceName}`;
    statusColor = '#059669';
  } else if (result.faceDetected) {
    statusText = '⚠️ Unknown Person Detected';
    statusColor = '#dc2626';
  } else {
    statusText = 'ℹ️ Face Detected';
    statusColor = '#f59e0b';
  }
  
  const confidencePercent = faceInfo && faceInfo.confidence ? Math.round(faceInfo.confidence * 100) : 'N/A';
  
  capturedImageDiv.innerHTML = `
    <h3 style="color: ${statusColor}; margin-bottom: 0.5rem;">📸 Latest Captured Image</h3>
    <div style="text-align: center;">
      <img src="${imageBase64}" alt="Captured Image" style="max-width: 100%; max-height: 300px; border: 3px solid ${statusColor}; border-radius: 8px; margin-bottom: 0.5rem;">
      <p style="color: #333; font-weight: bold; margin: 0.5rem 0;">${statusText}</p>
      <p style="color: #666; font-size: 0.9rem; margin: 0;">Captured at: ${new Date().toLocaleTimeString()}</p>
      <p style="color: #666; font-size: 0.9rem; margin: 0;">Confidence: ${confidencePercent}%</p>
    </div>
  `;
  
  console.log('   📺 Captured image displayed on monitoring page');
}

// ============================================
// GLOBAL ACCESS
// ============================================

window.faceDetectionEnabled = function() {
  return faceDetectionActive;
};

window.faceDetectionModelsLoaded = function() {
  return faceModelsReady;
};

// Test functions
window.testCapture = function() {
  console.log("🧪 Manual test capture - checking for face...");
  checkForFaceAndCapture();
};

window.startCapture = function() {
  console.log("🧪 Manual start capture");
  startContinuousCapture();
};

window.stopCapture = function() {
  console.log("🧪 Manual stop capture");
  stopContinuousCapture();
};

console.log("✅ NEW CAPTURE MODEL script loaded!");
