import { getPatientMedications, updateMedicationLog } from './helper-access'

export async function getPatientMedications(patientId: string) {
  try {
    const medications = await getPatientMedications(patientId)
    return medications.map(med => ({
      id: med.id,
      name: med.name,
      dosage: med.dosage,
      schedule: med.schedule,
      lastTaken: med.lastTaken,
      nextDose: med.nextDose
    }))
  } catch (error) {
    console.error('Error fetching patient medications:', error)
    return []
  }
}

export async function verifyMedication(medicationId: string, verificationData: {
  verifiedBy: string
  isHelper: boolean
  notes?: string
}) {
  try {
    const result = await updateMedicationLog(medicationId, {
      ...verificationData,
      timestamp: new Date().toISOString()
    })
    return result
  } catch (error) {
    console.error('Error verifying medication:', error)
    return false
  }
} 