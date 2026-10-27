'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Landmark3D, RecognizedGesture, SpatialRegionConfig } from './types';
import { HandGestureClassifier } from './gesture-classifier';
import { generateSyntheticHand } from './synthetic-hand';
import { OneEuroFilter } from '@/core/filters';
import { MediaPipeTaskRunner } from '@/core/mediapipe/task-runner';
import { getPublishedModels } from '@/modules/laboratory/model-storage';
import { ClassifierTrainer } from '@/modules/laboratory/classifier-trainer';

export interface UseHandGesturesOptions {
  videoElement?: HTMLVideoElement | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isActive?: boolean;
  isMirrored?: boolean;
  syntheticMode?: boolean;
  activeRegion?: SpatialRegionConfig;
  onGesture?: (gesture: RecognizedGesture) => void;
  onClick?: (cursor: { x: number; y: number }) => void;
  onFrameRender?: (
    landmarks: Landmark3D[] | null,
    cursor: { x: number; y: number; isPinching: boolean; dwellProgress: number },
    multiHands?: Landmark3D[][],
    multiHandednesses?: ('Left' | 'Right')[],
    gestures?: RecognizedGesture[]
  ) => void;
}

export function useHandGestures(options: UseHandGesturesOptions = {}) {
  const {
    videoElement,
    videoRef,
    isActive = true,
    isMirrored = true,
    syntheticMode = false,
    activeRegion = { minX: 0.15, maxX: 0.85, minY: 0.15, maxY: 0.85 },
    onGesture,
    onClick,
    onFrameRender,
  } = options;

  // Callback refs to ensure stable animation frame loops
  const onGestureRef = useRef(onGesture);
  onGestureRef.current = onGesture;
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  const onFrameRenderRef = useRef(onFrameRender);
  onFrameRenderRef.current = onFrameRender;

  // Real-time mutable references (zero React re-renders per frame)
  const landmarksRef = useRef<Landmark3D[] | null>(null);
  const multiHandsRef = useRef<Landmark3D[][]>([]);
  const multiHandednessesRef = useRef<('Left' | 'Right')[]>([]);
  const gesturesRef = useRef<RecognizedGesture[]>([]);
  const cursorRef = useRef<{
    x: number;
    y: number;
    rawX: number;
    rawY: number;
    isPinching: boolean;
    dwellProgress: number;
  }>({
    x: 0.5,
    y: 0.5,
    rawX: 0.5,
    rawY: 0.5,
    isPinching: false,
    dwellProgress: 0,
  });

  // UI state updated only at throttled intervals
  const [gestures, setGestures] = useState<RecognizedGesture[]>([]);
  const [handedness, setHandedness] = useState<'Left' | 'Right'>('Right');
  const [isTracking, setIsTracking] = useState(false);
  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [backendInUse, setBackendInUse] = useState<string>('INITIALIZING');

  const runnerRef = useRef<MediaPipeTaskRunner>(new MediaPipeTaskRunner());
  const classifierRef = useRef<HandGestureClassifier>(new HandGestureClassifier());
  const filterXRef = useRef<OneEuroFilter>(new OneEuroFilter(60, { minCutoff: 1.2, beta: 0.008 }));
  const filterYRef = useRef<OneEuroFilter>(new OneEuroFilter(60, { minCutoff: 1.2, beta: 0.008 }));
  const dwellTimerRef = useRef<{ start: number; lastX: number; lastY: number } | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);

  const animFrameRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcRef = useRef<number>(performance.now());
  const lastUiUpdateRef = useRef<number>(0);
  const customTrainersRef = useRef<{ id: string; trainer: ClassifierTrainer }[]>([]);

  // Load published custom models from Laboratory storage
  useEffect(() => {
    try {
      const published = getPublishedModels().filter((m) => m.modelData);
      customTrainersRef.current = published.map((m) => {
        const t = new ClassifierTrainer({
          metric: m.hyperparameters.metric || 'euclidean',
          confidenceThreshold: m.hyperparameters.confidenceThreshold || 0.68,
          kNeighbors: m.hyperparameters.kNeighbors || 3,
        });
        t.loadModelData(m.modelData!);
        return { id: m.id, trainer: t };
      });
    } catch {
      // safe fallback
    }
  }, []);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let mounted = true;
    runnerRef.current.initHandLandmarker().then((success) => {
      if (mounted) {
        setBackendInUse(runnerRef.current.getBackend());
      }
    });

    return () => {
      mounted = false;
      runnerRef.current.dispose();
    };
  }, []);

  // Recalibrate active region to current index position
  const recalibrate = useCallback(() => {
    const current = landmarksRef.current;
    if (current && current.length > 8) {
      const indexPt = current[8]!;
      const halfW = (activeRegion.maxX - activeRegion.minX) / 2;
      const halfH = (activeRegion.maxY - activeRegion.minY) / 2;
      activeRegion.minX = Math.max(0.05, indexPt.x - halfW);
      activeRegion.maxX = Math.min(0.95, indexPt.x + halfW);
      activeRegion.minY = Math.max(0.05, indexPt.y - halfH);
      activeRegion.maxY = Math.min(0.95, indexPt.y + halfH);
    }
  }, [activeRegion]);

  // Main high-performance processing loop (60 FPS rendering, decoupled inference)
  const processTick = useCallback(() => {
    if (!isActive) return;

    const now = performance.now();
    frameCountRef.current++;

    // Calculate FPS at 1 Hz
    if (now - lastFpsCalcRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcRef.current)));
      frameCountRef.current = 0;
      lastFpsCalcRef.current = now;
    }

    const startInference = performance.now();
    let currentLandmarks: Landmark3D[] | null = null;
    const activeVideo = videoRef?.current || videoElement;

    if (syntheticMode) {
      // Explicit synthetic mode requested
      currentLandmarks = generateSyntheticHand(now);
      const synth2 = currentLandmarks.map((pt) => ({ x: Math.min(1, pt.x + 0.35), y: pt.y, z: pt.z }));
      multiHandsRef.current = [currentLandmarks, synth2];
      multiHandednessesRef.current = ['Right', 'Left'];
    } else if (activeVideo && activeVideo.readyState >= 2) {
      // Live MediaPipe Task detection on playable video
      const mpResult = runnerRef.current.detectHands(activeVideo, now);
      if (mpResult && mpResult.landmarks && mpResult.landmarks.length > 0) {
        lastDetectionTimeRef.current = now;
        multiHandsRef.current = mpResult.landmarks.map((hand) =>
          hand.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z }))
        );
        const detectedHands = (mpResult.handednesses || []).map((h) =>
          h && h[0] ? (h[0].categoryName as 'Left' | 'Right') : 'Right'
        );
        multiHandednessesRef.current = detectedHands;

        if (mpResult.landmarks[0]) {
          currentLandmarks = multiHandsRef.current[0]!;
        }
        if (detectedHands[0] && detectedHands[0] !== handedness) {
          setHandedness(detectedHands[0]);
        }
      } else {
        // Drop tracking if no hands detected for more than 120ms
        if (now - lastDetectionTimeRef.current > 120) {
          currentLandmarks = null;
          landmarksRef.current = null;
          multiHandsRef.current = [];
          multiHandednessesRef.current = [];
          gesturesRef.current = [];
        } else {
          currentLandmarks = landmarksRef.current;
        }
      }
    }

    if (currentLandmarks && currentLandmarks.length >= 21) {
      landmarksRef.current = currentLandmarks;

      // Classify gestures via pure math
      const recognized = classifierRef.current.classify(currentLandmarks, now);

      // Check published custom models from Laboratory
      for (const { trainer } of customTrainersRef.current) {
        const pred = trainer.predict(currentLandmarks);
        if (pred.isRecognized && pred.label !== 'none' && pred.label !== 'neutral') {
          recognized.unshift({
            name: pred.label as any,
            confidence: pred.confidence,
            label: pred.label.replace('_', ' '),
          });
        }
      }

      gesturesRef.current = recognized;

      if (onGestureRef.current && recognized[0]) {
        onGestureRef.current(recognized[0]);
      }

      // Map index fingertip (joint 8) to active spatial coordinate system
      const indexPt = currentLandmarks[8]!;
      const rawX = isMirrored ? 1.0 - indexPt.x : indexPt.x;
      const rawY = indexPt.y;

      // Normalize within active bounds
      const normX = Math.max(
        0,
        Math.min(1, (rawX - activeRegion.minX) / (activeRegion.maxX - activeRegion.minX))
      );
      const normY = Math.max(
        0,
        Math.min(1, (rawY - activeRegion.minY) / (activeRegion.maxY - activeRegion.minY))
      );

      // Smooth with One Euro filter
      const smoothX = filterXRef.current.filter(normX, now);
      const smoothY = filterYRef.current.filter(normY, now);
      const isPinching = classifierRef.current.isPinching();

      // Dwell calculation (800ms)
      let dwell = 0;
      if (!isPinching) {
        if (!dwellTimerRef.current) {
          dwellTimerRef.current = { start: now, lastX: smoothX, lastY: smoothY };
        } else {
          const moveDist = Math.hypot(
            smoothX - dwellTimerRef.current.lastX,
            smoothY - dwellTimerRef.current.lastY
          );
          if (moveDist < 0.035) {
            const elapsed = now - dwellTimerRef.current.start;
            dwell = Math.min(1.0, elapsed / 800);
            if (elapsed >= 800) {
              if (onClickRef.current) onClickRef.current({ x: smoothX, y: smoothY });
              dwellTimerRef.current = { start: now + 500, lastX: smoothX, lastY: smoothY };
            }
          } else {
            dwellTimerRef.current = { start: now, lastX: smoothX, lastY: smoothY };
          }
        }
      } else {
        dwellTimerRef.current = null;
      }

      cursorRef.current = {
        x: smoothX,
        y: smoothY,
        rawX,
        rawY,
        isPinching,
        dwellProgress: dwell,
      };

      // Direct canvas rendering callback (ZERO React overhead!)
      if (onFrameRenderRef.current) {
        onFrameRenderRef.current(
          currentLandmarks,
          cursorRef.current,
          multiHandsRef.current,
          multiHandednessesRef.current,
          recognized
        );
      }
    } else {
      // Clear overlay when no hands detected
      if (onFrameRenderRef.current) {
        onFrameRenderRef.current(null, cursorRef.current, [], [], []);
      }
    }

    // Throttle React UI state updates to 6 Hz (every 160ms) to preserve 60fps main thread
    if (now - lastUiUpdateRef.current >= 160) {
      lastUiUpdateRef.current = now;
      setGestures(gesturesRef.current);
      setIsTracking(landmarksRef.current !== null);
      setLatencyMs(Math.round(performance.now() - startInference));
    }

    animFrameRef.current = requestAnimationFrame(processTick);
  }, [
    isActive,
    syntheticMode,
    videoRef,
    videoElement,
    isMirrored,
    activeRegion,
    handedness,
  ]);

  useEffect(() => {
    if (isActive) {
      animFrameRef.current = requestAnimationFrame(processTick);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, processTick]);

  return {
    landmarksRef,
    multiHandsRef,
    multiHandednessesRef,
    cursorRef,
    gestures,
    handedness,
    setHandedness,
    isTracking,
    fps,
    latencyMs,
    backendInUse,
    recalibrate,
  };
}
