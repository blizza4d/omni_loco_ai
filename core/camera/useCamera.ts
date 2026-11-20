'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SharedCameraManager } from './shared-camera-manager';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface UseCameraOptions {
  preferredFacingMode?: 'user' | 'environment';
  preferredResolution?: { width: number; height: number };
  autoStart?: boolean;
  consumerId?: string;
}

export function useCamera(options: UseCameraOptions = {}) {
  const {
    preferredFacingMode = 'user',
    preferredResolution,
    autoStart = false,
    consumerId: explicitConsumerId,
  } = options;

  // Stable consumer identifier for ref-counted stream manager
  const consumerIdRef = useRef<string>(
    explicitConsumerId || `cam-consumer-${Math.random().toString(36).substring(2, 9)}`
  );

  const idealWidth = preferredResolution?.width ?? 640;
  const idealHeight = preferredResolution?.height ?? 480;

  const videoRef = useRef<HTMLVideoElement | null>(null);
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

  const manager = typeof window !== 'undefined' ? SharedCameraManager.getInstance() : null;

  // Enumerate attached video input devices
  const updateDeviceList = useCallback(async () => {
    if (!manager) return;
    const list = await manager.enumerateDevices();
    setDevices(list);
  }, [manager]);

  // Stop camera tracks cleanly via shared manager
  const stopCamera = useCallback(() => {
    isStartingRef.current = false;
    if (manager) {
      manager.releaseStream(consumerIdRef.current);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsStreaming(false);
  }, [manager]);

  // Start camera stream via shared manager
  const startCamera = useCallback(
    async (deviceId?: string, mode?: 'user' | 'environment') => {
      if (!manager) {
        setErrorMessage('Camera manager unavailable in non-browser environment.');
        setPermissionState('error');
        return;
      }

      if (isStartingRef.current) return;
      isStartingRef.current = true;
      setErrorMessage(null);

      const targetFacing = mode || facingMode;

      try {
        const acquiredStream = await manager.acquireStream(consumerIdRef.current, {
          preferredFacingMode: targetFacing,
          preferredResolution: { width: idealWidth, height: idealHeight },
          deviceId,
          isSyntheticMode,
        });

        if (!isStartingRef.current) {
          // Unmounted or stopped during acquisition
          manager.releaseStream(consumerIdRef.current);
          return;
        }

        if (acquiredStream) {
          setStream(acquiredStream);
          setIsStreaming(true);
          setPermissionState('granted');

          const track = acquiredStream.getVideoTracks()[0];
          if (track) {
            const settings = track.getSettings();
            if (settings.deviceId) setCurrentDeviceId(settings.deviceId);
          }

          if (videoRef.current) {
            videoRef.current.srcObject = acquiredStream;
            videoRef.current.play().catch((err) => {
              console.warn('[useCamera] video.play() error:', err);
            });
          }
        } else {
          const telemetry = manager.getTelemetry();
          setIsStreaming(false);
          setPermissionState(telemetry.permissionState);
          setErrorMessage(telemetry.errorMessage || 'Failed to acquire video stream.');
        }

        await updateDeviceList();
      } catch (err: unknown) {
        const error = err as Error;
        setIsStreaming(false);
        setPermissionState('error');
        setErrorMessage(error.message || 'Camera acquisition error.');
      } finally {
        isStartingRef.current = false;
      }
    },
    [manager, facingMode, idealWidth, idealHeight, isSyntheticMode, updateDeviceList]
  );

  // Synchronize stream directly to video element whenever stream changes
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().catch((err) => {
        console.warn('[useCamera] Camera video.play() error:', err);
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
    const currentId = consumerIdRef.current;
    return () => {
      if (manager) {
        manager.releaseStream(currentId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Listen to telemetry changes from SharedCameraManager
  useEffect(() => {
    if (!manager) return;
    const unsubscribe = manager.subscribe((telemetry) => {
      if (telemetry.errorMessage && !isStreaming) {
        setErrorMessage(telemetry.errorMessage);
        setPermissionState(telemetry.permissionState);
      }
    });
    return unsubscribe;
  }, [manager, isStreaming]);

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
