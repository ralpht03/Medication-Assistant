import { getUserById } from './helper-access'

export const verifyHelperAccess = async (helperId: string, patientId: string): Promise<boolean> => {
  try {
    console.log('Verifying access for helper:', helperId, 'and patient:', patientId)
    const helper = await getUserById(helperId)
    console.log('Helper data:', helper)
    
    if (!helper) {
      console.log('Helper not found')
      return false
    }

    // Parse the linkedPatients JSON string
    const linkedPatients = helper.linkedPatients ? JSON.parse(helper.linkedPatients) : []
    console.log('Linked patients:', linkedPatients)
    
    const hasAccess = linkedPatients.includes(patientId)
    console.log('Access granted:', hasAccess)
    return hasAccess
  } catch (error) {
    console.error('Error verifying helper access:', error)
    return false
  }
} 