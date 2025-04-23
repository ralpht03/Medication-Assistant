export interface Alerts {
  PartitionKey: string // patientId
  RowKey: string
  Timestamp: string
  userId: string
  medicationId: string
  type: string
  message: string
  read: boolean
  priority?: string
}

export interface Medications {
  PartitionKey: string
  RowKey: string
  Timestamp: string
  patientId: string
  name: string
  description: string
  dosage: string
  frequency: string
  startDate: string
  endDate: string
  prescribedDoctor: string
  pharmacy: string
  notes: string
  refillsRemaining: string
  lastFilledDate: string
  recommendedPillCount: string
}

export interface Patients {
  PartitionKey: string
  RowKey: string
  Timestamp: string
  userId: string
  firstName: string
  lastName: string
  medicalHistory: string
  allergies: string
  currentMedications: string
}

export interface Settings {
  partitionKey: string;
  rowKey: string;
  userId: string;
  notifications: string;
  timezone: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface Users {
  PartitionKey: string
  Rowkey: string
  Timestamp: string
  role: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  dateOfBirth: string
  phoneNumber: string
  address: string
  emergencyContactName: string
  createdAt: string
  updatedAt: string
  linkedPatients: string
}

export interface VerificationLogs {
  PartitionKey: string;    // patientId
  RowKey: string;         // timestamp
  Timestamp: string;      // Azure timestamp
  medicationName: string;
  medicationId: string;   // Link to medication
  pillCount: string;      // Actual pills taken
  recommendedPillCount: string; // Recommended dosage
  timeTaken: string;      // When medication was taken
  status: 'taken' | 'missed' | 'skipped';
  notes: string;          // Any additional notes
  verificationMethod: 'camera' | 'manual' | 'helper'; // How it was verified
  isCorrectDose: boolean; // Whether pillCount matches recommendedCount
}

export interface DashboardMedication extends Medications {
  id: string;
  time: string;
  status: 'taken' | 'missed' | 'upcoming';
  isOverdue: boolean;
  isCurrent: boolean;
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
  time?: string; // Time of day to take the medication
  instructions?: string; // Special instructions for taking the medication (optional)
  
  // New fields for medication assignment
  route?: string; // Route of administration
  startDate?: string; // Start date
  endDate?: string; // End date
  verificationMethod?: 'manual-entry' | 'live-feed' | 'patient-helper'; // Verification method
  prescribingDoctor?: string; // Prescribing doctor
  pharmacy?: string; // Pharmacy
  notes?: string; // Notes
  refillsRemaining?: string; // Refills remaining
  lastFilled?: string; // Last filled date
  patientId?: string; // Patient ID
  recommendedPillCount?: string; // Recommended pill count
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

export interface DatabaseSchema {
  Alerts: Alerts[]
  Medications: Medications[]
  Patients: Patients[]
  Settings: Settings[]
  Users: Users[]
  VerificationLogs: VerificationLogs[]
  users: User[];
  medications: Medication[];
  prescriptions: Prescription[];
}