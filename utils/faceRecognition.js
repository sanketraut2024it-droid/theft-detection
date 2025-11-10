// Face recognition utility functions
// This module handles face matching logic

// Calculate Euclidean distance between two face descriptors
function euclideanDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    return Infinity; // Can't compare if dimensions don't match
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

// Find the best matching face from known faces
// Returns: { face: matchedFace, distance: distance, confidence: percentage }
function findBestMatch(unknownDescriptor, knownFaces, threshold = 0.6) {
  if (!unknownDescriptor || !knownFaces || knownFaces.length === 0) {
    return null;
  }

  let bestMatch = null;
  let minDistance = Infinity;

  for (const knownFace of knownFaces) {
    if (!knownFace.descriptor || !knownFace.isActive) {
      continue;
    }

    const distance = euclideanDistance(unknownDescriptor, knownFace.descriptor);

    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = knownFace;
    }
  }

  // Convert distance to confidence (0-100)
  // Lower distance = higher confidence
  // Assuming distance range 0-1, threshold at 0.6
  let confidence = 0;
  if (minDistance < threshold) {
    confidence = Math.round((1 - minDistance / threshold) * 100);
  }

  // If distance is below threshold, we have a match
  if (minDistance < threshold && bestMatch) {
    return {
      face: bestMatch,
      distance: minDistance,
      confidence: confidence
    };
  }

  return null; // No match found
}

// Normalize descriptor (for better matching)
function normalizeDescriptor(descriptor) {
  if (!descriptor || descriptor.length === 0) {
    return null;
  }

  // Calculate magnitude
  const magnitude = Math.sqrt(
    descriptor.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) {
    return null;
  }

  // Normalize to unit vector
  return descriptor.map(val => val / magnitude);
}

module.exports = {
  euclideanDistance,
  findBestMatch,
  normalizeDescriptor
};

