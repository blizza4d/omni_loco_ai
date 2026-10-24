'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface UseCameraOptions {
  preferredFacingMode?: 'user' | 'environment';
  preferredResolution?: { width: number; height: number };
  autoStart?: boolean;
}

export function useCamera(options: UseCameraOptions = {}) {
  const {
    preferredFacingMode = 'user',
    preferredResolution,
    autoStart = false,
  } = options;

  // Extract primitive numbers so reference stability is preserved across renders
  const idealWidth = preferredResolution?.width ?? 640;
  const idealHeight = preferredResolution?.height ?? 480;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef<boolean>(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(preferredFacingMode);
  const [isMirrored, setIsMirrored] = useState<boolean>(preferredFacingMode === 'user');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSyntheticMode, setIsSyntheticMode] = useState<boolean>(false);

  // Enumerate attached video input devices
  const updateDeviceList = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
      setDevices(videoInputs);
    } catch {
      // Ignore enumeration failure
    }
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    isStartingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore error on stop
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsStreaming(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(
    async (deviceId?: string, mode?: 'user' | 'environment') => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setErrorMessage('Webcam media devices API is not supported in this browser environment.');
        setPermissionState('error');
        return;
      }

      // If synthetic mode is active, simulate active stream
      if (isSyntheticMode) {
        setIsStreaming(true);
        setPermissionState('granted');
        return;
      }

      // Prevent concurrent startCamera invocations
      if (isStartingRef.current) {
        return;
      }
      isStartingRef.current = true;

      // If an existing stream with active tracks already exists and no specific device switch requested, verify it
      if (streamRef.current && !deviceId && !mode) {
        const activeTracks = streamRef.current.getVideoTracks().filter((t) => t.readyState === 'live');
        if (activeTracks.length > 0) {
          if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
          }
          setIsStreaming(true);
          isStartingRef.current = false;
          return;
        }
      }

      // Stop previous tracks if switching devices
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      setErrorMessage(null);
      const targetFacing = mode || facingMode;
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
          ...(deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: targetFacing }),
        },
      };

      try {
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = newStream;
        setStream(newStream);
        setIsStreaming(true);
        setPermissionState('granted');
        isStartingRef.current = false;

        const videoTrack = newStream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          if (settings.deviceId) setCurrentDeviceId(settings.deviceId);
        }

        // Attach directly if video element is already present
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch((err) => {
            console.warn('video.play() caught:', err);
          });
        }

        await updateDeviceList();
      } catch (err: unknown) {
        isStartingRef.current = false;
        setIsStreaming(false);
        const error = err as Error;
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionState('denied');
          setErrorMessage('Camera access was denied by user or browser policy.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setPermissionState('error');
          setErrorMessage('No physical video input device was detected.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          setPermissionState('error');
          setErrorMessage('Webcam is currently locked by another application or process.');
        } else {
          setPermissionState('error');
          setErrorMessage(error.message || 'Failed to capture webcam stream.');
        }
      }
    },
    [facingMode, idealWidth, idealHeight, isSyntheticMode, updateDeviceList]
  );

  // Synchronize stream directly to video element whenever stream changes or on mount
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().catch((err) => {
        console.warn('Camera video.play() error:', err);
      });
    }
  }, [stream]);

  // Switch between front and rear cameras
  const toggleFacingMode = useCallback(() => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setIsMirrored(nextMode === 'user');
    startCamera(undefined, nextMode);
  }, [facingMode, startCamera]);

  // Switch to specific camera ID
  const switchDevice = useCallback(
    (deviceId: string) => {
      setCurrentDeviceId(deviceId);
      startCamera(deviceId);
    },
    [startCamera]
  );

  // Auto start camera on mount if requested, clean up on unmount
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Listen to device changes
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', updateDeviceList);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', updateDeviceList);
      };
    }
  }, [updateDeviceList]);

  return {
    videoRef,
    stream,
    isStreaming,
    permissionState,
    errorMessage,
    devices,
    currentDeviceId,
    facingMode,
    isMirrored,
    setIsMirrored,
    isSyntheticMode,
    setIsSyntheticMode,
    startCamera,
    stopCamera,
    toggleFacingMode,
    switchDevice,
  };
}
