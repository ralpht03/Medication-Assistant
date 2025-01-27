import fs from 'fs/promises'
import path from 'path'
import { DatabaseSchema, User, Medication, Prescription, AdherenceRecord } from './types'

const DB_PATH = path.join(process.cwd(), 'db.json')

// Helper function to read the database
async function readDB(): Promise<DatabaseSchema> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading database:', error)
    throw new Error('Failed to read database')
  }
}

// Helper function to write to the database
async function writeDB(data: DatabaseSchema): Promise<void> {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error writing to database:', error)
    throw new Error('Failed to write to database')
  }
}

// Type guard for collection names
function isValidCollection(collection: string): collection is keyof DatabaseSchema {
  return ['users', 'medications', 'prescriptions', 'adherenceRecords'].includes(collection)
}

// Collection-specific operations
export const users = {
  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const db = await readDB()
    const now = new Date().toISOString()
    const newUser: User = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    db.users.push(newUser)
    await writeDB(db)
    return newUser
  },

  async read(id: string): Promise<User | null> {
    const db = await readDB()
    return db.users.find(user => user.id === id) || null
  },

  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null> {
    const db = await readDB()
    const index = db.users.findIndex(user => user.id === id)
    if (index === -1) return null

    const updatedUser: User = {
      ...db.users[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    db.users[index] = updatedUser
    await writeDB(db)
    return updatedUser
  },

  async delete(id: string): Promise<boolean> {
    const db = await readDB()
    const initialLength = db.users.length
    db.users = db.users.filter(user => user.id !== id)
    if (db.users.length === initialLength) return false
    await writeDB(db)
    return true
  },

  async query(filters: Partial<User> = {}): Promise<User[]> {
    const db = await readDB()
    return db.users.filter(user =>
      Object.entries(filters).every(([key, value]) => user[key as keyof User] === value)
    )
  },
}

export const medications = {
  async create(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication> {
    const db = await readDB()
    const now = new Date().toISOString()
    const newMedication: Medication = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    db.medications.push(newMedication)
    await writeDB(db)
    return newMedication
  },

  async read(id: string): Promise<Medication | null> {
    const db = await readDB()
    return db.medications.find(med => med.id === id) || null
  },

  async update(id: string, data: Partial<Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Medication | null> {
    const db = await readDB()
    const index = db.medications.findIndex(med => med.id === id)
    if (index === -1) return null

    const updatedMedication: Medication = {
      ...db.medications[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    db.medications[index] = updatedMedication
    await writeDB(db)
    return updatedMedication
  },

  async delete(id: string): Promise<boolean> {
    const db = await readDB()
    const initialLength = db.medications.length
    db.medications = db.medications.filter(med => med.id !== id)
    if (db.medications.length === initialLength) return false
    await writeDB(db)
    return true
  },

  async query(filters: Partial<Medication> = {}): Promise<Medication[]> {
    const db = await readDB()
    return db.medications.filter(med =>
      Object.entries(filters).every(([key, value]) => med[key as keyof Medication] === value)
    )
  },
}

export const prescriptions = {
  async create(data: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prescription> {
    const db = await readDB()
    const now = new Date().toISOString()
    const newPrescription: Prescription = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    db.prescriptions.push(newPrescription)
    await writeDB(db)
    return newPrescription
  },

  async read(id: string): Promise<Prescription | null> {
    const db = await readDB()
    return db.prescriptions.find(prescription => prescription.id === id) || null
  },

  async update(id: string, data: Partial<Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Prescription | null> {
    const db = await readDB()
    const index = db.prescriptions.findIndex(prescription => prescription.id === id)
    if (index === -1) return null

    const updatedPrescription: Prescription = {
      ...db.prescriptions[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    db.prescriptions[index] = updatedPrescription
    await writeDB(db)
    return updatedPrescription
  },

  async delete(id: string): Promise<boolean> {
    const db = await readDB()
    const initialLength = db.prescriptions.length
    db.prescriptions = db.prescriptions.filter(prescription => prescription.id !== id)
    if (db.prescriptions.length === initialLength) return false
    await writeDB(db)
    return true
  },

  async query(filters: Partial<Prescription> = {}): Promise<Prescription[]> {
    const db = await readDB()
    return db.prescriptions.filter(prescription =>
      Object.entries(filters).every(([key, value]) => prescription[key as keyof Prescription] === value)
    )
  },
}

export const adherenceRecords = {
  async create(data: Omit<AdherenceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdherenceRecord> {
    const db = await readDB()
    const now = new Date().toISOString()
    const newRecord: AdherenceRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    db.adherenceRecords.push(newRecord)
    await writeDB(db)
    return newRecord
  },

  async read(id: string): Promise<AdherenceRecord | null> {
    const db = await readDB()
    return db.adherenceRecords.find(record => record.id === id) || null
  },

  async update(id: string, data: Partial<Omit<AdherenceRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AdherenceRecord | null> {
    const db = await readDB()
    const index = db.adherenceRecords.findIndex(record => record.id === id)
    if (index === -1) return null

    const updatedRecord: AdherenceRecord = {
      ...db.adherenceRecords[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    db.adherenceRecords[index] = updatedRecord
    await writeDB(db)
    return updatedRecord
  },

  async delete(id: string): Promise<boolean> {
    const db = await readDB()
    const initialLength = db.adherenceRecords.length
    db.adherenceRecords = db.adherenceRecords.filter(record => record.id !== id)
    if (db.adherenceRecords.length === initialLength) return false
    await writeDB(db)
    return true
  },

  async query(filters: Partial<AdherenceRecord> = {}): Promise<AdherenceRecord[]> {
    const db = await readDB()
    return db.adherenceRecords.filter(record =>
      Object.entries(filters).every(([key, value]) => record[key as keyof AdherenceRecord] === value)
    )
  },
}

// Export all operations as a single object
export const db = {
  users,
  medications,
  prescriptions,
  adherenceRecords,
}

export default db