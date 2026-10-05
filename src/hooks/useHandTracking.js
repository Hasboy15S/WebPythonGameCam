import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { recognizeGesture } from '../utils/gestureRecognizer';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/**
 * Custom Hook for MediaPipe HandLandmarker & Webcam tracking.
 * Handles lifecycle, camera stream acquisition, prediction loop,
 * gesture analysis, and proper memory cleanup upon unmount.
 */
export function useHandTracking() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const lastTimestampRef = useRef(-1);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing MediaPipe...');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState(null);

  // Latest tracking results kept in ref for 60fps canvas loop
  const latestTrackingRef = useRef({
    landmarks: null,
    gesture: { type: 'NONE', confidence: 0, center: { x: 0.5, y: 0.5 }, pinchDistance: 1 },
    handedness: null,
  });

  // Reactive state for UI updates
  const [currentGesture, setCurrentGesture] = useState({
    type: 'NONE',
    confidence: 0,
    center: { x: 0.5, y: 0.5 },
  });

  // Cleanup helper
  const cleanup = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error('Error stopping track', e);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (handLandmarkerRef.current) {
      try {
        handLandmarkerRef.current.close();
      } catch (e) {
        console.error('Error closing HandLandmarker', e);
      }
      handLandmarkerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeVisionAndCamera() {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingStatus('Loading MediaPipe Vision WASM...');

        // 1. Load Fileset Resolver
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        if (!isMounted) return;

        setLoadingStatus('Loading HandLandmarker Model...');

        // 2. Instantiate HandLandmarker with GPU delegate (CPU fallback)
        let landmarker;
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuErr) {
          console.warn('GPU acceleration unavailable for HandLandmarker, falling back to CPU:', gpuErr);
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        if (!isMounted) {
          landmarker.close();
          return;
        }

        handLandmarkerRef.current = landmarker;
        setLoadingStatus('Requesting webcam permission...');

        // 3. Request Camera Stream
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Webcam mediaDevices API is not supported in this browser environment.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        // 4. Attach stream to Video element
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          await new Promise((resolve) => {
            if (video.readyState >= 1) {
              video.play().then(resolve).catch(resolve);
            } else {
              video.onloadedmetadata = () => {
                video.play().then(resolve).catch(resolve);
              };
            }
          });
        }

        if (!isMounted) return;

        setIsCameraActive(true);
        setIsLoading(false);
        setLoadingStatus('');

        // 5. Prediction Loop
        let frameCount = 0;
        const predictLoop = () => {
          if (!isMounted) return;

          const video = videoRef.current;
          const model = handLandmarkerRef.current;

          if (video && model && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const nowInMs = performance.now();

            if (nowInMs > lastTimestampRef.current && video.currentTime !== lastVideoTimeRef.current) {
              lastTimestampRef.current = nowInMs;
              lastVideoTimeRef.current = video.currentTime;

              try {
                const results = model.detectForVideo(video, nowInMs);

                if (results && results.landmarks && results.landmarks.length > 0) {
                  // Primary tracked hand
                  const primaryLandmarks = results.landmarks[0];
                  const gesture = recognizeGesture(primaryLandmarks);

                  latestTrackingRef.current = {
                    landmarks: primaryLandmarks,
                    allHandsLandmarks: results.landmarks,
                    gesture,
                    handedness: results.handednesses ? results.handednesses[0] : null,
                  };

                  // Throttle React state update to ~15fps for UI labels, while ref stays 60fps
                  frameCount++;
                  if (frameCount % 4 === 0) {
                    setCurrentGesture((prev) => prev.type === gesture.type ? prev : gesture);
                  }
                } else {
                  latestTrackingRef.current = {
                    landmarks: null,
                    allHandsLandmarks: [],
                    gesture: { type: 'NONE', confidence: 0, center: { x: 0.5, y: 0.5 }, pinchDistance: 1 },
                    handedness: null,
                  };

                  if (frameCount % 4 === 0) {
                    setCurrentGesture((prev) => (prev.type === 'NONE' ? prev : { type: 'NONE', confidence: 0, center: { x: 0.5, y: 0.5 } }));
                  }
                }
              } catch (predictErr) {
                console.error('HandLandmarker prediction error:', predictErr);
              }
            }
          }

          animationFrameIdRef.current = requestAnimationFrame(predictLoop);
        };

        animationFrameIdRef.current = requestAnimationFrame(predictLoop);
      } catch (err) {
        console.error('MediaPipe / Camera Initialization error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to initialize hand tracking or camera.');
          setIsLoading(false);
        }
      }
    }

    initializeVisionAndCamera();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    videoRef,
    isLoading,
    loadingStatus,
    isCameraActive,
    error,
    currentGesture,
    latestTrackingRef,
    cleanup,
  };
}
