import { TableClient, AzureNamedKeyCredential, odata, TableEntityResult } from "@azure/data-tables";
import { config } from 'dotenv';
import { Medication, AzureTableUser, AzureTablePatient, SignupData, LoginData, AuthResult } from "./types";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

config();

const DEFAULT_MEDICATIONS_TABLE = 'medications';
const USERS_TABLE = 'Users';
const PATIENTS_TABLE = 'Patients';

// Helper function to create a TableClient
function createTableClient(tableName: string): TableClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('Azure Storage connection string must be provided in the environment variables.');
  }

  try {
    return TableClient.fromConnectionString(
      connectionString as string,
      tableName
    );
  } catch (error) {
    console.error(`Error initializing TableClient for ${tableName}:`, error);
    throw new Error(`Failed to initialize Azure Table Storage client for ${tableName}`);
  }
}

export class UserService {
  private usersTableClient: TableClient;
  private patientsTableClient: TableClient;
  private saltRounds = 10;
  private jwtSecret: string;

  constructor() {
    this.usersTableClient = createTableClient(USERS_TABLE);
    this.patientsTableClient = createTableClient(PATIENTS_TABLE);
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET must be provided in the environment variables.');
    }
    this.jwtSecret = jwtSecret;
  }

  async createTables(): Promise<void> {
    try {
      await this.usersTableClient.createTable();
      console.log('Users table created successfully');
      
      await this.patientsTableClient.createTable();
      console.log('Patients table created successfully');
    } catch (error: any) {
      if (error.statusCode === 409) {
        console.log('Tables already exist');
      } else {
        throw error;
      }
    }
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async signup(userData: SignupData): Promise<AuthResult> {
    try {
      // Check if user exists
      const filter = odata`PartitionKey eq 'USER' and email eq ${userData.email}`;
      const existingUsers = this.usersTableClient.listEntities<AzureTableUser>({ queryOptions: { filter } });
      
      let userExists = false;
      for await (const user of existingUsers) {
        userExists = true;
        break;
      }
      
      if (userExists) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);
      
      // Generate user ID
      const userId = uuidv4();
      const now = new Date().toISOString();
      
      // Create user entity
      const userEntity: AzureTableUser = {
        partitionKey: 'USER',
        rowKey: userId,
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        createdAt: now,
        updatedAt: now
      };
      
      // Add optional fields if provided
      if (userData.dateOfBirth) userEntity.dateOfBirth = userData.dateOfBirth;
      if (userData.phoneNumber) userEntity.phoneNumber = userData.phoneNumber;
      if (userData.address) userEntity.address = userData.address;
      if (userData.emergencyContact) userEntity.emergencyContact = userData.emergencyContact;
      
      // Create user in Azure Tables
      await this.usersTableClient.createEntity(userEntity);
      
      // If user is a patient, create patient profile
      if (userData.role === 'patient') {
        const patientEntity: AzureTablePatient = {
          partitionKey: 'PATIENT',
          rowKey: userId,
          profile: JSON.stringify({}),
          medicalHistory: JSON.stringify({}),
          allergies: JSON.stringify([]),
          currentMedications: JSON.stringify([])
        };
        
        await this.patientsTableClient.createEntity(patientEntity);
      }
      
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: userId,
          email: userData.email,
          role: userData.role
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );
      
      return {
        user: {
          id: userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role
        },
        token
      };
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  }

  async login(loginData: LoginData): Promise<AuthResult> {
    try {
      // Find user by email
      const filter = odata`PartitionKey eq 'USER' and email eq ${loginData.email}`;
      const users = this.usersTableClient.listEntities<AzureTableUser>({ queryOptions: { filter } });
      
      let user: AzureTableUser | null = null;
      for await (const entity of users) {
        user = entity;
        break;
      }
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify password
      const passwordMatch = await this.verifyPassword(loginData.password, user.passwordHash);
      if (!passwordMatch) {
        throw new Error('Invalid password');
      }
      
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.rowKey,
          email: user.email,
          role: user.role
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );
      
      return {
        user: {
          id: user.rowKey,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      };
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }
}

export class MedicationService {
  private tableClient: TableClient;

  constructor() {
    this.tableClient = createTableClient(DEFAULT_MEDICATIONS_TABLE);
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

  // Get all medications for a patient
  async getMedications(patientId: string): Promise<Medication[]> {
    try {
      const filter = odata`PartitionKey eq ${patientId}`;
      const entities = this.tableClient.listEntities<Medication>({ queryOptions: { filter } });

      const medications: Medication[] = [];
      for await (const entity of entities) {
        medications.push(this.transformEntityToMedication(entity));
      }

      return medications;
    } catch (error) {
      console.error('Error fetching medications:', error);
      throw error;
    }
  }

  // Get a single medication by ID
  async getMedicationById(patientId: string, medicationId: string): Promise<Medication | null> {
    try {
      const entity = await this.tableClient.getEntity<Medication>(patientId, medicationId);
      return this.transformEntityToMedication(entity);
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`Medication with ID ${medicationId} not found for patient ${patientId}`);
        return null;
      }
      console.error(`Error fetching medication ${medicationId}:`, error);
      throw error;
    }
  }

  // Add a new medication
  async addMedication(medication: Omit<Medication, 'partitionKey' | 'rowKey'>, patientId: string): Promise<Medication> {
    const medicationId = `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entity = {
      partitionKey: patientId,
      rowKey: medicationId,
      ...medication,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await this.tableClient.createEntity(entity);
      console.log(`Added medication: ${medication.name} with ID: ${medicationId}`);
      return this.transformEntityToMedication(entity);
    } catch (error) {
      console.error(`Error adding medication ${medication.name}:`, error);
      throw error;
    }
  }

  // Update an existing medication
  async updateMedication(
    patientId: string, 
    medicationId: string, 
    updates: Partial<Omit<Medication, 'partitionKey' | 'rowKey'>>
  ): Promise<Medication | null> {
    try {
      // First, get the existing medication
      const existingMedication = await this.getMedicationById(patientId, medicationId);
      
      if (!existingMedication) {
        console.log(`Medication with ID ${medicationId} not found for patient ${patientId}`);
        return null;
      }
      
      // Create updated entity
      const updatedEntity = {
        partitionKey: patientId,
        rowKey: medicationId,
        ...existingMedication,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Update the entity in Azure Table Storage
      await this.tableClient.updateEntity(updatedEntity, "Merge");
      console.log(`Updated medication: ${medicationId}`);
      
      return this.transformEntityToMedication(updatedEntity);
    } catch (error) {
      console.error(`Error updating medication ${medicationId}:`, error);
      throw error;
    }
  }

  // Delete a single medication
  async deleteMedication(patientId: string, medicationId: string): Promise<boolean> {
    try {
      await this.tableClient.deleteEntity(patientId, medicationId);
      console.log(`Deleted medication: ${medicationId} for patient: ${patientId}`);
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`Medication with ID ${medicationId} not found for patient ${patientId}`);
        return false;
      }
      console.error(`Error deleting medication ${medicationId}:`, error);
      throw error;
    }
  }

  // Delete all medications for a patient
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

  // Helper method to transform entity to medication
  private transformEntityToMedication(entity: any): Medication {
    return {
      partitionKey: entity.partitionKey,
      rowKey: entity.rowKey,
      name: entity.name,
      dosage: entity.dosage,
      frequency: entity.frequency,
      time: entity.time,
      instructions: entity.instructions,
      startDate: entity.startDate,
      endDate: entity.endDate,
      verificationMethod: entity.verificationMethod,
      prescribingDoctor: entity.prescribingDoctor,
      pharmacy: entity.pharmacy,
      notes: entity.notes,
      refillsRemaining: entity.refillsRemaining,
      lastFilled: entity.lastFilled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}