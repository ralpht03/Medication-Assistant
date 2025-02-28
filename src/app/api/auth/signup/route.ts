import { NextRequest, NextResponse } from 'next/server'
import { AzureTableService } from '@/lib/azure/table-service'

// Initialize the users table service with error handling
let usersTable: AzureTableService;
try {
  usersTable = new AzureTableService('Users');
} catch (error) {
  console.error('Failed to initialize Users table service:', error);
  // We'll handle this in the API route
}

export async function POST(request: NextRequest) {
  try {
    // Check if the users table was initialized properly
    if (!usersTable) {
      console.error('Users table service is not initialized');
      return NextResponse.json(
        { message: 'Database connection error. Please check server configuration.' },
        { status: 500 }
      );
    }

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
    try {
      const existingUsers = await usersTable.queryEntities(`email eq '${email}'`)
      if (existingUsers.length > 0) {
        return NextResponse.json(
          { message: 'User already exists' },
          { status: 409 }
        )
      }
    } catch (queryError) {
      console.error('Error querying existing users:', queryError);
      return NextResponse.json(
        { message: 'Error checking existing users. Please try again later.' },
        { status: 500 }
      );
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

    try {
      await usersTable.createEntity(user)
    } catch (createError) {
      console.error('Error creating user entity:', createError);
      return NextResponse.json(
        { message: 'Error creating user account. Please try again later.' },
        { status: 500 }
      );
    }

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
    
    // Handle Azure-related errors
    if (error.message && (
        error.message.includes('Azure') ||
        error.message.includes('AZURE_STORAGE') ||
        error.message.includes('environment variable')
      )) {
      return NextResponse.json(
        { message: 'Database configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}