export interface Medication {
    partitionKey: string;
    rowKey: string;
    name: string;
    dosage: string;
    frequency: string;
    time: string;
    instructions?: string;
    startDate?: string;
    endDate?: string;
    verificationMethod?: string;
    prescribingDoctor?: string;
    pharmacy?: string;
    notes?: string;
    refillsRemaining?: number;
    lastFilled?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface AzureTableUser {
    partitionKey: string;
    rowKey: string;
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
  }
  
  export interface AzureTablePatient {
    partitionKey: string;
    rowKey: string;
    profile: string; // Stringified JSON object
    medicalHistory: string; // Stringified JSON object
    allergies: string; // Stringified JSON array
    currentMedications: string; // Stringified JSON array
    adminIds: string; // Stringified JSON array of admin IDs
    updatedAt?: string;
  }
  
  export interface AzureTableAdminPatientRelation {
    partitionKey: string; // adminId
    rowKey: string; // patientId-relationId
    patientId: string;
    adminId: string;
    createdAt: string;
    status: 'active' | 'inactive' | 'pending';
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