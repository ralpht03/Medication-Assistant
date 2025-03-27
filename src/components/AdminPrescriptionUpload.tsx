"use client"

import React, { useState, useEffect } from 'react';
import { FileText, Upload, FileUp, Search, Check, AlertCircle, ChevronDown } from 'lucide-react';
import handlePrescriptionUpload from '@/components/handlePrescriptionUpload';
import { createTableClient } from '@/lib/azure-table-utils';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const AdminPrescriptionUpload = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [progress, setProgress] = useState(0);

  // Fetch patients for admin
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true);
        
        // Get admin ID from local storage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          console.error('User data not found in localStorage');
          setIsLoading(false);
          return;
        }
        
        const user = JSON.parse(userStr);
        const adminId = user.id || user.rowKey;
        
        if (!adminId) {
          console.error('Admin ID not found in user data');
          setIsLoading(false);
          return;
        }
        
        // Create table clients
        const usersTableClient = createTableClient('Users');
        const adminPatientRelationsTableClient = createTableClient('AdminPatientRelations');
        
        // Get all relations for this admin
        const filter = `PartitionKey eq '${adminId}'`;
        const relations = adminPatientRelationsTableClient.listEntities({ queryOptions: { filter } });
        
        const patientsList: Patient[] = [];
        
        for await (const relation of relations) {
          try {
            // Get the patient user info
            const patientId = relation.patientId as string;
            const patientUser = await usersTableClient.getEntity('USER', patientId);
            
            patientsList.push({
              id: patientUser.rowKey as string,
              firstName: patientUser.firstName as string,
              lastName: patientUser.lastName as string,
              email: patientUser.email as string
            });
          } catch (error) {
            console.error('Error processing patient relation:', error);
          }
        }
        
        setPatients(patientsList);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching patients:', error);
        setIsLoading(false);
      }
    };
    
    fetchPatients();
  }, []);

  // Handle file upload for the selected patient
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPatient) {
      setUploadStatus('error');
      setErrorMessage('Please select a patient first');
      return;
    }
    
    // Reset status
    setUploadStatus('uploading');
    setProgress(0);
    
    try {
      // Store the current patient in localStorage temporarily
      // This is needed because handlePrescriptionUpload expects patient data in localStorage
      const originalUserData = localStorage.getItem('user');
      localStorage.setItem('user', JSON.stringify({
        id: selectedPatient.id,
        rowKey: selectedPatient.id,
        firstName: selectedPatient.firstName,
        lastName: selectedPatient.lastName,
        email: selectedPatient.email
      }));
      
      // Set up progress tracking
      const progressInterval = setInterval(() => {
        setProgress(prevProgress => {
          const newProgress = prevProgress + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);
      
      // Custom event listeners to track upload status
      const setupEventListeners = () => {
        const statusContainer = document.getElementById('upload-status');
        const successContainer = document.getElementById('upload-success');
        const errorContainer = document.getElementById('upload-error');
        
        // Create mutation observer to detect when status elements change visibility
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              const target = mutation.target as HTMLElement;
              
              if (target.id === 'upload-success' && !target.classList.contains('hidden')) {
                clearInterval(progressInterval);
                setProgress(100);
                setUploadStatus('success');
              } else if (target.id === 'upload-error' && !target.classList.contains('hidden')) {
                clearInterval(progressInterval);
                setProgress(0);
                setUploadStatus('error');
                
                // Get error message
                const errorMsgElement = target.querySelector('.text-red-700');
                setErrorMessage(errorMsgElement ? errorMsgElement.textContent || 'Upload failed' : 'Upload failed');
              }
            }
          });
        });
        
        // Observe the status elements
        if (statusContainer) observer.observe(statusContainer, { attributes: true });
        if (successContainer) observer.observe(successContainer, { attributes: true });
        if (errorContainer) observer.observe(errorContainer, { attributes: true });
        
        return () => observer.disconnect();
      };
      
      // Add event listeners
      const cleanup = setupEventListeners();
      
      // Call the prescription upload handler
      handlePrescriptionUpload(event);
      
      // Cleanup after 10 seconds if no status change observed
      setTimeout(() => {
        clearInterval(progressInterval);
        cleanup();
        
        // Check if we're still in uploading state and if so, assume error
        if (uploadStatus === 'uploading') {
          setUploadStatus('error');
          setErrorMessage('Upload timed out. Please try again.');
        }
        
        // Restore original user data
        if (originalUserData) {
          localStorage.setItem('user', originalUserData);
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error uploading prescription:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setProgress(0);
      
      // Restore original user data
      const originalUserData = localStorage.getItem('user');
      if (originalUserData) {
        localStorage.setItem('user', originalUserData);
      }
    }
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const email = patient.email.toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || email.includes(term);
  });

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Prescription Upload</h2>
            <p className="text-gray-600 mt-1">Assign medications to patients by uploading prescriptions</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="flex-1 w-full">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Select Patient</h3>
              
              <div className="relative">
                <div className="flex">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    className={`relative px-4 py-2 border border-l-0 border-gray-300 rounded-r-md text-sm font-medium ${
                      selectedPatient 
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                  >
                    <div className="flex items-center">
                      {selectedPatient 
                        ? `${selectedPatient.firstName} ${selectedPatient.lastName}` 
                        : 'Select Patient'}
                      <ChevronDown size={16} className="ml-2" />
                    </div>
                  </button>
                </div>
                
                {isPatientDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    {isLoading ? (
                      <div className="p-3 text-center text-gray-500">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-1"></div>
                        Loading patients...
                      </div>
                    ) : filteredPatients.length === 0 ? (
                      <div className="p-3 text-center text-gray-500">
                        {searchTerm 
                          ? 'No patients match your search' 
                          : 'No patients available'}
                      </div>
                    ) : (
                      filteredPatients.map(patient => (
                        <button
                          key={patient.id}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setIsPatientDropdownOpen(false);
                          }}
                        >
                          <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                          <div className="text-xs text-gray-500">{patient.email}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                <div className="flex items-start">
                  <AlertCircle size={18} className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Important Information</h4>
                    <ul className="mt-1 text-sm text-blue-700 space-y-1 pl-5 list-disc">
                      <li>Select a patient before uploading a prescription</li>
                      <li>Supported formats: PNG, PDF (up to 10MB)</li>
                      <li>Make sure the prescription is clear and legible</li>
                      <li>The system will use OCR to extract medication details</li>
                      <li>Verify the extracted information before finalizing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full sm:w-auto sm:min-w-[300px]">
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              selectedPatient 
                ? 'border-blue-300 hover:border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-gray-50'
            }`}>
              <input
                type="file"
                id="admin-prescription-upload"
                className="hidden"
                accept=".png,.pdf"
                onChange={handleFileUpload}
                disabled={!selectedPatient || uploadStatus === 'uploading'}
              />
              <label
                htmlFor="admin-prescription-upload"
                className={`cursor-pointer block w-full ${!selectedPatient && 'opacity-50 pointer-events-none'}`}
              >
                {uploadStatus === 'uploading' ? (
                  <div className="space-y-3">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-blue-100">
                      <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-sm font-medium text-blue-700">Uploading prescription...</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500">{progress}% complete</p>
                  </div>
                ) : uploadStatus === 'success' ? (
                  <div className="space-y-3">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-green-100">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-green-700">Prescription uploaded successfully!</p>
                    <p className="text-xs text-gray-600">Medications have been assigned to the patient</p>
                    <button 
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      onClick={(e) => {
                        e.preventDefault();
                        setUploadStatus('idle');
                      }}
                    >
                      Upload another prescription
                    </button>
                  </div>
                ) : uploadStatus === 'error' ? (
                  <div className="space-y-3">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-100">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <p className="text-sm font-medium text-red-700">Upload failed</p>
                    <p className="text-xs text-red-600">{errorMessage}</p>
                    <button 
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      onClick={(e) => {
                        e.preventDefault();
                        setUploadStatus('idle');
                      }}
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-blue-100">
                      <FileUp className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-blue-600">
                      {selectedPatient 
                        ? `Upload prescription for ${selectedPatient.firstName} ${selectedPatient.lastName}` 
                        : 'Select a patient first'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Click to select file or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">PNG or PDF up to 10MB</p>
                  </div>
                )}
              </label>
            </div>

            <div className="mt-4">
              <button
                className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                  !selectedPatient || uploadStatus === 'uploading'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                }`}
                onClick={() => document.getElementById('admin-prescription-upload')?.click()}
                disabled={!selectedPatient || uploadStatus === 'uploading'}
              >
                <Upload size={18} />
                Upload Prescription
              </button>
            </div>
          </div>
        </div>
        
        {/* Hidden status containers used by handlePrescriptionUpload utility */}
        <div id="upload-status" className="hidden">
          <div className="flex items-center gap-3">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '0%' }}></div>
            </div>
            <span className="text-sm text-gray-600">0%</span>
          </div>
          <p className="text-sm text-blue-600 mt-2">Uploading prescription...</p>
        </div>
        
        <div id="upload-success" className="hidden mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Prescription successfully uploaded!
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Medications have been successfully added to the patient's profile.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div id="upload-error" className="hidden mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  Upload failed!
                </p>
                <p className="mt-1 text-sm text-red-700">
                  Please check your file format and try again. Only PNG and PDF formats are supported.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Extracted information preview (will be populated by PrescriptionOCR) */}
        <div id="ocr-results-container" className="hidden"></div>
      </div>
    </div>
  );
};

export default AdminPrescriptionUpload;