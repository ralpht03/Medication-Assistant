import { TableClient, AzureNamedKeyCredential, odata, TableEntityResult } from "@azure/data-tables";
import { config } from 'dotenv';
import { Medication } from "./types";

config();

const DEFAULT_TABLE_NAME = 'medications';

export class MedicationService {
  private tableClient: TableClient;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string must be provided in the environment variables.');
    }

    const tableName = process.env.AZURE_STORAGE_TABLE_NAME || DEFAULT_TABLE_NAME;

    try {
      // After validation, we can safely assert these are strings
      this.tableClient = TableClient.fromConnectionString(
        connectionString as string,
        tableName as string
      );
    } catch (error) {
      console.error('Error initializing TableClient:', error);
      throw new Error('Failed to initialize Azure Table Storage client');
    }
  }

  async getMedications(patientId: string): Promise<Medication[]> {
    try {
      const filter = odata`PartitionKey eq ${patientId}`;
      const entities = this.tableClient.listEntities<Medication>({ queryOptions: { filter } });

      const medications: Medication[] = [];
      for await (const entity of entities) {
        medications.push({
          partitionKey: entity.partitionKey as string,
          rowKey: entity.rowKey as string,
          name: entity.name as string,
          dosage: entity.dosage as string,
          frequency: entity.frequency as string,
          time: entity.time as string,
          instructions: entity.instructions as string
        });
      }

      return medications;
    } catch (error) {
      console.error('Error fetching medications:', error);
      throw error;
    }
  }

  async createTable(): Promise<void> {
    try {
      await this.tableClient.createTable();
      console.log('Table created successfully');
    } catch (error: any) {
      if (error.statusCode === 409) {
        console.log('Table already exists');
      } else {
        throw error;
      }
    }
  }

  async addMedication(medication: Omit<Medication, 'partitionKey' | 'rowKey'>, patientId: string): Promise<void> {
    const entity = {
      partitionKey: patientId,
      rowKey: `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...medication
    };

    try {
      await this.tableClient.createEntity(entity);
      console.log(`Added medication: ${medication.name}`);
    } catch (error) {
      console.error(`Error adding medication ${medication.name}:`, error);
      throw error;
    }
  }

  async deleteAllMedications(patientId: string): Promise<void> {
    try {
      const filter = odata`PartitionKey eq ${patientId}`;
      const entities = this.tableClient.listEntities({ queryOptions: { filter } });
      for await (const entity of entities) {
        await this.tableClient.deleteEntity(
          entity.partitionKey as string,
          entity.rowKey as string
        );
      }
      console.log(`Deleted all medications for patient: ${patientId}`);
    } catch (error) {
      console.error('Error deleting medications:', error);
      throw error;
    }
  }
}