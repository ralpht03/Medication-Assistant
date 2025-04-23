"use client";

import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import PillIdentification from './PillIdentification';
import { Plus, Minus } from 'lucide-react';
import PillCounterModal from './PillCounterModal';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: {
    id: string;
    patientId: string;
    name: string;
    recommendedPillCount: string;
  };
  onVerificationComplete: (data: {
    medicationId: string;
    patientId: string;
    pillCount: string;
    recommendedPillCount: string;
    status: 'taken' | 'missed' | 'skipped';
    notes?: string;
    bypassVerification?: boolean;
  }) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, medication, onVerificationComplete }) => {
  const [showPillCounter, setShowPillCounter] = useState(false);
  const [recommendedPillCount, setRecommendedPillCount] = useState<string>("1");
  const [pillCount, setPillCount] = useState<string>("1");
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [failedAttempts, setFailedAttempts] = useState<string>("0");
  const [bypassVerification, setBypassVerification] = useState(false);
  const [error, setError] = useState<{
    type: 'camera' | 'network' | 'verification' | 'user' | null;
    code: string;
    message: string;
    recoverable: boolean;
    retryCount: string;
  } | null>(null);
  
  // Reference to the PillIdentification component
  const pillIdentificationRef = useRef<any>(null);
  
  // Extract recommended count from dosage
  useEffect(() => {
    if (medication?.recommendedPillCount) {
      setRecommendedPillCount(medication.recommendedPillCount);
      setPillCount(medication.recommendedPillCount);
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
    setFailedAttempts("0");
    
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
      retryCount: error && error.type === type ? error.retryCount : "0"
    });
    
    // If we have a result, store it even if verification failed
    if (result) {
      setVerificationResult(result);
    }
    
    // Increment failed attempts for verification errors
    if (type === 'verification') {
      setFailedAttempts(prev => (parseInt(prev) + 1).toString());
    }
    
    // Don't automatically hide the error message
    // Keep the camera active for another attempt if recoverable
    if (!recoverable && pillIdentificationRef.current && pillIdentificationRef.current.stopCamera) {
      pillIdentificationRef.current.stopCamera();
    }
  };

  // Handle pill count changes
  const handlePillCountChange = (increment: boolean) => {
    const currentCount = parseInt(pillCount);
    const newCount = increment ? currentCount + 1 : Math.max(1, currentCount - 1);
    setPillCount(newCount.toString());
  };

  // Handle pill count confirmation
  const handlePillCountConfirm = (count: string) => {
    onVerificationComplete({
      medicationId: medication.id,
      patientId: medication.patientId,
      pillCount: count,
      recommendedPillCount: medication.recommendedPillCount,
      status: 'taken',
      notes: !verificationResult?.pill_name || bypassVerification ? 'Bypassed verification' : `Identified as: ${verificationResult.pill_name}`
    });
    onClose();
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
    setFailedAttempts("0");
    setBypassVerification(false);
    
    // Call the provided onClose
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Verify Medication</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
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
          {parseInt(failedAttempts) >= 3 && !showPillCounter && !bypassVerification && (
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
                  medicationId={medication.id}
                  patientId={medication.patientId}
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
                <PillCounterModal
                  medicationName={medication?.name}
                  recommendedCount={recommendedPillCount}
                  onConfirm={handlePillCountConfirm}
                  onCancel={handleClose}
                  isVisible={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraModal;