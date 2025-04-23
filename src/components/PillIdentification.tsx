"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import axios from 'axios';
import cv from '@techstark/opencv-js';

interface PillIdentificationProps {
  medicationId?: string;
  patientId?: string;
  onVerificationSuccess?: (result: any) => void;
  onVerificationError?: (type: 'camera' | 'network' | 'verification' | 'user', code: string, message: string, recoverable?: boolean, result?: any) => void;
  isModal?: boolean;
  hideControls?: boolean;
}

// Export the component type for ref usage
export interface PillIdentificationRef {
  stopCamera: () => void;
  startCamera: () => Promise<void>;
  captureAndIdentify: () => Promise<void>;
}

const PillIdentification = forwardRef<PillIdentificationRef, PillIdentificationProps>(({
  medicationId = 'identification-only',
  patientId,
  onVerificationSuccess,
  onVerificationError,
  isModal = false,
  hideControls = false
}, ref) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize OpenCV
  useEffect(() => {
    if (typeof window !== 'undefined' && cv && (cv as any).Mat) {
      setIsOpenCVReady(true);
    }
  }, []);

  // Check camera permissions on mount
  useEffect(() => {
    checkCameraPermissions();
  }, []);

  // Auto-start camera if in modal mode
  useEffect(() => {
    if (isModal && permissionState !== 'denied') {
      startCamera();
    }
  }, [isModal, permissionState]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    stopCamera,
    startCamera,
    captureAndIdentify
  }));

  const checkCameraPermissions = async () => {
    try {
      // Check if permissions API is supported
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionState(result.state);
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          setPermissionState(result.state);
        });
      }
    } catch (error) {
      console.log('Permissions API not supported');
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      setPermissionState('granted');
      startCamera(); // Start the camera after permission is granted
    } catch (error) {
      console.error('Permission request error:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDismissedError') {
          setPermissionState('denied');
          setMessage('Camera access is required for medication verification. Please enable camera permissions in your browser settings.');
          
          if (onVerificationError) {
            onVerificationError(
              'camera', 
              'PermissionDenied', 
              'Camera access is required for medication verification. Please enable camera permissions in your browser settings.',
              true // Mark as recoverable so user can try again
            );
          }
        } else {
          setPermissionState('denied');
          setMessage('Unable to access camera. Please check your browser settings.');
          
          if (onVerificationError) {
            onVerificationError(
              'camera', 
              error.name, 
              'Unable to access camera. Please check your browser settings.',
              true
            );
          }
        }
      }
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setMessage('Initializing camera...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (!videoRef.current) {
        throw new Error('Video element not initialized');
      }

      videoRef.current.srcObject = mediaStream;
      
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve();
        }
      });

      setIsCameraActive(true);
      setMessage('Camera ready. Position the pill in the center and tap Capture.');
    } catch (error) {
      console.error('Camera error:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setPermissionState('denied');
          setMessage('Camera access denied. Click "Enable Camera" to grant permission.');
          
          if (onVerificationError) {
            onVerificationError(
              'camera', 
              'NotAllowedError', 
              'Camera access denied. Click "Enable Camera" to grant permission.',
              true
            );
          }
        } else if (error.name === 'NotFoundError') {
          setMessage('No camera found. Please connect a camera and try again.');
          
          if (onVerificationError) {
            onVerificationError(
              'camera', 
              'NotFoundError', 
              'No camera found. Please connect a camera and try again.',
              false
            );
          }
        } else {
          setMessage(`Camera error: ${error.message}`);
          
          if (onVerificationError) {
            onVerificationError(
              'camera', 
              error.name, 
              `Camera error: ${error.message}`,
              true
            );
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setMessage('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const captureAndIdentify = async () => {
    if (!isCameraActive) return;

    setIsProcessing(true);
    setMessage("Processing image...");

    try {
      const image = await captureImage();
      if (!image) {
        throw new Error("Failed to capture image");
      }

      // Check for low light conditions before sending to API
      if (isOpenCVReady) {
        try {
          const lowLightDetected = await checkLowLightCondition(image);
          if (lowLightDetected) {
            setMessage("Low light detected. Please ensure the pill is in a well-lit area for accurate identification.");
            
            if (onVerificationError) {
              onVerificationError(
                'verification',
                'LowLightCondition',
                "Low light detected. Please ensure the pill is in a well-lit area for accurate identification.",
                true
              );
            }
            return;
          }
        } catch (e) {
          console.log("Error checking light conditions:", e);
          // Continue with verification even if light check fails
        }
      }

      // Get patientId from props or localStorage
      const userPatientId = patientId || (() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        const user = JSON.parse(userStr);
        return user.id || user.RowKey;
      })();

      if (!userPatientId) {
        throw new Error("User session not found");
      }

      console.log('Sending verification request:', {
        medicationId,
        patientId: userPatientId,
        imageSize: image.length
      });

      const response = await axios.post("/api/verify-medication", {
        image,
        medicationId,
        patientId: userPatientId
      });
      
      const result = response.data;
      console.log('Verification API response:', result);
      
      if (!result.verified || result.confidence < 0.8) {
        const errorMessage = result.message ||
          `Pill verification failed. ${result.pill_name ? `Detected: ${result.pill_name}` : 'No pill detected'}. Please try again with better lighting.`;
        
        setMessage(errorMessage);
        
        if (onVerificationError) {
          onVerificationError(
            'verification',
            'VerificationFailed',
            errorMessage,
            true,
            result // Pass the result even when verification fails
          );
        }
        return;
      }

      setMessage(`Identified as: ${result.pill_name} (Confidence: ${(result.confidence * 100).toFixed(2)}%)`);
      
      // If confidence is high enough and we have a callback, call it
      if (result.confidence >= 0.8 && onVerificationSuccess) {
        onVerificationSuccess(result);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Unable to process image. Please ensure good lighting and try again.");
      
      if (onVerificationError) {
        onVerificationError(
          'network',
          'ApiError',
          "Unable to process image. Please ensure good lighting and try again.",
          true
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to check if the image has low light conditions
  const checkLowLightCondition = async (imageDataUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(false);
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Calculate average brightness
          let totalBrightness = 0;
          for (let i = 0; i < data.length; i += 4) {
            // Convert RGB to brightness using standard luminance formula
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            totalBrightness += brightness;
          }
          
          const avgBrightness = totalBrightness / (data.length / 4);
          console.log('Average image brightness:', avgBrightness);
          
          // Consider low light if average brightness is below threshold
          // Threshold can be adjusted based on testing
          const isLowLight = avgBrightness < 80;
          resolve(isLowLight);
        };
        
        img.onerror = () => {
          console.error('Error loading image for light analysis');
          resolve(false);
        };
        
        img.src = imageDataUrl;
      } catch (error) {
        console.error('Error analyzing image brightness:', error);
        resolve(false);
      }
    });
  };

  const captureImage = async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) {
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return null;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (error) {
      console.error('Capture error:', error);
      return null;
    }
  };

  return (
    <div className={`${isModal ? '' : 'bg-white p-6 rounded-lg shadow-md'}`}>
      {!isModal && <h2 className="text-2xl font-bold mb-4">Pill Identification</h2>}
      
      {/* Permission Status Banner */}
      {permissionState === 'denied' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Camera access is blocked</p>
              <p>To use pill identification, you need to enable camera access:</p>
              <ol className="mt-2 ml-4 list-decimal">
                <li>Click the camera icon in your browser&apos;s address bar</li>
                <li>Select &quot;Allow&quot; for camera access</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        </div>
      )}
      
      {/* Camera Preview */}
      <div className="relative aspect-video mb-4 bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {!isCameraActive && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75">
            <Camera className="w-12 h-12 text-white opacity-50 mb-2" />
            <span className="text-white text-sm">
              {permissionState === 'denied' 
                ? 'Camera access needed'
                : 'Tap Start Camera to begin'}
            </span>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div>
            <span className="text-white text-sm">Initializing camera...</span>
          </div>
        )}
      </div>

      {/* Controls - conditionally hide */}
      {!hideControls && (
        <div className="space-y-4">
          {!isCameraActive ? (
            <button
              onClick={permissionState === 'denied' ? requestCameraPermission : startCamera}
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Starting Camera...' : 
               permissionState === 'denied' ? 'Enable Camera' : 'Start Camera'}
            </button>
          ) : (
            <>
              <button
                onClick={captureAndIdentify}
                disabled={isProcessing}
                className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                  isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Capture & Identify'}
              </button>
              
              <button
                onClick={stopCamera}
                className="w-full py-2 px-4 rounded-md text-gray-700 font-medium border border-gray-300 hover:bg-gray-50"
              >
                Stop Camera
              </button>
            </>
          )}
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('Error') || message.includes('denied') || message.includes('failed')
            ? 'bg-red-50 text-red-700'
            : message.includes('ready')
              ? 'bg-green-50 text-green-700'
              : 'bg-blue-50 text-blue-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
PillIdentification.displayName = 'PillIdentification';

export default PillIdentification;