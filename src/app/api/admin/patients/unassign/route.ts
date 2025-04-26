import { NextResponse } from 'next/server';
import { UserService } from '@/lib/azure-tables';

const userService = new UserService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminId, patientId } = body;

    if (!adminId || !patientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Unassign the patient from the admin
    await userService.unassignPatientFromAdmin(patientId, adminId);

    return NextResponse.json({
      message: 'Patient unassigned successfully'
    });
  } catch (error) {
    console.error('Error unassigning patient:', error);
    return NextResponse.json(
      { error: 'Failed to unassign patient' },
      { status: 500 }
    );
  }
} 