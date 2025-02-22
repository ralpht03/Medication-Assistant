import { config } from 'dotenv'
import { resolve } from 'path'
import { TableClient, odata } from "@azure/data-tables"
import { MedicationService } from "../lib/azure-tables"
import { Medication } from "../lib/types"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

async function seedMedications() {
  try {
    // Get environment variables
    const connectionString = getEnvVar('AZURE_STORAGE_CONNECTION_STRING');
    const tableName = getEnvVar('AZURE_STORAGE_TABLE_NAME', 'medications');

    console.log('Initializing MedicationService...');
    const medicationService = new MedicationService();

    // Create table if it doesn't exist
    console.log('Creating table if it doesn\'t exist...');
    await medicationService.createTable();

    // Clear existing medications for test patient
    console.log('Clearing existing medications...');
    const patientId = "test-patient-1";
    const tableClient = TableClient.fromConnectionString(connectionString, tableName);
    
    const filter = odata`PartitionKey eq ${patientId}`;
    const existingMeds = tableClient.listEntities({ queryOptions: { filter } });
    for await (const med of existingMeds) {
      await tableClient.deleteEntity(med.partitionKey, med.rowKey);
    }

    // Sample medications data
    const medications: Omit<Medication, 'partitionKey' | 'rowKey'>[] = [
      {
        name: "Lisinopril",
        dosage: "10mg",
        frequency: "Once daily",
        time: "Morning",
        instructions: "Take with or without food"
      },
      {
        name: "Metformin",
        dosage: "500mg",
        frequency: "Twice daily",
        time: "Morning and Evening",
        instructions: "Take with meals"
      },
      {
        name: "Atorvastatin",
        dosage: "20mg",
        frequency: "Once daily",
        time: "Evening",
        instructions: "Take at bedtime"
      },
      {
        name: "Omeprazole",
        dosage: "40mg",
        frequency: "Once daily",
        time: "Morning",
        instructions: "Take 30 minutes before breakfast"
      }
    ];

    console.log('Adding medications...');
    for (const med of medications) {
      try {
        await medicationService.addMedication(med, patientId);
      } catch (error) {
        console.error(`Error adding medication ${med.name}:`, error);
      }
    }

    console.log('Seeding completed!');
  } catch (error) {
    console.error('Error in seed process:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }
}

// Log environment variables (without sensitive data)
console.log('Environment check:', {
  hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
  tableName: process.env.AZURE_STORAGE_TABLE_NAME ?? 'medications'
});

// Run the seed function
seedMedications().catch(console.error);