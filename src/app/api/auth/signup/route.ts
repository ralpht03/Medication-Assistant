import { NextRequest, NextResponse } from 'next/server'
import { AzureTableService } from '@/lib/azure/table-service'

const usersTable = new AzureTableService('Users')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, role, dateOfBirth, phoneNumber, address, emergencyContact } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUsers = await usersTable.queryEntities(`email eq '${email}'`)
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 409 }
      )
    }

    // Validate role
    const validRoles = ['patient', 'admin', 'helper'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: 'Invalid role' },
        { status: 400 }
      );
    }

    // Create user in Azure Table Storage
    const user: any = {
      PartitionKey: role,
      RowKey: crypto.randomUUID(),
      email,
      passwordHash: password, // In production, use proper password hashing
      role,
      firstName,
      lastName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Add optional fields if provided
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = address;
    if (emergencyContact) user.emergencyContact = emergencyContact;

    await usersTable.createEntity(user)

    return NextResponse.json({
      user: {
        id: user.RowKey,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    })
  } catch (error: any) {
    console.error('Signup error:', error);
    
    // Handle specific errors
    if (error.message === 'User already exists') {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}