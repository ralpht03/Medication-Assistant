import { NextResponse } from 'next/server';
import { MedicationService } from '@/lib/azure-tables';
import { OpenAIService } from '@/lib/openai-service';
import { Medication } from '@/lib/types';

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

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Log environment variables (without sensitive data)
    console.log('Environment check:', {
      hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
      tableName: process.env.AZURE_STORAGE_TABLE_NAME
    });

    console.log('Fetching medications for patient:', patientId);
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
    const { action, patientId, medicationId, medication, question } = body;

    console.log('Processing action:', action, 'for medication:', medication?.name);

    let result;
    switch (action) {
      case 'info':
        result = await openAIService.getMedicationInfo(medication.name);
        return NextResponse.json({ info: result });

      case 'sideEffects':
        result = await openAIService.getSideEffects(medication.name);
        return NextResponse.json({ effects: result });

      case 'interactions':
        const medications = await medicationService.getMedications(patientId);
        result = await openAIService.checkInteractions(medications);
        return NextResponse.json({ interactions: result });

      case 'missedDose':
        result = await openAIService.handleMissedDose(medication);
        return NextResponse.json({ guidance: result });

      case 'emergency':
        result = await openAIService.handleEmergencyQuestion(question, medication);
        return NextResponse.json({ response: result });

      case 'schedule':
        const medsForSchedule = await medicationService.getMedications(patientId);
        result = await openAIService.getDailySchedule(medsForSchedule);
        return NextResponse.json({ schedule: result });

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