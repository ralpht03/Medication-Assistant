import { NextResponse } from 'next/server';
import { UserService } from '@/lib/azure-tables';
import { InvitationService } from '@/lib/azure/invitation-service';
import { odata } from "@azure/data-tables";

// Initialize services with error handling
let userService: UserService;
let invitationService: InvitationService;

try {
  userService = new UserService();
  invitationService = new InvitationService();
} catch (error) {
  console.error('Error initializing services:', error);
  throw new Error('Failed to initialize services');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminId, patientId } = body;

    if (!adminId || !patientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify table client is initialized
    if (!userService?.usersTableClient) {
      console.error('UserService table client not initialized');
      return NextResponse.json({ error: 'Service initialization error' }, { status: 500 });
    }

    // First, verify that the admin exists and is actually an admin
    let admin;
    try {
      admin = await userService.usersTableClient.getEntity('admin', adminId);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
      }
      throw error;
    }

    if (admin.role !== 'admin') {
      return NextResponse.json({ error: 'User is not an admin' }, { status: 403 });
    }

    // Next, verify that the patient exists
    let patient;
    try {
      patient = await userService.usersTableClient.getEntity('patient', patientId);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }
      throw error;
    }

    // Remove the patient from admin's linkedPatients
    const linkedPatients = admin.linkedPatients ? JSON.parse(admin.linkedPatients) : [];
    if (!Array.isArray(linkedPatients)) {
      console.error('Invalid linkedPatients format:', admin.linkedPatients);
      return NextResponse.json({ error: 'Invalid admin data format' }, { status: 500 });
    }
    
    const updatedLinkedPatients = linkedPatients.filter((id: string) => id !== patientId);
    
    try {
      // Verify table client again before update
      if (!userService?.usersTableClient) {
        throw new Error('UserService table client not initialized');
      }

      await userService.usersTableClient.updateEntity({
        partitionKey: 'admin',
        rowKey: adminId,
        linkedPatients: JSON.stringify(updatedLinkedPatients)
      }, 'Merge');
    } catch (error) {
      console.error('Error updating admin entity:', error);
      return NextResponse.json({ error: 'Failed to update admin data' }, { status: 500 });
    }

    // Delete any pending invitations between this admin and patient
    try {
      const invitations = await invitationService.getInvitationsByInviter(adminId);
      const patientInvitations = invitations.filter(inv => 
        inv.inviteeUserId === patientId || inv.inviteeEmail === patient.email
      );
      
      await Promise.all(patientInvitations.map(inv => 
        invitationService.deleteEntity('INVITATION', inv.rowKey)
      ));
    } catch (error) {
      console.error('Error deleting invitations:', error);
      // Continue with the process even if invitation deletion fails
    }

    // Delete any medications prescribed by this admin to this patient
    try {
      const filter = odata`PartitionKey eq '${patientId}'`;
      const medications = userService.medicationsTableClient.listEntities({ queryOptions: { filter } });
      
      for await (const medication of medications) {
        try {
          await userService.medicationsTableClient.deleteEntity(
            medication.PartitionKey as string,
            medication.RowKey as string
          );
        } catch (error) {
          console.error('Error deleting medication:', error);
          // Continue with the process even if one medication deletion fails
        }
      }
    } catch (error) {
      console.error('Error listing medications:', error);
      // Continue with the process even if medication listing fails
    }

    return NextResponse.json({
      message: 'Patient removed successfully'
    });
  } catch (error) {
    console.error('Error removing patient:', error);
    return NextResponse.json(
      { error: 'Failed to remove patient' },
      { status: 500 }
    );
  }
} 