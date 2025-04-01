"use client";

import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import PillIdentification from './PillIdentification';
import { Plus, Minus } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: {
    id: string;
    name: string;
    dosage: string;
    patientId: string;
  };
  onTakeMedication: () => void;
}

export default function CameraModal({ 
  isOpen, 
  onClose, 
  medication, 
  onTakeMedication 
}: CameraModalProps) {
  const [showPillCounter, setShowPillCounter] = useState(false);
  const [recommendedCount, setRecommendedCount] = useState(1);
  const [pillCount, setPillCount] = useState(1);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [bypassVerification, setBypassVerification] = useState(false);
  const [error, setError] = useState<{
    type: 'camera' | 'network' | 'verification' | 'user' | null;
    code: string;
    message: string;
    recoverable: boolean;
    retryCount: number;
  } | null>(null);
  
  // Reference to the PillIdentification component
  const pillIdentificationRef = useRef<any>(null);
  
  // Extract recommended count from dosage
  useEffect(() => {
    if (medication?.dosage) {
      const match = medication.dosage.match(/^(\d+)/);
      const count = 1; // Need to pull from database, take out recommended dosage
      setRecommendedCount(count);
      setPillCount(count);
    }
  }, [medication]);

  // Handle successful verification
  const handleVerificationSuccess = (result: any) => {
    console.log('Verification successful:', result);
    setVerificationComplete(true);
    setVerificationResult(result);
    // Only show pill counter if the correct pill is identified
    const isPillCorrect = result.pill_name.toLowerCase() === medication?.name.toLowerCase();
    setShowPillCounter(isPillCorrect);
    // Clear any previous errors
    setError(null);
    // Reset failed attempts
    setFailedAttempts(0);
    
    // Don't stop the camera immediately to allow user to see the success message
    setTimeout(() => {
      if (pillIdentificationRef.current && pillIdentificationRef.current.stopCamera) {
        pillIdentificationRef.current.stopCamera();
      }
    }, 1500);
  };

  // Handle verification error
  const handleVerificationError = (type: 'camera' | 'network' | 'verification' | 'user', code: string, message: string, recoverable = true, result: any = null) => {
    console.log('Verification error:', { type, code, message, recoverable, result });
    
    // Check if this is a low light condition
    const isLowLight = message.toLowerCase().includes('lighting') ||
                      (result && result.confidence && result.confidence < 0.5);
    
    // Create a more user-friendly message for low light conditions
    const enhancedMessage = isLowLight
      ? "Low light detected. Please ensure the pill is in a well-lit area for accurate identification."
      : message;
    
    setError({
      type,
      code,
      message: enhancedMessage,
      recoverable,
      retryCount: error && error.type === type ? error.retryCount + 1 : 0
    });
    
    // If we have a result, store it even if verification failed
    if (result) {
      setVerificationResult(result);
    }
    
    // Increment failed attempts for verification errors
    if (type === 'verification') {
      setFailedAttempts(prev => prev + 1);
    }
    
    // Don't automatically hide the error message
    // Keep the camera active for another attempt if recoverable
    if (!recoverable && pillIdentificationRef.current && pillIdentificationRef.current.stopCamera) {
      pillIdentificationRef.current.stopCamera();
    }
  };

  // Handle pill count confirmation
  const handlePillCountConfirm = async () => {
    try {
      console.log('Confirming pill count:', {
        medicationId: medication.id,
        patientId: medication.patientId,
        pillCount,
        recommendedCount,
        bypassVerification
      });
      
      // Record adherence with pill count
      const response = await fetch("/api/adherence", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicationId: medication.id,
          patientId: medication.patientId,
          pillCount: pillCount,
          recommendedCount: recommendedCount,
          status: 'taken',
          notes: bypassVerification
            ? 'Taken via bypass after failed verification attempts'
            : 'Taken via camera verification',
          bypassVerification: bypassVerification
        })
      });
      
      const result = await response.json();
      console.log('Adherence API response:', result);
      
      // Call the onTakeMedication callback to refresh the dashboard
      onTakeMedication();
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error("Error recording adherence:", error);
      handleVerificationError('network', 'AdherenceError', 'Failed to record medication adherence. Please try again.');
    }
  };

  // Handle bypass verification
  const handleBypassVerification = () => {
    setBypassVerification(true);
    setShowPillCounter(true);
    
    // Stop the camera when bypassing verification
    if (pillIdentificationRef.current && pillIdentificationRef.current.stopCamera) {
      pillIdentificationRef.current.stopCamera();
    }
  };

  // Handle modal close with cleanup
  const handleClose = () => {
    // Stop the camera if it's still running
    if (pillIdentificationRef.current && pillIdentificationRef.current.stopCamera) {
      pillIdentificationRef.current.stopCamera();
    }
    
    // Reset state
    setShowPillCounter(false);
    setVerificationComplete(false);
    setVerificationResult(null);
    setError(null);
    setFailedAttempts(0);
    setBypassVerification(false);
    
    // Call the provided onClose
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Verify Medication: {medication?.name}</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Error display for non-verification errors */}
        {error && error.type !== 'verification' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
                {verificationResult && (
                  <p className="text-sm text-red-700 mt-1">
                    Detected: {verificationResult.pill_name} (Confidence: {(verificationResult.confidence * 100).toFixed(2)}%)
                  </p>
                )}
                {error.recoverable && (
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setError(null);
                        // If camera error, try to restart camera
                        if (error.type === 'camera' && pillIdentificationRef.current) {
                          setTimeout(() => {
                            pillIdentificationRef.current?.startCamera();
                          }, 500);
                        }
                      }}
                      className="text-sm px-3 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Bypass option after 3 failed attempts */}
        {failedAttempts >= 3 && !showPillCounter && !bypassVerification && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Multiple verification attempts failed</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You can continue without pill verification, but your helper will be notified.
                </p>
                <div className="mt-2">
                  <button
                    onClick={handleBypassVerification}
                    className="text-sm bg-yellow-100 px-3 py-1 rounded text-yellow-800 hover:bg-yellow-200"
                  >
                    Continue without verification
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className={`flex ${showPillCounter ? 'flex-row' : 'flex-col'} gap-4`}>
          {/* Camera section - always visible unless bypassed */}
          {(!bypassVerification || verificationComplete) && (
            <div className={`${showPillCounter ? 'w-1/2' : 'w-full'}`}>
              <PillIdentification
                ref={pillIdentificationRef}
                medicationId={medication?.id}
                patientId={medication?.patientId}
                onVerificationSuccess={handleVerificationSuccess}
                onVerificationError={handleVerificationError}
                isModal={true}
                hideControls={verificationComplete || bypassVerification}
              />
              
              {verificationComplete && verificationResult && (
                <div className={`mt-4 p-4 ${verificationResult.pill_name.toLowerCase() === medication?.name.toLowerCase() 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'} border rounded-md`}>
                  <div className="flex items-start">
                    {verificationResult.pill_name.toLowerCase() === medication?.name.toLowerCase() ? (
                      <p className="text-green-700">
                        ✓ Pill verified: {verificationResult.pill_name}
                        (Confidence: {Math.round(verificationResult.confidence * 100)}%)
                      </p>
                    ) : (
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mr-2" />
                        <div>
                          <p className="text-red-700 font-medium">
                            ✗ Incorrect pill detected: {verificationResult.pill_name}
                            (Confidence: {verificationResult.confidence * 100}%)
                          </p>
                          <p className="text-red-600 text-sm mt-1">
                            This does not match your prescribed medication: {medication?.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Additional error display for verification errors */}
              {error && error.type === 'verification' && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Verification Issue</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        {error.message}
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Please ensure good lighting and that the pill is clearly visible in the center of the frame.
                      </p>
                      {error.recoverable && (
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              setError(null);
                              // Try to capture again
                              if (pillIdentificationRef.current) {
                                setTimeout(() => {
                                  pillIdentificationRef.current?.captureAndIdentify();
                                }, 500);
                              }
                            }}
                            className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          >
                            Try again
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Pill counter section - visible after verification or bypass */}
          {showPillCounter && (
            <div className={`${bypassVerification && !verificationComplete ? 'w-full' : 'w-1/2'} ${bypassVerification && !verificationComplete ? '' : 'border-l pl-4'}`}>
              <h3 className="text-lg font-semibold mb-4">Confirm Medication</h3>
              
              {bypassVerification && !verificationComplete && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mr-2" />
                    <p className="text-sm text-yellow-700">
                      You are taking medication without verification. Your helper will be notified.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-white rounded-lg p-4">
                <p className="mb-4">
                  How many pills of <span className="font-semibold">{medication?.name}</span> are you taking?
                </p>
                
                <div className="flex items-center justify-center mb-6">
                  <button 
                    onClick={() => setPillCount(Math.max(1, pillCount - 1))}
                    className="p-2 bg-gray-200 rounded-l-lg"
                    aria-label="Decrease pill count"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="px-6 py-2 border-t border-b text-xl font-semibold">
                    {pillCount}
                  </div>
                  <button 
                    onClick={() => setPillCount(pillCount + 1)}
                    className="p-2 bg-gray-200 rounded-r-lg"
                    aria-label="Increase pill count"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600">
                    Recommended: {recommendedCount} {recommendedCount === 1 ? 'pill' : 'pills'}
                  </p>
                </div>
                
                <div className="flex justify-between">
                  <button 
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePillCountConfirm}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Ingested pill/s
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}