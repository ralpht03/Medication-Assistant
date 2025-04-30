"use client";

import { PrescriptionOCR } from './PrescriptionOCR';

// Define interfaces for prescription data
export interface Medication {
  name: string;
  dosage: string;
  instructions: string;
  quantity: string;
  refills: number;
}

export interface PrescriptionData {
  patientName: string;
  date: Date;
  isDateValid: boolean;
  medications: Medication[];
  isValid: boolean;
  errorMessages: string[];
}

// Helper functions for extracting medication details from prescription text
function extractFrequency(instructions: string): string {
  if (!instructions) return "daily";
  
  const lowerInstructions = instructions.toLowerCase();
  
  if (lowerInstructions.includes("twice daily") || lowerInstructions.includes("two times a day") || lowerInstructions.includes("2 times a day") || lowerInstructions.includes("bid")) {
    return "twice_daily";
  } else if (lowerInstructions.includes("three times a day") || lowerInstructions.includes("3 times a day") || lowerInstructions.includes("tid")) {
    return "three_times_daily";
  } else if (lowerInstructions.includes("four times a day") || lowerInstructions.includes("4 times a day") || lowerInstructions.includes("qid")) {
    return "four_times_daily";
  } else if (lowerInstructions.includes("once weekly") || lowerInstructions.includes("weekly") || lowerInstructions.includes("once a week")) {
    return "weekly";
  } else if (lowerInstructions.includes("every other day") || lowerInstructions.includes("alternate days") || lowerInstructions.includes("qod")) {
    return "every_other_day";
  } else if (lowerInstructions.includes("as needed") || lowerInstructions.includes("when needed") || lowerInstructions.includes("prn")) {
    return "as_needed";
  } else {
    return "daily"; // Default
  }
}

function extractRoute(instructions: string): string {
  if (!instructions) return "oral";
  
  const lowerInstructions = instructions.toLowerCase();
  
  if (lowerInstructions.includes("by mouth") || lowerInstructions.includes("orally") || lowerInstructions.includes("po")) {
    return "oral";
  } else if (lowerInstructions.includes("inject") || lowerInstructions.includes("injection") || lowerInstructions.includes("iv") || lowerInstructions.includes("sc") || lowerInstructions.includes("im")) {
    return "injection";
  } else if (lowerInstructions.includes("inhale") || lowerInstructions.includes("inhaler")) {
    return "inhalation";
  } else if (lowerInstructions.includes("apply") || lowerInstructions.includes("topical") || lowerInstructions.includes("skin")) {
    return "topical";
  } else if (lowerInstructions.includes("eye") || lowerInstructions.includes("ophthalmic")) {
    return "ophthalmic";
  } else if (lowerInstructions.includes("ear") || lowerInstructions.includes("otic")) {
    return "otic";
  } else if (lowerInstructions.includes("rectally") || lowerInstructions.includes("rectal")) {
    return "rectal";
  } else {
    return "oral"; // Default to oral if not specified
  }
}

function extractPrescribingDoctor(doctorInfo: string): string {
  // This is a placeholder function - in a real app you might have more sophisticated extraction
  // For now, we'll just return any text that might look like a doctor name
  if (!doctorInfo) return "";
  
  // Look for patterns like "Dr. Smith" or "Prescribed by: Dr. Jones"
  const doctorMatch = doctorInfo.match(/(?:Dr\.|Doctor)\s+([A-Za-z]+)/i);
  if (doctorMatch && doctorMatch[1]) {
    return `Dr. ${doctorMatch[1]}`;
  }
  
  return ""; // Return empty if no doctor name found
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
    
    console.log("Processing medications for patient:", patientId);
    
    // Process each medication individually to handle potential duplicates
    const results = await Promise.all(medications.map(async (medication) => {
      try {
        // First, check if a similar medication already exists
        const existingMedsResponse = await fetch(`/api/medications?patientId=${patientId}`);
        const existingMedsData = await existingMedsResponse.json();
        
        if (!existingMedsResponse.ok) {
          throw new Error(existingMedsData.error || "Failed to fetch existing medications");
        }
        
        const existingMeds = existingMedsData.medications || [];
        const similarMed = existingMeds.find((med: any) => 
          med.name.toLowerCase() === medication.name.toLowerCase() &&
          med.dosage.toLowerCase() === medication.dosage.toLowerCase()
        );
        
        if (similarMed) {
          // Update existing medication with new details
          console.log(`Similar medication found: ${similarMed.name}. Updating...`);
          
          const updateResponse = await fetch(`/api/medications?patientId=${patientId}&medicationId=${similarMed.rowKey}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...medication,
              // Preserve fields like createdAt if they exist
              createdAt: similarMed.createdAt || new Date().toISOString()
            })
          });
          
          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.error || "Failed to update medication");
          }
          
          return {
            success: true,
            message: `Updated ${medication.name}`,
            data: await updateResponse.json()
          };
        } else {
          // Create new medication
          console.log(`Creating new medication: ${medication.name}`);
          
          const createResponse = await fetch('/api/medications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'create',
              patientId: patientId,
              medication: medication
            })
          });
          
          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || "Failed to create medication");
          }
          
          return {
            success: true,
            message: `Added ${medication.name}`,
            data: await createResponse.json()
          };
        }
      } catch (error) {
        console.error(`Error processing medication ${medication.name}:`, error);
        return {
          success: false,
          message: `Failed to process ${medication.name}: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }));
    
    // Count successful operations
    const successCount = results.filter(result => result.success).length;
    const errorCount = results.length - successCount;
    
    // Show appropriate success/error message
    if (successCount > 0) {
      // Show success message
      const successMessage = document.querySelector('#upload-success .text-green-700') as HTMLElement;
      if (successMessage) {
        if (errorCount > 0) {
          successMessage.innerText = `${successCount} medications have been processed successfully. ${errorCount} medications failed. Refresh the page to see updates.`;
        } else {
          successMessage.innerText = `${successCount} medications have been processed successfully. Refresh the page to see updates.`;
        }
      }
      
      // Trigger a page refresh or dashboard update
      const refreshBtn = document.querySelector('#refresh-dashboard-btn') as HTMLElement;
      if (refreshBtn) {
        refreshBtn.click();
      }
    } else if (errorCount > 0) {
      throw new Error(`Failed to process all ${errorCount} medications`);
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

// Main function for handling prescription uploads
// Export as named function first
export function handlePrescriptionUpload(event: React.ChangeEvent<HTMLInputElement>) {
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
      ocrProcessor.processPrescription(imageUrl).then(data => {
        result = data;
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
            const medicationsFromPrescription = result.medications.map((med) => {
              // Generate appropriate start date (today) and default end date (30 days from now)
              const today = new Date();
              const endDate = new Date();
              endDate.setDate(today.getDate() + 30); // Default 30 day supply
              
              return {
                name: med.name,
                dosage: med.dosage,
                frequency: extractFrequency(med.instructions),
                route: extractRoute(med.instructions),
                startDate: today.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                verificationMethod: 'prescription-upload',
                prescribingDoctor: extractPrescribingDoctor(result.patientName),
                pharmacy: '',
                notes: med.instructions,
                refillsRemaining: med.refills,
                lastFilled: today.toISOString().split('T')[0],
                time: "08:00"
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
      }).catch(ocrError => {
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
      }).finally(async () => {
        // Clean up OCR resources
        await ocrProcessor.terminate();
      });
    } catch (ocrError) {
      // Handle synchronous errors in OCR setup
      console.error("OCR setup error:", ocrError);
      clearInterval(progressInterval);
      
      if (uploadStatus) uploadStatus.classList.add('hidden');
      if (uploadError) {
        uploadError.classList.remove('hidden');
        const errorMessage = uploadError.querySelector('.text-red-700') as HTMLElement;
        if (errorMessage) {
          errorMessage.innerText = `OCR setup failed: ${ocrError instanceof Error ? ocrError.message : String(ocrError)}`;
        }
      }
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
}

// Also export as default for compatibility with various import styles
export default handlePrescriptionUpload;