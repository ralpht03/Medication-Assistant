export interface Medication {
    PartitionKey: string;
    RowKey: string;
    name: string;
    dosage: string;
    recommendedPillCount: string;
    frequency: string;
    time?: string;
    instructions?: string;
    patientId: string;
    route?: string;
    startDate?: string;
    endDate?: string;
    verificationMethod?: 'manual-entry' | 'live-feed' | 'patient-helper';
    prescribingDoctor?: string;
    pharmacy?: string;
    notes?: string;
    refillsRemaining?: string;
    lastFilled?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface AzureTableUser {
    PartitionKey: string;
    RowKey: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'patient' | 'doctor' | 'nurse';
    dateOfBirth?: string;
    phoneNumber?: string;
    address?: string;
    emergencyContact?: string;
    createdAt: string;
    updatedAt: string;
    linkedPatients?: string;
    linkedHelpers?: string;
  }
  
  export interface AzureTablePatient {
    PartitionKey: string;
    RowKey: string;
    profile: string; // Stringified JSON object
    medicalHistory: string; // Stringified JSON object
    allergies: string; // Stringified JSON array
    currentMedications: string; // Stringified JSON array
    adminIds: string; // Stringified JSON array of admin IDs
    updatedAt?: string;
  }
  
  export interface SignupData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'patient' | 'doctor' | 'nurse';
    dateOfBirth?: string;
    phoneNumber?: string;
    address?: string;
    emergencyContact?: string;
    adminId?: string; // New field to assign a patient to an admin during signup
  }
  
  export interface LoginData {
    email: string;
    password: string;
  }
  
  export interface AuthResult {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    token: string;
  }
  
  export interface PatientAssignmentData {
    patientId: string;
    adminId: string;
  }
  
  export interface PatientProfile {
    height?: string;
    weight?: string;
    bloodType?: string;
    dob?: string;
    gender?: string;
    preferredLanguage?: string;
    primaryCarePhysician?: string;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
    [key: string]: any; // Allow for additional profile fields
  }
  
  export interface MedicalHistory {
    conditions?: string[];
    surgeries?: Array<{
      procedure: string;
      date: string;
      notes?: string;
    }>;
    hospitalizations?: Array<{
      reason: string;
      startDate: string;
      endDate: string;
      facility?: string;
      notes?: string;
    }>;
    familyHistory?: Record<string, string[]>;
    [key: string]: any; // Allow for additional medical history fields
  }
  
  export interface Allergy {
    substance: string;
    severity: 'mild' | 'moderate' | 'severe';
    reaction: string;
    diagnosed: string; // Date
    notes?: string;
  }
  
  export interface MedicationSummary {
    name: string;
    dosage: string;
    frequency: string;
    startDate?: string;
  }