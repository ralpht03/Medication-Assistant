import { NextResponse } from 'next/server';
import { MedicationService } from '@/lib/azure-tables';
import { OpenAIService } from '@/lib/openai-service';
import { Medications } from '@/lib/types';

// Initialize services
let medicationService: MedicationService;
let openAIService: OpenAIService;

try {
  medicationService = new MedicationService();
  openAIService = new OpenAIService();
} catch (error) {
  console.error('Error initializing services:', error);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const medicationId = searchParams.get('medicationId');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Log environment variables (without sensitive data)
    console.log('Environment check:', {
      hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
      tableName: process.env.AZURE_STORAGE_TABLE_NAME
    });

    // If medicationId is provided, fetch a single medication
    if (medicationId) {
      console.log(`Fetching medication ${medicationId} for patient: ${patientId}`);
      const medication = await medicationService.getMedicationById(patientId, medicationId);
      
      if (!medication) {
        return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
      }
      
      return NextResponse.json({ medication });
    }

    // Otherwise, fetch all medications for the patient
    console.log('Fetching all medications for patient:', patientId);
    const medications = await medicationService.getMedications(patientId);
    console.log('Retrieved medications:', medications);

    return NextResponse.json({ medications });
  } catch (error) {
    console.error('Error fetching medications:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch medications', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      patientId,
      medicationId,
      medication,
      question,
      // Direct fields for medication assignment
      name,
      dosage,
      frequency,
      route,
      startDate,
      endDate,
      verificationMethod,
      prescribingDoctor,
      pharmacy,
      notes,
      refillsRemaining,
      lastFilled,
      recommendedPillCount
    } = body;

    // Ensure patientId is provided for all operations
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Handle direct medication creation (from medication assignment modal)
    if (!action && name && dosage && frequency && route && startDate && endDate && verificationMethod) {
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
      }

      // Validate verification method
      const validMethods = ['manual-entry', 'live-feed', 'patient-helper'];
      if (!validMethods.includes(verificationMethod)) {
        return NextResponse.json({ error: 'Invalid verification method' }, { status: 400 });
      }

      const newMedication = {
        name,
        dosage,
        frequency,
        route,
        startDate,
        endDate,
        verificationMethod,
        prescribingDoctor: prescribingDoctor || '',
        pharmacy: pharmacy || '',
        notes: notes || '',
        refillsRemaining: refillsRemaining || 0,
        recommendedPillCount: recommendedPillCount || '1',
        lastFilled: lastFilled || '',
        time: '08:00' // Default time
      };
      
      const createdMedication = await medicationService.addMedication(newMedication, patientId);
      return NextResponse.json({
        message: 'Medication created successfully',
        medication: createdMedication
      });
    }
    
    // Handle legacy medication creation if no action is specified
    if (!action && medication?.name && medication?.dosage) {
      const newMedication = {
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency || 'daily',
        time: medication.time || '08:00',
        instructions: medication.instructions || ''
      };
      
      const createdMedication = await medicationService.addMedication(newMedication, patientId);
      return NextResponse.json({
        message: 'Medication created successfully',
        medication: createdMedication
      });
    }

    console.log('Processing action:', action);

    // Handle different medication service actions
    switch (action) {
      // CRUD Operations
      case 'create':
        if (!medication) {
          return NextResponse.json({ error: 'Medication data is required' }, { status: 400 });
        }
        const createdMedication = await medicationService.addMedication(medication, patientId);
        return NextResponse.json({ 
          message: 'Medication created successfully',
          medication: createdMedication 
        });

      case 'update':
        if (!medicationId) {
          return NextResponse.json({ error: 'Medication ID is required' }, { status: 400 });
        }
        if (!medication) {
          return NextResponse.json({ error: 'Medication updates are required' }, { status: 400 });
        }
        const updatedMedication = await medicationService.updateMedication(patientId, medicationId, medication);
        if (!updatedMedication) {
          return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
        }
        return NextResponse.json({ 
          message: 'Medication updated successfully',
          medication: updatedMedication 
        });

      case 'delete':
        if (!medicationId) {
          return NextResponse.json({ error: 'Medication ID is required' }, { status: 400 });
        }
        const deleted = await medicationService.deleteMedication(patientId, medicationId);
        if (!deleted) {
          return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Medication deleted successfully' });

      case 'deleteAll':
        await medicationService.deleteAllMedications(patientId);
        return NextResponse.json({ message: 'All medications deleted successfully' });

      // OpenAI Service Actions
      case 'info':
        if (!medication?.name) {
          return NextResponse.json({ error: 'Medication name is required' }, { status: 400 });
        }
        const infoResult = await openAIService.getMedicationInfo(medication.name);
        return NextResponse.json({ info: infoResult });

      case 'sideEffects':
        if (!medication?.name) {
          return NextResponse.json({ error: 'Medication name is required' }, { status: 400 });
        }
        const effectsResult = await openAIService.getSideEffects(medication.name);
        return NextResponse.json({ effects: effectsResult });

      case 'interactions':
        const medications = body.medications || await medicationService.getMedications(patientId);
        const interactionsResult = await openAIService.checkInteractions(medications);
        return NextResponse.json({ interactions: interactionsResult });

      case 'missedDose':
        if (!medication) {
          return NextResponse.json({ error: 'Medication data is required' }, { status: 400 });
        }
        const missedDoseResult = await openAIService.handleMissedDose(medication);
        return NextResponse.json({ guidance: missedDoseResult });

      case 'emergency':
        if (!question) {
          return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }
        const emergencyResult = await openAIService.handleEmergencyQuestion(question, medication);
        return NextResponse.json({ response: emergencyResult });

      case 'schedule':
        const medsForSchedule = body.medications || await medicationService.getMedications(patientId);
        const scheduleResult = await openAIService.getDailySchedule(medsForSchedule);
        return NextResponse.json({ schedule: scheduleResult });
        
      case 'generalInfo':
        // Handle general medical questions without medication context
        if (!question) {
          return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }
        const generalInfoResult = await openAIService.getGeneralMedicalInfo(question);
        return NextResponse.json({ info: generalInfoResult });
        
      case 'generalQuestion':
        // Handle any question without a specific category
        if (!question) {
          return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }
        const generalQuestionResult = await openAIService.answerGeneralQuestion(question);
        return NextResponse.json({ response: generalQuestionResult });
        
      case 'allMedications':
        // Handle questions about all medications
        if (!question) {
          return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }
        const allMeds = body.medications || await medicationService.getMedications(patientId);
        const allMedsResult = await openAIService.getAllMedicationsInfo(question, allMeds);
        return NextResponse.json({ response: allMedsResult });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing medication request:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: 'Failed to process request', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Add PUT method for updating medications
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const medicationId = searchParams.get('medicationId');
    
    if (!patientId || !medicationId) {
      return NextResponse.json(
        { error: 'Patient ID and Medication ID are required' }, 
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const updatedMedication = await medicationService.updateMedication(patientId, medicationId, body);
    
    if (!updatedMedication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      message: 'Medication updated successfully',
      medication: updatedMedication
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: 'Failed to update medication', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Add DELETE method for deleting medications
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const medicationId = searchParams.get('medicationId');
    const deleteAll = searchParams.get('deleteAll');
    
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }
    
    // Delete all medications for a patient
    if (deleteAll === 'true') {
      await medicationService.deleteAllMedications(patientId);
      return NextResponse.json({ message: 'All medications deleted successfully' });
    }
    
    // Delete a specific medication
    if (!medicationId) {
      return NextResponse.json({ error: 'Medication ID is required' }, { status: 400 });
    }
    
    const deleted = await medicationService.deleteMedication(patientId, medicationId);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Medication deleted successfully' });
  } catch (error) {
    console.error('Error deleting medication:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: 'Failed to delete medication', details: (error as Error).message },
      { status: 500 }
    );
  }
}