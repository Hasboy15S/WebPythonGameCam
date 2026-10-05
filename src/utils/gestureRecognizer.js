/**
 * Gesture Recognition Utility for MediaPipe HandLandmarker
 * Identifies:
 * - "FIST" (All fingers folded) -> Cast Fireball
 * - "OPEN_PALM" (All fingers extended) -> Energy Shield
 * - "PINCH" (Thumb and Index fingertips touching) -> Open/Close Inventory
 */

// MediaPipe Landmark Index Constants
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

/**
 * Calculate Euclidean 2D distance between two landmarks
 */
export function getDistance2D(p1, p2) {
  if (!p1 || !p2) return Infinity;
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Euclidean 3D distance between two landmarks
 */
export function getDistance3D(p1, p2) {
  if (!p1 || !p2) return Infinity;
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Analyze finger extension states
 */
export function analyzeFingers(landmarks) {
  const wrist = landmarks[HAND_LANDMARKS.WRIST];

  // Helper: check if a standard finger (Index, Middle, Ring, Pinky) is extended
  const isExtended = (tipIdx, pipIdx, mcpIdx) => {
    const dTipWrist = getDistance2D(landmarks[tipIdx], wrist);
    const dPipWrist = getDistance2D(landmarks[pipIdx], wrist);
    const dTipMcp = getDistance2D(landmarks[tipIdx], landmarks[mcpIdx]);
    const dPipMcp = getDistance2D(landmarks[pipIdx], landmarks[mcpIdx]);
    return dTipWrist > dPipWrist * 1.15 && dTipMcp > dPipMcp * 1.05;
  };

  // Helper: check if a standard finger is folded
  const isFolded = (tipIdx, pipIdx, mcpIdx) => {
    const dTipWrist = getDistance2D(landmarks[tipIdx], wrist);
    const dPipWrist = getDistance2D(landmarks[pipIdx], wrist);
    const dTipMcp = getDistance2D(landmarks[tipIdx], landmarks[mcpIdx]);
    return dTipWrist < dPipWrist || dTipMcp < 0.095;
  };

  const indexExtended = isExtended(HAND_LANDMARKS.INDEX_TIP, HAND_LANDMARKS.INDEX_PIP, HAND_LANDMARKS.INDEX_MCP);
  const middleExtended = isExtended(HAND_LANDMARKS.MIDDLE_TIP, HAND_LANDMARKS.MIDDLE_PIP, HAND_LANDMARKS.MIDDLE_MCP);
  const ringExtended = isExtended(HAND_LANDMARKS.RING_TIP, HAND_LANDMARKS.RING_PIP, HAND_LANDMARKS.RING_MCP);
  const pinkyExtended = isExtended(HAND_LANDMARKS.PINKY_TIP, HAND_LANDMARKS.PINKY_PIP, HAND_LANDMARKS.PINKY_MCP);

  const indexFolded = isFolded(HAND_LANDMARKS.INDEX_TIP, HAND_LANDMARKS.INDEX_PIP, HAND_LANDMARKS.INDEX_MCP);
  const middleFolded = isFolded(HAND_LANDMARKS.MIDDLE_TIP, HAND_LANDMARKS.MIDDLE_PIP, HAND_LANDMARKS.MIDDLE_MCP);
  const ringFolded = isFolded(HAND_LANDMARKS.RING_TIP, HAND_LANDMARKS.RING_PIP, HAND_LANDMARKS.RING_MCP);
  const pinkyFolded = isFolded(HAND_LANDMARKS.PINKY_TIP, HAND_LANDMARKS.PINKY_PIP, HAND_LANDMARKS.PINKY_MCP);

  // Thumb extension (relative to wrist and middle MCP)
  const dThumbWrist = getDistance2D(landmarks[HAND_LANDMARKS.THUMB_TIP], wrist);
  const dThumbMcpWrist = getDistance2D(landmarks[HAND_LANDMARKS.THUMB_MCP], wrist);
  const thumbExtended = dThumbWrist > dThumbMcpWrist * 1.12;
  const thumbFolded = dThumbWrist < dThumbMcpWrist * 1.05 || getDistance2D(landmarks[HAND_LANDMARKS.THUMB_TIP], landmarks[HAND_LANDMARKS.MIDDLE_MCP]) < 0.17;

  return {
    extended: {
      thumb: thumbExtended,
      index: indexExtended,
      middle: middleExtended,
      ring: ringExtended,
      pinky: pinkyExtended,
    },
    folded: {
      thumb: thumbFolded,
      index: indexFolded,
      middle: middleFolded,
      ring: ringFolded,
      pinky: pinkyFolded,
    },
    extendedCount: (indexExtended ? 1 : 0) + (middleExtended ? 1 : 0) + (ringExtended ? 1 : 0) + (pinkyExtended ? 1 : 0) + (thumbExtended ? 1 : 0),
    foldedCount: (indexFolded ? 1 : 0) + (middleFolded ? 1 : 0) + (ringFolded ? 1 : 0) + (pinkyFolded ? 1 : 0) + (thumbFolded ? 1 : 0),
  };
}

/**
 * Recognize gesture from 21 hand landmarks
 * @param {Array<{x: number, y: number, z: number}>} landmarks
 * @returns {Object} recognized gesture details
 */
export function recognizeGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return {
      type: 'NONE',
      confidence: 0,
      center: { x: 0.5, y: 0.5 },
      pinchDistance: 1,
      pinchCenter: { x: 0.5, y: 0.5 },
    };
  }

  const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];
  const indexTip = landmarks[HAND_LANDMARKS.INDEX_TIP];
  const middleMcp = landmarks[HAND_LANDMARKS.MIDDLE_MCP];
  const wrist = landmarks[HAND_LANDMARKS.WRIST];

  // Palm center approximation (midpoint of wrist and middle MCP)
  const palmCenter = {
    x: (wrist.x + middleMcp.x) / 2,
    y: (wrist.y + middleMcp.y) / 2,
  };

  // Pinch distance between thumb tip and index tip
  const pinchDistance = getDistance2D(thumbTip, indexTip);
  const pinchCenter = {
    x: (thumbTip.x + indexTip.x) / 2,
    y: (thumbTip.y + indexTip.y) / 2,
  };

  // Analyze fingers
  const { extended, folded, extendedCount, foldedCount } = analyzeFingers(landmarks);

  // 1. PINCH Gesture:
  // Thumb and index tips are very close (< 0.065), and index tip is not buried deep in palm
  const indexTipMcpDist = getDistance2D(indexTip, landmarks[HAND_LANDMARKS.INDEX_MCP]);
  const isPinch = pinchDistance < 0.068 && indexTipMcpDist > 0.07;

  if (isPinch) {
    return {
      type: 'PINCH',
      confidence: Math.max(0.7, 1 - (pinchDistance / 0.068)),
      center: pinchCenter,
      pinchDistance,
      pinchCenter,
      landmarks,
    };
  }

  // 2. FIST Gesture:
  // All 4 fingers (Index, Middle, Ring, Pinky) are folded
  const allFourFingersFolded = folded.index && folded.middle && folded.ring && folded.pinky;
  const isFist = (allFourFingersFolded || foldedCount >= 4) && extendedCount <= 1;

  if (isFist) {
    return {
      type: 'FIST',
      confidence: foldedCount / 5,
      center: palmCenter,
      pinchDistance,
      pinchCenter,
      landmarks,
    };
  }

  // 3. OPEN PALM Gesture:
  // All 5 fingers extended, or at least 4 main fingers extended with palm wide open
  const isPalm = (extendedCount >= 4 && extended.index && extended.middle && extended.ring) && pinchDistance > 0.08;

  if (isPalm) {
    return {
      type: 'OPEN_PALM',
      confidence: extendedCount / 5,
      center: palmCenter,
      pinchDistance,
      pinchCenter,
      landmarks,
    };
  }

  return {
    type: 'NONE',
    confidence: 0,
    center: palmCenter,
    pinchDistance,
    pinchCenter,
    landmarks,
  };
}
