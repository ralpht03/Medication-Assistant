export interface DatabaseSchema {
  users: User[];
  medications: Medication[];
  prescriptions: Prescription[];
  adherenceRecords: AdherenceRecord[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'patient' | 'admin' | 'helper';
  createdAt: string;
  updatedAt: string;
}

export interface AzureTableUser {
  partitionKey: string; // "USER"
  rowKey: string; // User ID (UUID)
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  emergencyContact?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  linkedPatients?: string; // JSON array of patient IDs
}

export interface AzureTablePatient {
  partitionKey: string; // "PATIENT"
  rowKey: string; // User ID (UUID)
  profile?: string; // JSON object
  medicalHistory?: string; // JSON object
  allergies?: string; // JSON array
  currentMedications?: string; // JSON array
}

export interface Medication {
  partitionKey: string; // The partition key for the entity, used for grouping entities together (e.g., patientId)
  rowKey: string; // The row key for the entity, used for uniquely identifying the entity within the partition
  name: string; // Name of the medication
  dosage: string; // Dosage of the medication
  frequency: string; // Frequency of the medication
  time: string; // Time of day to take the medication
  instructions?: string; // Special instructions for taking the medication (optional)
}

export interface Prescription {
  id: string;
  patientId: string;
  medicationId: string;
  prescribedById: string;
  startDate: string;
  endDate: string;
  instructions: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface AdherenceRecord {
  id: string;
  prescriptionId: string;
  patientId: string;
  medicationId: string;
  takenAt: string;
  status: 'taken' | 'missed' | 'delayed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  emergencyContact?: string;
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