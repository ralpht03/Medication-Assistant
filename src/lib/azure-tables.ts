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