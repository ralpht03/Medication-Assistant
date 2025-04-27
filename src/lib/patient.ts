import { getUserById } from './helper-access'
import { createTableClient } from './azure-tables'
import { Notification } from './types'
import { v4 as uuidv4 } from 'uuid'

const NOTIFICATIONS_TABLE = 'Notifications'

export async function getPatientDetails(patientId: string) {
  try {
    const patient = await getUserById(patientId)
    if (!patient || patient.role !== 'patient') {
      return null
    }

    return {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      profilePictureUrl: patient.profilePictureUrl,
      emergencyContact: patient.emergencyContact
    }
  } catch (error) {
    console.error('Error fetching patient details:', error)
    return null
  }
}

export async function createNotification(
  userId: string,
  type: Notification['type'],
  message: string
): Promise<void> {
  const tableClient = await createTableClient(NOTIFICATIONS_TABLE)
  
  const notification: Notification = {
    PartitionKey: userId,
    RowKey: uuidv4(),
    type,
    message,
    createdAt: new Date().toISOString(),
    read: false
  }

  await tableClient.createEntity(notification)
}

export async function createAdminInvitationNotification(patientId: string, adminName: string): Promise<void> {
  const tableClient = await createTableClient(NOTIFICATIONS_TABLE)
  
  const notification: Notification = {
    PartitionKey: patientId,
    RowKey: uuidv4(),
    type: 'info',
    message: `${adminName} has sent you an invitation. Please check your invitations page to accept or decline.`,
    createdAt: new Date().toISOString(),
    read: false,
    isAdminInvite: true
  }

  await tableClient.createEntity(notification)
}

export async function createHelperAcceptanceNotification(
  patientId: string, 
  helperName: string, 
  status: 'accepted' | 'declined',
  actorId: string
): Promise<void> {
  const tableClient = await createTableClient(NOTIFICATIONS_TABLE)
  
  const notification: Notification = {
    PartitionKey: patientId,
    RowKey: uuidv4(),
    type: 'info',
    message: status === 'accepted' 
      ? `${helperName} has accepted your invitation to help manage your medications.`
      : `${helperName} has declined your invitation to help manage your medications.`,
    createdAt: new Date().toISOString(),
    read: false,
    helperName,
    actorId,
    status
  }

  await tableClient.createEntity(notification)
}

export async function createMedicationReminderNotification(patientId: string, medications: string[]): Promise<void> {
  const tableClient = await createTableClient(NOTIFICATIONS_TABLE)
  
  const notification: Notification = {
    PartitionKey: patientId,
    RowKey: uuidv4(),
    type: 'warning',
    message: `Today's medications to take: ${medications.join(', ')}`,
    createdAt: new Date().toISOString(),
    read: false
  }

  await tableClient.createEntity(notification)
} 