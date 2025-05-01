import { TableClient, AzureNamedKeyCredential, odata, TableEntityResult } from "@azure/data-tables";
import { config } from 'dotenv';
import { Medication, AzureTableUser, AzureTablePatient, SignupData, LoginData, AuthResult, PatientAssignmentData } from "./azure-tables-types";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { Medications } from "./types";
import { InvitationService } from './azure/invitation-service';
import { createTableClient } from './azure-table-utils';

config();

const DEFAULT_MEDICATIONS_TABLE = 'medications';
const USERS_TABLE = 'Users';
const PATIENTS_TABLE = 'Patients';

// MedicationService class for handling medication operations
export class MedicationService {
  private medicationsTableClient: TableClient;
  
  constructor(tableName: string = DEFAULT_MEDICATIONS_TABLE) {
    this.medicationsTableClient = createTableClient(tableName);
  }
  
  // Get a medication by ID
  async getMedicationById(patientId: string, medicationId: string): Promise<Medication | null> {
    try {
      const medication = await this.medicationsTableClient.getEntity<Medication>(patientId, medicationId);
      return medication;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      console.error('Error getting medication by ID:', error);
      throw error;
    }
  }
  
  // Get all medications for a patient
  async getMedications(patientId: string): Promise<Medication[]> {
    try {
      const filter = odata`PartitionKey eq ${patientId}`;
      const medications = this.medicationsTableClient.listEntities<Medication>({ queryOptions: { filter } });
      
      const result: Medication[] = [];
      for await (const medication of medications) {
        result.push(medication as Medication);
      }
      
      return result;
    } catch (error) {
      console.error('Error getting medications:', error);
      throw error;
    }
  }
  
  // Add a new medication
  async addMedication(medication: any, patientId: string): Promise<Medication> {
    try {
      const now = new Date().toISOString();
      const medicationId = uuidv4();
      
      const medicationEntity: Medication = {
        PartitionKey: patientId,
        RowKey: medicationId,
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        time: medication.time || '08:00',
        instructions: medication.instructions || '',
        startDate: medication.startDate || now,
        endDate: medication.endDate || '',
        verificationMethod: medication.verificationMethod || 'manual-entry',
        patientId: patientId,
        prescribingDoctor: medication.prescribingDoctor || '',
        pharmacy: medication.pharmacy || '',
        notes: medication.notes || '',
        refillsRemaining: medication.refillsRemaining || 0,
        recommendedPillCount: medication.recommendedPillCount || 1,
        lastFilled: medication.lastFilled || '',
        createdAt: now,
        updatedAt: now
      };
      
      await this.medicationsTableClient.createEntity({
        partitionKey: patientId,
        rowKey: medicationId,
        ...medicationEntity
      });
      return medicationEntity;
    } catch (error) {
      console.error('Error adding medication:', error);
      throw error;
    }
  }
  
  // Update an existing medication
  async updateMedication(patientId: string, medicationId: string, updates: any): Promise<Medication | null> {
    try {
      // First check if the medication exists
      const existingMedication = await this.getMedicationById(patientId, medicationId);
      if (!existingMedication) {
        return null;
      }
      
      // Prepare the update entity
      const now = new Date().toISOString();
      const updateEntity = {
        PartitionKey: patientId,
        RowKey: medicationId,
        updatedAt: now,
        ...updates
      };
      
      // Update the entity
      await this.medicationsTableClient.updateEntity(updateEntity, "Merge");
      
      // Get the updated entity
      return await this.getMedicationById(patientId, medicationId);
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  }
  
  // Delete a medication
  async deleteMedication(patientId: string, medicationId: string): Promise<boolean> {
    try {
      // First check if the medication exists
      const existingMedication = await this.getMedicationById(patientId, medicationId);
      if (!existingMedication) {
        return false;
      }
      
      // Delete the entity
      await this.medicationsTableClient.deleteEntity(patientId, medicationId);
      return true;
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  }
  
  // Delete all medications for a patient
  async deleteAllMedications(patientId: string): Promise<void> {
    try {
      const medications = await this.getMedications(patientId);
      
      for (const medication of medications) {
        await this.medicationsTableClient.deleteEntity(patientId, medication.RowKey);
      }
    } catch (error) {
      console.error('Error deleting all medications:', error);
      throw error;
    }
  }
}

export class UserService {
  private usersTableClient: TableClient;
  private patientsTableClient: TableClient;
  private saltRounds = 10;
  private jwtSecret: string;
  private medicationsTableClient: TableClient;
  private verificationLogsTableClient: TableClient;
  private notificationsTableClient: TableClient;

  constructor() {
    this.usersTableClient = createTableClient(USERS_TABLE);
    this.patientsTableClient = createTableClient(PATIENTS_TABLE);
    this.medicationsTableClient = createTableClient('Medications');
    this.verificationLogsTableClient = createTableClient('VerificationLogs');
    this.notificationsTableClient = createTableClient('Notifications');
    
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
      // Check if user exists by searching across all roles
      const roles = ['admin', 'patient', 'helper'];
      let userExists = false;
      
      for (const role of roles) {
        const filter = odata`PartitionKey eq ${role} and email eq ${userData.email}`;
        const existingUsers = this.usersTableClient.listEntities<AzureTableUser>({ queryOptions: { filter } });
        
        for await (const user of existingUsers) {
          userExists = true;
          break;
        }
        
        if (userExists) break;
      }
      
      if (userExists) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);
      
      // Generate user ID
      const userId = uuidv4();
      const now = new Date().toISOString();
      
      // Create user entity with role-based partition key
      const userEntity: AzureTableUser = {
        PartitionKey: userData.role,
        RowKey: userId,
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
          PartitionKey: 'patient',
          RowKey: userId,
          profile: JSON.stringify({}),
          medicalHistory: JSON.stringify({}),
          allergies: JSON.stringify([]),
          currentMedications: JSON.stringify([]),
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
      // Find user by email across all roles
      const roles = ['admin', 'patient', 'helper'];
      let user: AzureTableUser | null = null;
      
      for (const role of roles) {
        const filter = odata`PartitionKey eq ${role} and email eq ${loginData.email}`;
        const users = this.usersTableClient.listEntities<AzureTableUser>({ queryOptions: { filter } });
        
        for await (const entity of users) {
          user = entity;
          break;
        }
        
        if (user) break;
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
          userId: user.RowKey,
          email: user.email,
          role: user.role
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );
      
      return {
        user: {
          id: user.RowKey,
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

  async deleteUser(userId: string): Promise<void> {
    try {
      // First, find the user across different role partitions
      let user = null;
      const partitions = ['admin', 'patient', 'helper'];
      
      for (const partition of partitions) {
        try {
          user = await this.usersTableClient.getEntity(partition, userId);
          if (user) break;
        } catch (error) {
          // Continue to next partition if user not found
          continue;
        }
      }
      
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // If the user is an admin, handle admin-specific cleanup
      if (user.partitionKey === 'admin') {
        // Delete all medications they prescribed
        const medications = await this.medicationsTableClient.listEntities({
          queryOptions: {
            filter: odata`prescribedBy eq '${userId}'`
          }
        });
        
        for await (const medication of medications) {
          await this.medicationsTableClient.deleteEntity(medication.partitionKey as string, medication.rowKey as string);
        }

        // Get the admin's linked patients
        let linkedPatients: string[] = [];
        try {
          linkedPatients = JSON.parse((user as any).linkedPatients || '[]');
        } catch (error) {
          console.error('Error parsing linkedPatients:', error);
        }

        // For each linked patient, we don't need to update anything since the relationship
        // is only stored in the admin's linkedPatients field
        console.log(`Admin ${userId} had ${linkedPatients.length} linked patients`);
      }

      // Delete the user entity
      await this.usersTableClient.deleteEntity(user.partitionKey as string, user.rowKey as string);

      // Delete any invitations where user is the inviter or invitee
      const invitationService = new InvitationService();
      const invitations = await invitationService.queryEntities(
        `inviterUserId eq '${userId}' or inviteeUserId eq '${userId}'`
      );
      
      for (const invitation of invitations as Invitation[]) {
        await invitationService.deleteEntity(invitation.partitionKey, invitation.rowKey);
      }

      // Clean up notifications
      const notifications = await this.notificationsTableClient.listEntities({
        queryOptions: {
          filter: odata`recipientId eq '${userId}' or actorId eq '${userId}'`
        }
      });
      
      for await (const notification of notifications) {
        await this.notificationsTableClient.deleteEntity(notification.partitionKey as string, notification.rowKey as string);
      }

    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async assignPatientToAdmin(patientId: string, adminId: string): Promise<void> {
    try {
      const patient = await this.patientsTableClient.getEntity('patient', patientId);
      const adminIds = JSON.parse((patient as any).adminIds || '[]');
      if (!adminIds.includes(adminId)) {
        adminIds.push(adminId);
        await this.patientsTableClient.updateEntity({
          PartitionKey: 'patient',
          RowKey: patientId,
          adminIds: JSON.stringify(adminIds)
        }, "Merge");
      }
    } catch (error) {
      console.error('Error assigning patient to admin:', error);
      throw error;
    }
  }
}

interface Invitation {
  partitionKey: string;
  rowKey: string;
  inviteeUserId?: string;
  inviteeEmail?: string;
}