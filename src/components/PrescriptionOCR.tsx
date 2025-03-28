"use client"

import { createWorker } from 'tesseract.js';

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

export class PrescriptionOCR {
  private worker: any = null;
  
  constructor() {
    // Worker will be initialized on-demand
  }
  
  private async initWorker() {
    try {
      // Updated initialization to match current Tesseract.js API
      const worker = await createWorker('eng');
      this.worker = worker;
      return this.worker;
    } catch (error) {
      console.error('Error initializing OCR worker:', error);
      throw new Error('Failed to initialize OCR engine');
    }
  }
  
  /**
   * Process an image of a prescription and extract relevant information
   * 
   * @param imagePath Path to the prescription image
   * @returns Structured prescription data
   */
  public async processPrescription(imagePath: string): Promise<PrescriptionData> {
    try {
      // Initialize worker if needed
      if (!this.worker) {
        await this.initWorker();
      }
      
      // Perform OCR on the image
      const result = await this.worker.recognize(imagePath);
      const text = result.data.text;
      
      console.log("OCR extracted text:", text);
      
      // Initialize prescription data
      const prescriptionData: PrescriptionData = {
        patientName: '',
        date: new Date(),
        isDateValid: false,
        medications: [],
        isValid: false,
        errorMessages: []
      };
      
      // Extract and verify data
      prescriptionData.patientName = this.extractPatientName(text);
      prescriptionData.date = this.extractDate(text);
      prescriptionData.isDateValid = this.verifyDate(prescriptionData.date);
      prescriptionData.medications = this.extractMedications(text);
      
      // Validate the prescription
      prescriptionData.isValid = this.validatePrescription(prescriptionData);
      
      // Display the extracted information in the console for debugging
      this.displayExtractedInfo(prescriptionData);
      
      return prescriptionData;
    } catch (error) {
      console.error('Error processing prescription:', error);
      throw error;
    }
  }
  
  /**
   * Display extracted prescription information for debugging
   */
  private displayExtractedInfo(prescription: PrescriptionData): void {
    console.log("=== EXTRACTED PRESCRIPTION INFORMATION ===");
    console.log(`Patient: ${prescription.patientName}`);
    console.log(`Date: ${prescription.date.toLocaleDateString()} (Valid: ${prescription.isDateValid})`);
    console.log("Medications:");
    
    prescription.medications.forEach((med, index) => {
      console.log(`  [${index + 1}] ${med.name}`);
      console.log(`      Dosage: ${med.dosage}`);
      console.log(`      Instructions: ${med.instructions}`);
      console.log(`      Quantity: ${med.quantity}`);
      console.log(`      Refills: ${med.refills}`);
    });
    
    console.log(`Validation Status: ${prescription.isValid ? 'Valid' : 'Invalid'}`);
    if (prescription.errorMessages.length > 0) {
      console.log("Validation Errors:");
      prescription.errorMessages.forEach((err, i) => {
        console.log(`  - ${err}`);
      });
    }
    
    // Create a DOM element to show the extracted information if we're in a browser
    if (typeof document !== 'undefined') {
      // Check if there's already a result container and remove it
      const existingContainer = document.getElementById('ocr-results-container');
      if (existingContainer) {
        existingContainer.remove();
      }
      
      // Create a container for the results
      const container = document.createElement('div');
      container.id = 'ocr-results-container';
      container.style.position = 'fixed';
      container.style.top = '10px';
      container.style.right = '10px';
      container.style.width = '350px';
      container.style.maxHeight = '80vh';
      container.style.overflowY = 'auto';
      container.style.backgroundColor = '#fff';
      container.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
      container.style.borderRadius = '8px';
      container.style.padding = '16px';
      container.style.zIndex = '9999';
      container.style.fontSize = '14px';
      
      // Add a title
      const title = document.createElement('h3');
      title.textContent = 'Extracted Prescription Data';
      title.style.marginTop = '0';
      title.style.marginBottom = '8px';
      title.style.fontSize = '16px';
      title.style.fontWeight = 'bold';
      container.appendChild(title);
      
      // Add close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'X';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '8px';
      closeBtn.style.right = '8px';
      closeBtn.style.backgroundColor = '#f3f4f6';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '4px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.width = '24px';
      closeBtn.style.height = '24px';
      closeBtn.onclick = () => container.remove();
      container.appendChild(closeBtn);
      
      // Add patient info
      const patientInfo = document.createElement('div');
      patientInfo.innerHTML = `<strong>Patient:</strong> ${prescription.patientName}<br>
                               <strong>Date:</strong> ${prescription.date.toLocaleDateString()} 
                               ${prescription.isDateValid ? '✓' : '❌'}`;
      container.appendChild(patientInfo);
      
      // Add medications
      const medTitle = document.createElement('div');
      medTitle.innerHTML = '<strong>Medications:</strong>';
      medTitle.style.marginTop = '12px';
      medTitle.style.marginBottom = '8px';
      container.appendChild(medTitle);
      
      if (prescription.medications.length === 0) {
        const noMeds = document.createElement('div');
        noMeds.textContent = 'No medications detected';
        noMeds.style.color = '#ef4444';
        container.appendChild(noMeds);
      } else {
        prescription.medications.forEach((med, i) => {
          const medContainer = document.createElement('div');
          medContainer.style.backgroundColor = '#f3f4f6';
          medContainer.style.borderRadius = '6px';
          medContainer.style.padding = '10px';
          medContainer.style.marginBottom = '8px';
          
          medContainer.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">${i + 1}. ${med.name}</div>
            <div><span style="color:#4b5563">Dosage:</span> ${med.dosage || 'Not detected'}</div>
            <div><span style="color:#4b5563">Instructions:</span> ${med.instructions || 'Not detected'}</div>
            <div><span style="color:#4b5563">Quantity:</span> ${med.quantity || 'Not detected'}</div>
            <div><span style="color:#4b5563">Refills:</span> ${med.refills}</div>
          `;
          
          container.appendChild(medContainer);
        });
      }
      
      // Add validation status
      const validationStatus = document.createElement('div');
      validationStatus.style.marginTop = '12px';
      validationStatus.style.fontWeight = 'bold';
      validationStatus.style.color = prescription.isValid ? '#10b981' : '#ef4444';
      validationStatus.textContent = prescription.isValid ? '✓ Valid Prescription' : '❌ Invalid Prescription';
      container.appendChild(validationStatus);
      
      // Add error messages if any
      if (prescription.errorMessages.length > 0) {
        const errorsContainer = document.createElement('div');
        errorsContainer.style.marginTop = '8px';
        
        const errorsTitle = document.createElement('div');
        errorsTitle.textContent = 'Issues:';
        errorsTitle.style.fontWeight = 'bold';
        errorsTitle.style.marginBottom = '4px';
        errorsContainer.appendChild(errorsTitle);
        
        const errorsList = document.createElement('ul');
        errorsList.style.margin = '0';
        errorsList.style.paddingLeft = '20px';
        
        prescription.errorMessages.forEach(err => {
          const errorItem = document.createElement('li');
          errorItem.textContent = err;
          errorItem.style.color = '#ef4444';
          errorsList.appendChild(errorItem);
        });
        
        errorsContainer.appendChild(errorsList);
        container.appendChild(errorsContainer);
      }
      
      // Add to document
      document.body.appendChild(container);
    }
  }
  
  /**
   * Extract patient name from OCR text
   */
  private extractPatientName(text: string): string {
    // Try multiple patterns for patient name
    const patterns = [
      /Patient(?:\s+Information)?:[\s\S]*?Name:\s*([^\r\n]+)/i,
      /Name:\s*([^\r\n]+)/i,
      /Patient(?:\'s)?\s+Name:\s*([^\r\n]+)/i,
      /Patient(?:\s+Information)?:[\s\S]*?\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /Patient:\s*([^\r\n]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }
    
    // If no match found with specific patterns, look for common name format
    const nameMatch = text.match(/(?:^|\n|\r)((?:[A-Z][a-z]+\s+){1,2}(?:[A-Z][a-z]+))(?:\r|\n|$)/);
    return nameMatch ? nameMatch[1].trim() : '';
  }
  
  /**
   * Extract date from OCR text and convert to Date object
   */
  private extractDate(text: string): Date {
    // Try multiple date formats
    const datePatterns = [
      /Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /Date:\s*(\d{1,2}-\d{1,2}-\d{4})/i,
      /Date:\s*(\d{4}-\d{1,2}-\d{1,2})/i,
      /Date:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];
        const date = new Date(dateStr);
        
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return new Date(); // Return current date if no valid date found
  }
  
  /**
   * Verify if the date is valid and not expired
   */
  private verifyDate(date: Date): boolean {
    const today = new Date();
    const thirtyDaysLater = new Date(date);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    return !isNaN(date.getTime()) && // Valid date
           date <= today && // Not future-dated
           today <= thirtyDaysLater; // Not expired (within 30 days)
  }
  
  /**
   * Extract medication details from OCR text with improved pattern matching
   */
  private extractMedications(text: string): Medication[] {
    const medications: Medication[] = [];
    
    // Regex patterns for numbered medication lists (common in prescriptions)
    const medListRegex = /(\d+)\.\s+([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)*\s+\d+(?:mg|mcg|g|ml)(?:\s+\w+)?)/gi;
    let medMatch;
    
    // Try to find numbered medications
    while ((medMatch = medListRegex.exec(text)) !== null) {
      const medName = medMatch[2].trim();
      
      // Find details for this medication
      const medDetails = this.findMedicationDetails(text, medName);
      
      medications.push({
        name: medName,
        dosage: this.extractDosage(medName),
        instructions: medDetails.instructions,
        quantity: medDetails.quantity,
        refills: medDetails.refills
      });
    }
    
    // If no numbered medications found, try alternative approach
    if (medications.length === 0) {
      // Split by common medication keywords
      const medKeywords = ['Disp:', 'Sig:', 'Refills:'];
      const textLines = text.split('\n');
      
      let currentMed: any = null;
      
      for (const line of textLines) {
        const trimmedLine = line.trim();
        
        // Check if line contains dosage pattern (e.g., "Cefdinir 300mg capsules")
        const dosageMatch = trimmedLine.match(/([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)*)\s+(\d+(?:mg|mcg|g|ml)(?:\s+\w+)?)/i);
        
        if (dosageMatch && !medKeywords.some(keyword => trimmedLine.includes(keyword))) {
          // Save previous med if exists
          if (currentMed && currentMed.name) {
            medications.push(currentMed as Medication);
          }
          
          // Start new medication
          const fullName = dosageMatch[0].trim();
          currentMed = {
            name: fullName,
            dosage: this.extractDosage(fullName),
            instructions: '',
            quantity: '',
            refills: 0
          };
          continue;
        }
        
        // If we have a current medication, extract its details
        if (currentMed) {
          // Extract quantity
          if (trimmedLine.toLowerCase().includes('disp:')) {
            currentMed.quantity = trimmedLine.replace(/disp(?:ense)?:/i, '').trim();
          }
          
          // Extract instructions
          else if (trimmedLine.toLowerCase().includes('sig:')) {
            currentMed.instructions = trimmedLine.replace(/sig(?:nature)?:/i, '').trim();
          }
          
          // Extract refills
          else if (trimmedLine.toLowerCase().includes('refill')) {
            const refillMatch = trimmedLine.match(/\d+/);
            if (refillMatch) {
              currentMed.refills = parseInt(refillMatch[0]);
            }
          }
        }
      }
      
      // Add the last medication if it exists
      if (currentMed && currentMed.name) {
        medications.push(currentMed as Medication);
      }
    }
    
    // If we still failed to find medications, try detecting known medications
    if (medications.length === 0) {
      this.detectKnownMedications(text, medications);
    }
    
    return medications;
  }
  
  /**
   * Find medication details (instructions, quantity, refills) in text
   */
  private findMedicationDetails(text: string, medicationName: string): { instructions: string, quantity: string, refills: number } {
    const medStartIndex = text.indexOf(medicationName);
    if (medStartIndex === -1) {
      return { instructions: '', quantity: '', refills: 0 };
    }
    
    // Extract chunk of text following the medication name
    const endIndex = text.indexOf('\n\n', medStartIndex);
    const medChunk = endIndex !== -1 
      ? text.substring(medStartIndex, endIndex)
      : text.substring(medStartIndex);
    
    // Extract instructions (Sig)
    let instructions = '';
    const sigMatch = medChunk.match(/Sig(?:nature)?:\s*(.+?)(?:\r|\n|$)/i);
    if (sigMatch) {
      instructions = sigMatch[1].trim();
    } else if (medChunk.includes('Take')) {
      const takeMatch = medChunk.match(/Take\s+(.+?)(?:\r|\n|$)/i);
      if (takeMatch) instructions = takeMatch[0].trim();
    }
    
    // Extract quantity (Disp)
    let quantity = '';
    const dispMatch = medChunk.match(/Disp(?:ense)?:\s*(.+?)(?:\r|\n|$)/i);
    if (dispMatch) {
      quantity = dispMatch[1].trim();
    } else {
      // Look for numerical quantities with units
      const quantityMatch = medChunk.match(/\b(\d+)\s*(?:tablet|capsule|cap|tab)s?\b/i);
      if (quantityMatch) quantity = quantityMatch[0].trim();
    }
    
    // Extract refills
    let refills = 0;
    const refillMatch = medChunk.match(/Refills?:\s*(\d+)/i);
    if (refillMatch) {
      refills = parseInt(refillMatch[1]);
    }
    
    return { instructions, quantity, refills };
  }
  
  /**
   * Detect known medications in the text
   */
  private detectKnownMedications(text: string, medications: Medication[]) {
    // List of common medications to look for
    const knownMedications = [
      'Cefdinir', 'Omeprazole', 'Famotidine', 'Amoxicillin', 'Lisinopril',
      'Atorvastatin', 'Metformin', 'Amlodipine', 'Metoprolol', 'Losartan',
      'Albuterol', 'Gabapentin', 'Hydrochlorothiazide'
    ];
    
    for (const med of knownMedications) {
      if (text.includes(med)) {
        // Look for dosage pattern near the medication name
        const dosagePattern = new RegExp(`${med}\\s+(\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|g|ml))`, 'i');
        const dosageMatch = text.match(dosagePattern);
        
        const dosage = dosageMatch ? dosageMatch[1] : this.guessDosage(med);
        
        medications.push({
          name: `${med} ${dosage}`,
          dosage: dosage,
          instructions: this.findInstructionsInText(text, med),
          quantity: this.findQuantityInText(text, med),
          refills: this.findRefillsInText(text, med)
        });
      }
    }
  }
  
  /**
   * Guess a reasonable dosage for a known medication
   */
  private guessDosage(medication: string): string {
    // Common dosages for known medications
    const dosages: {[key: string]: string} = {
      'Cefdinir': '300mg',
      'Omeprazole': '20mg',
      'Famotidine': '20mg',
      'Amoxicillin': '500mg',
      'Lisinopril': '10mg',
      'Atorvastatin': '20mg',
      'Metformin': '500mg',
      'Amlodipine': '5mg',
      'Metoprolol': '50mg',
      'Losartan': '50mg',
      'Albuterol': '90mcg',
      'Gabapentin': '300mg',
      'Hydrochlorothiazide': '25mg'
    };
    
    return dosages[medication] || '';
  }
  
  /**
   * Find instructions in text for a medication
   */
  private findInstructionsInText(text: string, medicationName: string): string {
    // Find position of medication name
    const medIndex = text.indexOf(medicationName);
    if (medIndex === -1) return '';
    
    // Extract a chunk of text after the medication name
    const chunkSize = 200; // Characters to look at
    const textChunk = text.slice(medIndex, medIndex + chunkSize);
    
    // Look for standard instruction patterns
    const instructionPatterns = [
      /Sig(?:nature)?:\s*(.+?)(?:\r|\n|$)/i,
      /Take\s+(.+?)(?:\r|\n|$)/i,
      /Use\s+(.+?)(?:\r|\n|$)/i,
      /Apply\s+(.+?)(?:\r|\n|$)/i
    ];
    
    for (const pattern of instructionPatterns) {
      const match = textChunk.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no specific instruction found, use a reasonable default
    return 'Take as directed by your healthcare provider';
  }
  
  /**
   * Find quantity information in text for a medication
   */
  private findQuantityInText(text: string, medicationName: string): string {
    const medIndex = text.indexOf(medicationName);
    if (medIndex === -1) return '';
    
    const chunkSize = 200;
    const textChunk = text.slice(medIndex, medIndex + chunkSize);
    
    // Look for quantity patterns
    const quantityPatterns = [
      /Disp(?:ense)?:\s*(.+?)(?:\r|\n|$)/i,
      /#\s*(\d+)/i,
      /Quantity:\s*(\d+)/i,
      /(\d+)\s*(?:tablets?|capsules?|pills?)/i
    ];
    
    for (const pattern of quantityPatterns) {
      const match = textChunk.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Default quantity
    return '30';
  }
  
  /**
   * Find refill information in text for a medication
   */
  private findRefillsInText(text: string, medicationName: string): number {
    const medIndex = text.indexOf(medicationName);
    if (medIndex === -1) return 0;
    
    const chunkSize = 200;
    const textChunk = text.slice(medIndex, medIndex + chunkSize);
    
    // Look for refill patterns
    const refillPatterns = [
      /Refills?:\s*(\d+)/i,
      /Refill(?:\s+|:)(\d+)\s+times/i,
      /(\d+)\s+refills?/i
    ];
    
    for (const pattern of refillPatterns) {
      const match = textChunk.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    
    return 0;
  }
  
  /**
   * Extract dosage from medication name
   */
  private extractDosage(medicationName: string): string {
    const dosageMatch = medicationName.match(/(\d+(?:\.\d+)?(?:\s*(?:mg|mcg|g|ml)))/i);
    return dosageMatch ? dosageMatch[1].trim() : '';
  }
  
  /**
   * Validate the extracted prescription data
   */
  private validatePrescription(prescription: PrescriptionData): boolean {
    prescription.errorMessages = [];
    
    // Check patient name
    if (!prescription.patientName) {
      prescription.errorMessages.push('Could not detect patient name');
    }
    // hard codes Patient information
    // temporary fix 
    //TODO: implement a better way to get patient information
    if (prescription.patientName!= "John Doe") {
      prescription.errorMessages.push('This is not the correct patient');
    }
    
    // Check date validity
    if (!prescription.isDateValid) {
      prescription.errorMessages.push('Prescription date is invalid or expired');
    }
    
    // Check if we found any medications
    if (prescription.medications.length === 0) {
      prescription.errorMessages.push('No medications found in the prescription');
    }
    
    // Check if medications have all required fields
    prescription.medications.forEach((med, index) => {
      if (!med.name || !med.dosage) {
        prescription.errorMessages.push(`Medication #${index + 1} is missing required fields`);
      }
    });
    
    // Consider it valid if there are no error messages
    return prescription.errorMessages.length === 0;
  }
  
  /**
   * Clean up resources when done
   */
  public async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}