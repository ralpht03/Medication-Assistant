export interface User {
  id: string
  name: string
  email: string
  password: string // Added password field
  role: "patient" | "admin" | "helper"
  createdAt: string
  updatedAt: string
}

export interface Medication {
  id: string
  name: string
  description: string
  dosage: string
  frequency: string
  createdAt: string
  updatedAt: string
}

export interface Prescription {
  id: string
  patientId: string
  medicationId: string
  prescribedById: string
  startDate: string
  endDate: string
  instructions: string
  status: "active" | "completed" | "cancelled"
  createdAt: string
  updatedAt: string
}

export interface AdherenceRecord {
  id: string
  prescriptionId: string
  patientId: string
  medicationId: string
  takenAt: string
  status: "taken" | "missed" | "delayed"
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface DatabaseSchema {
  users: User[]
  medications: Medication[]
  prescriptions: Prescription[]
  adherenceRecords: AdherenceRecord[]
}