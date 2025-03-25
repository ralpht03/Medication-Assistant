import React, { useState } from 'react';
import { PrescriptionOCR } from './PrescriptionOCR';

interface PrescriptionUploadProps {
  onProcessComplete: (result: any) => void;
  onError: (error: string) => void;
}

const PrescriptionUpload: React.FC<PrescriptionUploadProps> = ({ 
  onProcessComplete, 
  onError 
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Initialize the OCR processor
  const ocrProcessor = new PrescriptionOCR();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.match('image.*')) {
        onError('Please upload an image file (JPEG, PNG)');
        return;
      }
      
      // Create preview for the image
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
      
      setFile(selectedFile);
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      onError('Please select a prescription image to upload');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Convert File to a usable format for OCR processing
      const imageUrl = URL.createObjectURL(file);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);
      
      // Process the prescription using OCR
      const result = await ocrProcessor.processPrescription(imageUrl);
      
      // Complete the progress bar
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Handle the results
      if (result.isValid) {
        onProcessComplete(result);
      } else {
        onError(`Invalid prescription: ${result.errorMessages.join(', ')}`);
      }
      
    } catch (error) {
      onError(`Error processing prescription: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clean up
      setIsProcessing(false);
      setUploadProgress(0);
      await ocrProcessor.terminate();
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setUploadProgress(0);
  };

  return (
    <div className="prescription-upload-container">
      <h2>Upload Prescription</h2>
      
      {/* File input */}
      <div className="upload-area">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isProcessing}
          id="prescription-upload"
          className="file-input"
        />
        <label htmlFor="prescription-upload" className="upload-label">
          {preview ? 'Change Image' : 'Select Prescription Image'}
        </label>
      </div>
      
      {/* Preview */}
      {preview && (
        <div className="preview-container">
          <img src={preview} alt="Prescription preview" className="preview-image" />
          <button onClick={resetUpload} disabled={isProcessing} className="remove-button">
            Remove Image
          </button>
        </div>
      )}
      
      {/* Progress bar */}
      {isProcessing && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
          <span className="progress-text">{uploadProgress}% - Processing...</span>
        </div>
      )}
      
      {/* Upload button */}
      <div className="action-buttons">
        <button 
          onClick={handleUpload} 
          disabled={!file || isProcessing}
          className="upload-button"
        >
          Process Prescription
        </button>
      </div>
      
      {/* Usage instructions */}
      <div className="upload-instructions">
        <h3>Instructions</h3>
        <ul>
          <li>Upload a clear image of the prescription</li>
          <li>Make sure patient information and medication details are visible</li>
          <li>Supported formats: JPEG, PNG</li>
          <li>The system will validate that the prescription is for John Doe and check if it's still valid</li>
          <li>The system will extract medications, dosages, and instructions</li>
        </ul>
      </div>
    </div>
  );
};

export default PrescriptionUpload;