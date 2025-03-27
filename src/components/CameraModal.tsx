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
    setVerificationComplete(true);
    setVerificationResult(result);
    setShowPillCounter(true);
    // Clear any previous errors
    setError(null);
    // Reset failed attempts
    setFailedAttempts(0);
    
    // Stop the camera after successful verification
    if (pillIdentificationRef.current && pillIdentificationRef.current.stopCamera) {
      pillIdentificationRef.current.stopCamera();
    }
  };

  // Handle verification error
  const handleVerificationError = (type: 'camera' | 'network' | 'verification' | 'user', code: string, message: string, recoverable = true, result: any = null) => {
    setError({
      type,
      code,
      message,
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
  };

  // Handle pill count confirmation
  const handlePillCountConfirm = async () => {
    try {
      // Record adherence with pill count
      await fetch("/api/adherence", {
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
        
        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error.message}</h3>
                {verificationResult && (
                  <p className="text-sm text-red-700 mt-1">
                    Detected: {verificationResult.pill_name} (Confidence: {(verificationResult.confidence * 100).toFixed(2)}%)
                  </p>
                )}
                {error.recoverable && (
                  <div className="mt-2">
                    <button
                      onClick={() => setError(null)}
                      className="text-sm text-red-600 hover:text-red-500"
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
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-700">
                    ✓ Pill verified: {verificationResult.pill_name} 
                    (Confidence: {Math.round(verificationResult.confidence * 100)}%)
                  </p>
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