export interface Adherence {
  PartitionKey: string
  RowKey: string
  Timestamp: string
  patientId: string
  adherencePercentage: string
  dailyAdherence: string
}

export interface Alerts {
  PartitionKey: string
  RowKey: string
  Timestamp: string
  userId: string
  medicationId: string
  type: string
  message: string
  read: boolean
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
  PartitionKey: string
  RowKey: string
  Timestamp: string
  patientId: string
  method: string
  verified: boolean
  verificationData: string
  imageUrl: string
  pillImageUrl: string
  helperId: string
  patientConfirmation: boolean
  helperConfirmation: boolean
}

export interface DashboardMedication extends Medications {
  id: string;
  time: string;
  status: 'taken' | 'missed' | 'upcoming';
  isOverdue: boolean;
  isCurrent: boolean;
}

export interface DatabaseSchema {
  Adherence: Adherence[]
  Alerts: Alerts[]
  Medications: Medications[]
  Patients: Patients[]
  Settings: Settings[]
  Users: Users[]
  VerificationLogs: VerificationLogs[]
}