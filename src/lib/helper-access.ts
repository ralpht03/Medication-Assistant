import { UserService, MedicationService } from './azure-tables'
import { AzureTableUser, Medication as AzureMedication } from './azure-tables-types'
import { TableClient, odata } from '@azure/data-tables'
import { createTableClient } from './azure-tables'

const userService = new UserService()
const medicationService = new MedicationService()
const usersTableClient = createTableClient('Users')

interface User {
  id: string
  name: string
  email: string
  role: 'patient' | 'helper' | 'admin'
  profilePictureUrl?: string
  emergencyContact?: {
    name: string
    phone: string
  }
  linkedPatients?: string
  linkedHelpers?: string
}

interface Medication {
  id: string
  name: string
  dosage: string
  schedule: {
    time: string
    days: string[]
  }
  lastTaken?: string
  nextDose?: string
}

interface MedicationLog {
  medicationId: string
  verifiedBy: string
  isHelper: boolean
  notes?: string
  timestamp: string
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    console.log('Looking up user with ID:', id)
    // Search across all possible roles
    const roles = ['admin', 'patient', 'helper']
    for (const role of roles) {
      const filter = odata`PartitionKey eq ${role} and RowKey eq ${id}`
      console.log('Trying role:', role, 'with filter:', filter)
      const entities = usersTableClient.listEntities<AzureTableUser>({ queryOptions: { filter } })
      
      for await (const user of entities) {
        console.log('Found user:', user)
        return {
          id: user.rowKey,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role?.toLowerCase() as 'patient' | 'helper' | 'admin',
          emergencyContact: user.emergencyContact ? JSON.parse(user.emergencyContact) : undefined,
          linkedPatients: user.linkedPatients,
          linkedHelpers: user.linkedHelpers
        }
      }
    }
    console.log('No user found with ID:', id)
    return null
  } catch (error) {
    console.error('Error getting user by ID:', error)
    return null
  }
}

export async function getPatientMedications(patientId: string): Promise<Medication[]> {
  try {
    const medications = await medicationService.getMedications(patientId)
    return medications.map(med => ({
      id: med.rowKey,
      name: med.name,
      dosage: med.dosage,
      schedule: {
        time: med.time || '',
        days: med.frequency ? med.frequency.split(',') : []
      },
      lastTaken: med.lastFilled,
      nextDose: med.endDate
    }))
  } catch (error) {
    console.error('Error getting patient medications:', error)
    return []
  }
}

export async function updateMedicationLog(medicationId: string, log: MedicationLog): Promise<boolean> {
  try {
    const medication = await medicationService.getMedicationById(medicationId, medicationId)
    if (!medication) {
      return false
    }

    const updatedMedication = {
      ...medication,
      lastFilled: log.timestamp,
      verificationMethod: log.isHelper ? 'patient-helper' : 'manual-entry',
      notes: log.notes
    }

    await medicationService.updateMedication(medicationId, medicationId, updatedMedication)
    return true
  } catch (error) {
    console.error('Error updating medication log:', error)
    return false
  }
} 