import { NextResponse } from 'next/server'
import { AzureTableService } from '@/lib/azure/table-service'

// Initialize the users table service with error handling
let usersTable: AzureTableService;
try {
  usersTable = new AzureTableService('Users');
} catch (error) {
  console.error('Failed to initialize Users table service:', error);
  // We'll handle this in the API route
}

export async function POST(request: Request) {
  try {
    // Check if the users table was initialized properly
    if (!usersTable) {
      console.error('Users table service is not initialized');
      return NextResponse.json(
        { message: 'Database connection error. Please check server configuration.' },
        { status: 500 }
      );
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    try {
      // Query user by email
      const users = await usersTable.queryEntities(`email eq '${email}'`);
      
      if (users.length === 0) {
        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const user = users[0];
      
      // In production, use proper password comparison
      if (user.passwordHash !== password) {
        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // Log the user object to debug
      console.log('User found:', user);
      
      // Return user data without sensitive information
      // Handle different possible casings of properties
      return NextResponse.json({
        user: {
          id: user.rowKey || user.RowKey,
          email: user.email || user.Email,
          role: user.role || user.Role || user.partitionKey || user.PartitionKey,
          firstName: user.firstName || user.FirstName,
          lastName: user.lastName || user.LastName
        }
      });
    } catch (queryError) {
      console.error('Error querying user:', queryError);
      return NextResponse.json(
        { message: 'Error during login. Please try again later.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle Azure-related errors
    if (error instanceof Error && error.message && (
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
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}