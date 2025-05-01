import { NextResponse } from 'next/server';
import { UserService } from '@/lib/azure-tables';
import { InvitationService, Invitation } from '@/lib/azure/invitation-service';
import { odata } from "@azure/data-tables";
import { AzureTableUser } from '@/lib/azure-tables-types';
import { createTableClient } from '@/lib/azure-tables';
import { createNotification } from '@/lib/patient';

interface TableEntity {
  PartitionKey: string;
  RowKey: string;
  [key: string]: any;
}

// Initialize services with error handling
let userService: UserService;
let invitationService: InvitationService;

export async function POST(request: Request) {
  const usersTableClient = createTableClient('Users');
  const medicationsTableClient = createTableClient('Medications');
  userService = new UserService();
  invitationService = new InvitationService();
  
  try {
    const body = await request.json();
    const { adminId, patientId } = body;

    if (!adminId || !patientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // First, verify that the admin exists and is actually an admin
    let admin: AzureTableUser;
    try {
      admin = await usersTableClient.getEntity<AzureTableUser>('admin', adminId);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return NextResponse.json({ error: `Admin with ID ${adminId} not found` }, { status: 404 });
      }
      throw error;
    }

    if (admin.role !== 'admin') {
      return NextResponse.json({ error: `User ${adminId} is not an admin` }, { status: 403 });
    }

    // Next, verify that the patient exists
    let patient: AzureTableUser;
    try {
      patient = await usersTableClient.getEntity<AzureTableUser>('patient', patientId);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return NextResponse.json({ error: `Patient with ID ${patientId} not found` }, { status: 404 });
      }
      throw error;
    }

    // Remove the patient from admin's linkedPatients
    let linkedPatients: string[] = [];
    try {
      linkedPatients = admin.linkedPatients ? JSON.parse(admin.linkedPatients) : [];
    } catch (error) {
      console.error('Error parsing admin linkedPatients:', error);
      linkedPatients = [];
    }
    
    if (!Array.isArray(linkedPatients)) {
      console.error('Invalid linkedPatients format:', admin.linkedPatients);
      linkedPatients = [];
    }
    
    if (!linkedPatients.includes(patientId)) {
      return NextResponse.json({ 
        error: `Patient ${patientId} is not linked to admin ${adminId}` 
      }, { status: 400 });
    }

    const updatedLinkedPatients = linkedPatients.filter((id: string) => id !== patientId);
    
    // Start transaction-like operations
    const errors: string[] = [];
    
    // Update admin's linkedPatients
    try {
      await usersTableClient.updateEntity({
        partitionKey: 'admin',
        rowKey: adminId,
        linkedPatients: JSON.stringify(updatedLinkedPatients)
      }, "Merge");
    } catch (error) {
      const msg = `Failed to update admin ${adminId} data: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      errors.push(msg);
    }

    // Delete any pending invitations between this admin and patient
    try {
      let invitations: Invitation[] = [];
      try {
        invitations = await invitationService.getInvitationsByInviter(adminId) as Invitation[];
      } catch (error) {
        console.error('Error fetching invitations:', error);
        invitations = [];
      }

      const patientInvitations = invitations.filter((inv: Invitation) => 
        inv && inv.RowKey && (inv.inviteeUserId === patientId || inv.inviteeEmail === patient.email)
      );
      
      await Promise.all(patientInvitations.map(async (inv: Invitation) => {
        if (!inv || !inv.RowKey) {
          console.error('Invalid invitation object:', inv);
          return;
        }
        try {
          await invitationService.deleteEntity('INVITATION', inv.RowKey);
        } catch (error) {
          console.error(`Failed to delete invitation ${inv.RowKey}:`, error);
        }
      }));
    } catch (error) {
      const msg = `Failed to delete invitations: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      errors.push(msg);
    }

    // Delete any medications prescribed by this admin to this patient
    try {
      // Escape single quotes in the admin's name
      const escapedAdminName = admin.firstName.replace(/'/g, "''") + ' ' + admin.lastName.replace(/'/g, "''");
      const filter = odata`PartitionKey eq '${patientId}' and prescribingDoctor eq '${escapedAdminName}'`;
      const medications = medicationsTableClient.listEntities<TableEntity>({ queryOptions: { filter } });
      
      for await (const medication of medications) {
        try {
          await medicationsTableClient.deleteEntity(
            medication.PartitionKey,
            medication.RowKey
          );
          console.log(`Successfully deleted medication ${medication.RowKey}`);
        } catch (error) {
          const msg = `Failed to delete medication ${medication.RowKey}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(msg);
          errors.push(msg);
        }
      }
    } catch (error) {
      const msg = `Failed to list medications: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      errors.push(msg);
    }

    // Delete verification logs for this patient that were created under this admin's supervision
    try {
      const verificationLogsTableClient = createTableClient('VerificationLogs');
      const escapedAdminName = admin.firstName.replace(/'/g, "''") + ' ' + admin.lastName.replace(/'/g, "''");
      const filter = odata`PartitionKey eq '${patientId}' and prescribingDoctor eq '${escapedAdminName}'`;
      const verificationLogs = verificationLogsTableClient.listEntities<TableEntity>({ queryOptions: { filter } });
      console.log('Patient ID:', patientId);
      console.log('Escaped admin name:', escapedAdminName);
      console.log('Verification logs:', verificationLogs);
      for await (const log of verificationLogs) {
        console.log('Deleting verification log:', log);
        try {
          await verificationLogsTableClient.deleteEntity(
            log.partitionKey,
            log.rowKey
          );
          console.log(`Successfully deleted verification log ${log.RowKey}`);
        } catch (error) {
          const msg = `Failed to delete verification log ${log.RowKey}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(msg);
          errors.push(msg);
        }
      }
    } catch (error) {
      const msg = `Failed to list verification logs: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      errors.push(msg);
    }

    // Return appropriate response based on operation results
    if (errors.length > 0) {
      return NextResponse.json({
        message: 'Patient removal completed with errors',
        errors
      }, { status: 207 }); // 207 Multi-Status
    }

    // Create notification for the patient
    try {
      await createNotification(
        patientId,
        'warning',
        `${admin.firstName} ${admin.lastName} has removed you from their patient list. You will no longer receive medication reminders from them.`
      );
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      message: 'Patient removed successfully'
    });
  } catch (error) {
    console.error('Error removing patient:', error);
    return NextResponse.json(
      { error: `Failed to remove patient: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}