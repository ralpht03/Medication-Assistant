import { NextRequest, NextResponse } from 'next/server';
import { AzureTableService } from '@/lib/azure/table-service';
import { getSession } from '@/lib/auth';
import { InvitationService } from '@/lib/azure/invitation-service';


export async function GET(request: NextRequest) {
  const usersService = new AzureTableService('Users');
  const invitationService = new InvitationService();
  try {
    // Get authenticated user using the centralized getSession
    const session = await getSession(request);
    if (!session || !session.user || session.user.role !== 'patient') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const patientId = session.user.id || session.user.userId;
    
    // Get patient details to check linked helpers
    const patient = await usersService.getEntity('patient', patientId as string);
    if (!patient) {
      return NextResponse.json(
        { message: 'Patient not found' },
        { status: 404 }
      );
    }
    
    // Parse linked helpers (if any)
    let linkedHelpers = [];
    try {
      linkedHelpers = patient.linkedHelpers ? JSON.parse(patient.linkedHelpers as string) : [];
    } catch (parseError) {
      console.error('Error parsing linkedHelpers:', parseError);
      linkedHelpers = [];
    }
    
    // Get helper details for each linked helper
    const helperDetails = await Promise.all(linkedHelpers.map(async (helperId: string) => {
      const helper = await usersService.getEntity('helper', helperId);
      if (!helper) return null;
      
      return {
        id: helperId,
        name: `${helper.firstName} ${helper.lastName}`,
        email: helper.email
      };
    }));
    
    // Filter out any null entries from failed helper lookups
    const validHelpers = helperDetails.filter(helper => helper !== null);
    
    return NextResponse.json({
      helpers: validHelpers
    });
  } catch (error) {
    console.error('Error fetching patient helpers:', error);
    return NextResponse.json(
      { message: 'Failed to fetch helpers' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user using the centralized getSession
    const session = await getSession(request);
    if (!session || !session.user || session.user.role !== 'patient') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const patientId = session.user.id || session.user.userId;
    
    // Get request body
    const body = await request.json();
    const { helperId } = body;

    // Validate input
    if (!helperId) {
      return NextResponse.json(
        { message: 'Helper ID is required' },
        { status: 400 }
      );
    }

    // Get patient details
    const patient = await usersService.getEntity('patient', patientId as string);
    if (!patient) {
      return NextResponse.json(
        { message: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get helper details
    const helper = await usersService.getEntity('helper', helperId);
    if (!helper) {
      return NextResponse.json(
        { message: 'Helper not found' },
        { status: 404 }
      );
    }

    // Parse linked helpers
    let linkedHelpers = [];
    try {
      linkedHelpers = patient.linkedHelpers ? JSON.parse(patient.linkedHelpers as string) : [];
    } catch (parseError) {
      console.error('Error parsing linkedHelpers:', parseError);
      linkedHelpers = [];
    }

    // Remove helper from patient's linkedHelpers
    const updatedLinkedHelpers = linkedHelpers.filter((id: string) => id !== helperId);
    await usersService.updateEntity({
      partitionKey: 'patient',
      rowKey: patientId as string,
      linkedHelpers: JSON.stringify(updatedLinkedHelpers)
    }, "Merge");

    // Parse helper's linkedPatients
    let linkedPatients = [];
    try {
      linkedPatients = helper.linkedPatients ? JSON.parse(helper.linkedPatients as string) : [];
    } catch (parseError) {
      console.error('Error parsing linkedPatients:', parseError);
      linkedPatients = [];
    }

    // Remove patient from helper's linkedPatients
    const updatedLinkedPatients = linkedPatients.filter((id: string) => id !== patientId);
    await usersService.updateEntity({
      partitionKey: 'helper',
      rowKey: helperId,
      linkedPatients: JSON.stringify(updatedLinkedPatients)
    }, "Merge");

    // Delete any pending invitations between this patient and helper
    const invitations = await invitationService.getInvitationsByInviter(patientId as string);
    const helperInvitations = invitations.filter(inv => 
      inv.inviteeUserId === helperId || inv.inviteeEmail === helper.email
    );
    
    await Promise.all(helperInvitations.map(async inv => {
      if (inv.RowKey || inv.rowKey) {
        try {
          await invitationService.deleteEntity('INVITATION', inv.RowKey || inv.rowKey);
        } catch (error) {
          console.warn('Failed to delete invitation:', inv.RowKey || inv.rowKey, error);
          // Continue with other deletions even if one fails
        }
      }
    }));

    return NextResponse.json({
      message: 'Helper removed successfully'
    });
  } catch (error) {
    console.error('Error removing helper:', error);
    return NextResponse.json(
      { message: 'Failed to remove helper' },
      { status: 500 }
    );
  }
}