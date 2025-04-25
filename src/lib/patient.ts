import { getUserById } from './helper-access'

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