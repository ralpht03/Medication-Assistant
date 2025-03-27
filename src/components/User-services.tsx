import { TableClient, AzureNamedKeyCredential, odata, TableEntityResult } from "@azure/data-tables";
import { config } from 'dotenv';
import { Medication, AzureTableUser, AzureTablePatient, SignupData, LoginData, AuthResult, PatientAssignmentData } from "./azure-tables-types";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

config();

const DEFAULT_MEDICATIONS_TABLE = 'medications';
const USERS_TABLE = 'Users';
const PATIENTS_TABLE = 'Patients';
const ADMIN_PATIENT_RELATIONS_TABLE = 'AdminPatientRelations';

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
  private adminPatientRelationsTableClient: TableClient;
  private saltRounds = 10;
  private jwtSecret: string;

  constructor() {
    this.usersTableClient = createTableClient(USERS_TABLE);
    this.patientsTableClient = createTableClient(PATIENTS_TABLE);
    this.adminPatientRelationsTableClient = createTableClient(ADMIN_PATIENT_RELATIONS_TABLE);
    
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
      
      await this.adminPatientRelationsTableClient.createTable();
      console.log('AdminPatientRelations table created successfully');
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

  // Helper function to get fixed ID for test emails
  private getFixedUserId(email: string): string | null {
    // Map specific emails to fixed IDs
    if (email === 'atest@usf.edu') {
      return '0000'; // Admin user
    } else if (email === 'test@usf.edu') {
      return '0001'; // Patient user
    }
    return null; // No fixed ID for other emails
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
      
      // Generate user ID or use fixed ID for test emails
      const fixedUserId = this.getFixedUserId(userData.email);
      const userId = fixedUserId || uuidv4();
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
          currentMedications: JSON.stringify([]),
          // Initialize with empty list of adminIds
          adminIds: JSON.stringify([])
        };
        
        await this.patientsTableClient.createEntity(patientEntity);
        
        // If an adminId was provided during signup, create the relationship
        if (userData.adminId) {
          await this.assignPatientToAdmin(userId, userData.adminId);
        }
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
      
      // Special case: If this is a test email and user doesn't exist, auto-create it
      const fixedUserId = this.getFixedUserId(loginData.email);
      if (!user && fixedUserId) {
        // Determine the role based on email
        const role = loginData.email === 'atest@usf.edu' ? 'admin' : 'patient';
        
        // Create user with fixed ID
        const hashedPassword = await this.hashPassword(loginData.password);
        const now = new Date().toISOString();
        
        const newUser: AzureTableUser = {
          partitionKey: 'USER',
          rowKey: fixedUserId,
          email: loginData.email,
          passwordHash: hashedPassword,
          firstName: loginData.email === 'atest@usf.edu' ? 'Admin' : 'Test',
          lastName: 'User',
          role: role,
          createdAt: now,
          updatedAt: now
        };
        
        await this.usersTableClient.createEntity(newUser);
        
        // If role is patient, create patient profile
        if (role === 'patient') {
          const patientEntity: AzureTablePatient = {
            partitionKey: 'PATIENT',
            rowKey: fixedUserId,
            profile: JSON.stringify({}),
            medicalHistory: JSON.stringify({}),
            allergies: JSON.stringify([]),
            currentMedications: JSON.stringify([]),
            adminIds: JSON.stringify(['0000']) // Auto-assign to admin
          };
          
          await this.patientsTableClient.createEntity(patientEntity);
          
          // Create the admin-patient relationship
          await this.assignPatientToAdmin(fixedUserId, '0000');
        }
        
        user = newUser;
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

  // Assign a patient to an admin
  async assignPatientToAdmin(patientId: string, adminId: string): Promise<void> {
    try {
      // First, verify that the admin exists and is actually an admin
      let admin: AzureTableUser | null = null;
      try {
        admin = await this.usersTableClient.getEntity<AzureTableUser>('USER', adminId);
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new Error(`Admin with ID ${adminId} not found`);
        }
        throw error;
      }

      if (admin.role !== 'admin') {
        throw new Error(`User with ID ${adminId} is not an admin`);
      }

      // Next, verify that the patient exists and is actually a patient
      let patient: AzureTablePatient | null = null;
      try {
        patient = await this.patientsTableClient.getEntity<AzureTablePatient>('PATIENT', patientId);
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new Error(`Patient with ID ${patientId} not found`);
        }
        throw error;
      }

      // Create a unique relation ID
      const relationId = uuidv4();
      const now = new Date().toISOString();

      // Create the relation entity
      const relationEntity = {
        partitionKey: adminId,  // We partition by adminId for efficient querying
        rowKey: `${patientId}-${relationId}`, // Ensure uniqueness with relationId
        patientId: patientId,
        adminId: adminId,
        createdAt: now,
        status: 'active'
      };

      // Create the relation in Azure Tables
      await this.adminPatientRelationsTableClient.createEntity(relationEntity);

      // Update the patient's adminIds array
      const adminIds = JSON.parse(patient.adminIds || '[]');
      if (!adminIds.includes(adminId)) {
        adminIds.push(adminId);
        
        const patientUpdate: Partial<AzureTablePatient> = {
          partitionKey: 'PATIENT',
          rowKey: patientId,
          adminIds: JSON.stringify(adminIds),
          updatedAt: now
        };
        
        await this.patientsTableClient.updateEntity(patientUpdate, "Merge");
      }

      console.log(`Patient ${patientId} assigned to admin ${adminId}`);
    } catch (error) {
      console.error('Error assigning patient to admin:', error);
      throw error;
    }
  }

  // The rest of the methods remain unchanged
  async removePatientFromAdmin(patientId: string, adminId: string): Promise<void> {
    try {
      // Find the relation
      const filter = odata`PartitionKey eq ${adminId} and patientId eq ${patientId}`;
      const relations = this.adminPatientRelationsTableClient.listEntities({ queryOptions: { filter } });
      
      // Delete all matching relations
      for await (const relation of relations) {
        await this.adminPatientRelationsTableClient.deleteEntity(
          relation.partitionKey as string,
          relation.rowKey as string
        );
      }

      // Update the patient's adminIds array
      try {
        const patient = await this.patientsTableClient.getEntity<AzureTablePatient>('PATIENT', patientId);
        const adminIds = JSON.parse(patient.adminIds || '[]');
        const updatedAdminIds = adminIds.filter((id: string) => id !== adminId);
        
        const patientUpdate: Partial<AzureTablePatient> = {
          partitionKey: 'PATIENT',
          rowKey: patientId,
          adminIds: JSON.stringify(updatedAdminIds),
          updatedAt: new Date().toISOString()
        };
        
        await this.patientsTableClient.updateEntity(patientUpdate, "Merge");
      } catch (error: any) {
        if (error.statusCode !== 404) {
          throw error;
        }
        // If patient not found, just log it
        console.log(`Patient with ID ${patientId} not found when removing admin relation`);
      }

      console.log(`Patient ${patientId} removed from admin ${adminId}`);
    } catch (error) {
      console.error('Error removing patient from admin:', error);
      throw error;
    }
  }

  async getPatientsByAdminId(adminId: string): Promise<any[]> {
    try {
      // First, verify that the admin exists and is actually an admin
      let admin: AzureTableUser | null = null;
      try {
        admin = await this.usersTableClient.getEntity<AzureTableUser>('USER', adminId);
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new Error(`Admin with ID ${adminId} not found`);
        }
        throw error;
      }

      if (admin.role !== 'admin') {
        throw new Error(`User with ID ${adminId} is not an admin`);
      }

      // Get all relations for this admin
      const filter = odata`PartitionKey eq ${adminId}`;
      const relations = this.adminPatientRelationsTableClient.listEntities({ queryOptions: { filter } });
      
      const patients = [];
      for await (const relation of relations) {
        try {
          // Get the patient user info
          const patientId = relation.patientId as string;
          const patientUser = await this.usersTableClient.getEntity<AzureTableUser>('USER', patientId);
          const patientData = await this.patientsTableClient.getEntity<AzureTablePatient>('PATIENT', patientId);
          
          patients.push({
            id: patientUser.rowKey,
            email: patientUser.email,
            firstName: patientUser.firstName,
            lastName: patientUser.lastName,
            profile: JSON.parse(patientData.profile || '{}'),
            medicalHistory: JSON.parse(patientData.medicalHistory || '{}'),
            allergies: JSON.parse(patientData.allergies || '[]'),
            currentMedications: JSON.parse(patientData.currentMedications || '[]')
          });
        } catch (error: any) {
          // Skip patients that may have been deleted
          if (error.statusCode !== 404) {
            throw error;
          }
        }
      }
      
      return patients;
    } catch (error) {
      console.error('Error getting patients by admin ID:', error);
      throw error;
    }
  }

  // Get all admins assigned to a patient
  async getAdminsByPatientId(patientId: string): Promise<any[]> {
    try {
      // First, get the patient record to get the list of adminIds
      let patient: AzureTablePatient | null = null;
      try {
        patient = await this.patientsTableClient.getEntity<AzureTablePatient>('PATIENT', patientId);
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw new Error(`Patient with ID ${patientId} not found`);
        }
        throw error;
      }
      
      const adminIds = JSON.parse(patient.adminIds || '[]');
      
      // Get admin user info for each admin ID
      const admins = [];
      for (const adminId of adminIds) {
        try {
          const admin = await this.usersTableClient.getEntity<AzureTableUser>('USER', adminId);
          
          admins.push({
            id: admin.rowKey,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName
          });
        } catch (error: any) {
          // Skip admins that may have been deleted
          if (error.statusCode !== 404) {
            throw error;
          }
        }
      }
      
      return admins;
    } catch (error) {
      console.error('Error getting admins by patient ID:', error);
      throw error;
    }
  }