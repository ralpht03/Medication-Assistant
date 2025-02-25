"use client";

import { useState, useRef, useEffect } from 'react';
import { Camera } from 'lucide-react';
import axios from 'axios';
import cv from '@techstark/opencv-js';

export default function PillIdentification() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Changed to false by default
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize OpenCV
  useEffect(() => {
    if (typeof window !== 'undefined' && cv && (cv as any).Mat) {
      setIsOpenCVReady(true);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setMessage('Initializing camera...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });
        
        setStream(mediaStream);
        setIsCameraActive(true);
        setMessage('Camera ready. Position the pill in the center and tap Capture.');
      }
    } catch (error) {
      console.error('Camera error:', error);
      setMessage('Error accessing camera. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setMessage('');
    }
  };

  const captureAndIdentify = async () => {
    if (!isCameraActive) {
      return;
    }

    setIsProcessing(true);
    setMessage("Processing image...");

    try {
      const image = await captureImage();
      if (!image) {
        throw new Error("Failed to capture image");
      }

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error("User session not found");
      }

      const user = JSON.parse(userStr);
      const response = await axios.post("/api/verify-medication", { 
        image,
        medicationId: 'identification-only',
        patientId: user.id || user.RowKey
      });
      
      const { pill_name, confidence } = response.data;
      setMessage(`Identified as: ${pill_name} (Confidence: ${(confidence * 100).toFixed(2)}%)`);
    } catch (error) {
      console.error("Error:", error);
      setMessage(error instanceof Error ? error.message : "Error identifying pill. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Pill Identification</h2>
      
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
            <span className="text-white text-sm">Tap Start Camera to begin</span>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div>
            <span className="text-white text-sm">Initializing camera...</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {!isCameraActive ? (
          <button
            onClick={startCamera}
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Starting Camera...' : 'Start Camera'}
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

        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('Error')
              ? 'bg-red-50 text-red-700'
              : message.includes('Identified')
                ? 'bg-green-50 text-green-700'
                : 'bg-blue-50 text-blue-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
} 