"use client"

import { useState, useEffect, useRef } from 'react';
import { PrescriptionOCR } from './PrescriptionOCR';

// Define interfaces for prescription data
interface Medication {
  name: string;
  dosage: string;
  instructions: string;
  quantity: string;
  refills: number;
}

interface PrescriptionData {
  patientName: string;
  date: Date;
  isDateValid: boolean;
  medications: Medication[];
  isValid: boolean;
  errorMessages: string[];
}

// Main export function for handling prescription uploads
const handlePrescriptionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  // Get DOM elements for status updates
  const uploadStatus = document.getElementById('upload-status');
  const uploadSuccess = document.getElementById('upload-success');
  const uploadError = document.getElementById('upload-error');
  
  // Reset display of status elements
  if (uploadStatus) uploadStatus.classList.remove('hidden');
  if (uploadSuccess) uploadSuccess.classList.add('hidden');
  if (uploadError) uploadError.classList.add('hidden');
  
  // Update progress bar
  const updateProgress = (percent: number) => {
    const progressBar = document.querySelector('#upload-status .bg-blue-600') as HTMLElement;
    const progressText = document.querySelector('#upload-status span') as HTMLElement;
    
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.innerText = `${percent}%`;
  };
  
  // Get the selected file
  const file = event.target.files?.[0];
  if (!file) {
    if (uploadStatus) uploadStatus.classList.add('hidden');
    if (uploadError) {
      uploadError.classList.remove('hidden');
      const errorMessage = uploadError.querySelector('.text-red-700') as HTMLElement;
      if (errorMessage) errorMessage.innerText = 'No file selected. Please select a prescription image.';
    }
    return;
  }
  
  // Validate file type
  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!validImageTypes.includes(file.type)) {
    if (uploadStatus) uploadStatus.classList.add('hidden');
    if (uploadError) {
      uploadError.classList.remove('hidden');
      const errorMessage = uploadError.querySelector('.text-red-700') as HTMLElement;
      if (errorMessage) errorMessage.innerText = 'Invalid file type. Please upload a PNG, JPEG, or PDF file.';
    }
    return;
  }
  
  try {
    // Update progress to show processing has started
    updateProgress(10);
    
    // Initialize OCR processor
    const ocrProcessor = new PrescriptionOCR();
    
    // Convert file to URL for OCR processing
    const imageUrl = URL.createObjectURL(file);
    
    // Simulate progress during processing
    let progress = 10;
    const progressInterval = setInterval(() => {
      progress += 5;
      if (progress >= 90) {
        clearInterval(progressInterval);
        progress = 90;
      }
      updateProgress(progress);
    }, 300);
    
    // Process the prescription using OCR
    let result: PrescriptionData;
    try {
      console.log("Starting OCR processing...");
      result = await ocrProcessor.processPrescription(imageUrl);
      console.log("OCR processing complete:", result);
      
      // Complete the progress
      clearInterval(progressInterval);
      updateProgress(100);
      
      // Process the results
      if (result.isValid) {
        // Success - prescription is valid
        setTimeout(() => {
          if (uploadStatus) uploadStatus.classList.add('hidden');
          if (uploadSuccess) uploadSuccess.classList.remove('hidden');
          
          // Convert prescription data to medication format that matches your app
          const medicationsFromPrescription = result.medications.map((med, index) => {
            return {
              id: `prescription-${Date.now()}-${index}`,
              name: med.name,
              dosage: med.dosage,
              instructions: med.instructions,
              quantity: med.quantity,
              refills: med.refills,
              time: "08:00", // Default time
              frequency: extractFrequency(med.instructions),
              status: "upcoming"
            };
          });
          
          console.log("Extracted medications:", medicationsFromPrescription);
          
          // Send to your API to add these medications to the patient's record
          sendMedicationsToAPI(medicationsFromPrescription);
        }, 1000);
      } else {
        // Error - prescription is invalid
        clearInterval(progressInterval);
        if (uploadStatus) uploadStatus.classList.add('hidden');
        if (uploadError) {
          uploadError.classList.remove('hidden');
          const errorMessage = uploadError.querySelector('.text-red-700') as HTMLElement;
          if (errorMessage) {
            errorMessage.innerText = `Invalid prescription: ${result.errorMessages.join(', ')}`;
          }
        }
      }
    } catch (ocrError) {
      // OCR processing error
      console.error("OCR processing error:", ocrError);
      clearInterval(progressInterval);
      
      if (uploadStatus) uploadStatus.classList.add('hidden');
      if (uploadError) {
        uploadError.classList.remove('hidden');
        const errorMessage = uploadError.querySelector('.text-red-700') as HTMLElement;
        if (errorMessage) {
          if (String(ocrError).includes("worker.loadLanguage is not a function")) {
            errorMessage.innerText = "OCR processing failed. Please try again with a clearer image.";
          } else {
            errorMessage.innerText = `OCR processing failed: ${ocrError instanceof Error ? ocrError.message : String(ocrError)}`;
          }
        }
      }
    } finally {
      // Clean up OCR resources
      await ocrProcessor.terminate();
    }
  } catch (error) {
    // General error handling
    console.error("General error:", error);
    
    if (uploadStatus) uploadStatus.classList.add('hidden');
    if (uploadError) {
      uploadError.classList.remove('hidden');
      const errorMessage = uploadError.querySelector('.text-red-700') as HTMLElement;
      if (errorMessage) {
        errorMessage.innerText = `Error processing prescription: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }
};

// Helper functions
function extractFrequency(instructions: string): string {
  if (!instructions) return "daily";
  
  const lowerInstructions = instructions.toLowerCase();
  
  if (lowerInstructions.includes("twice daily") || lowerInstructions.includes("two times a day") || lowerInstructions.includes("2 times a day")) {
    return "twice_daily";
  } else if (lowerInstructions.includes("three times a day") || lowerInstructions.includes("3 times a day")) {
    return "three_times_daily";
  } else if (lowerInstructions.includes("four times a day") || lowerInstructions.includes("4 times a day")) {
    return "four_times_daily";
  } else if (lowerInstructions.includes("once weekly") || lowerInstructions.includes("weekly") || lowerInstructions.includes("once a week")) {
    return "weekly";
  } else if (lowerInstructions.includes("every other day") || lowerInstructions.includes("alternate days")) {
    return "every_other_day";
  } else if (lowerInstructions.includes("as needed") || lowerInstructions.includes("when needed") || lowerInstructions.includes("prn")) {
    return "as_needed";
  } else {
    return "daily"; // Default
  }
}

async function sendMedicationsToAPI(medications: any[]) {
  try {
    // Get user data from localStorage for patient ID
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.error("User data not found");
      return;
    }
    
    const user = JSON.parse(userStr);
    const patientId = user.id || user.rowKey || user.RowKey;
    
    if (!patientId) {
      console.error("Patient ID not found in user data");
      return;
    }
    
    // Add patientId to each medication
    const medicationsWithPatientId = medications.map(med => ({
      ...med,
      patientId
    }));
    
    console.log("Sending medications to API:", medicationsWithPatientId);
    
    // Send to your API endpoint
    const response = await fetch('/api/medications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        medications: medicationsWithPatientId 
      })
    });
    
    const data = await response.json();
    console.log("API response:", data);
    
    // Refresh the medications list on success
    if (response.ok) {
      // If your dashboard has a refresh function, call it here
      // For example: fetchDashboardData();
      
      // Show success message
      const successMessage = document.querySelector('#upload-success .text-green-700') as HTMLElement;
      if (successMessage) {
        successMessage.innerText = `${medications.length} medications have been added to your profile. Refresh the page to see updates.`;
      }
    } else {
      throw new Error(data.message || "Failed to add medications");
    }
  } catch (error) {
    console.error("Error sending medications to API:", error);
    
    // Show error in UI
    const uploadSuccess = document.getElementById('upload-success');
    const uploadError = document.getElementById('upload-error');
    
    if (uploadSuccess) uploadSuccess.classList.add('hidden');
    if (uploadError) {
      uploadError.classList.remove('hidden');
      const errorMessage = uploadError.querySelector('.text-red-700') as HTMLElement;
      if (errorMessage) {
        errorMessage.innerText = `Error adding medications: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }
}

export default handlePrescriptionUpload;