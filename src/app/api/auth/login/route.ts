import { NextResponse } from 'next/server'
import { AzureTableService } from '@/lib/azure/table-service'
import jwt from 'jsonwebtoken'

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
      // Query user by email across all roles
      const roles = ['admin', 'patient', 'helper'];
      let user = null;
      
      for (const role of roles) {
        const users = await usersTable.queryEntities(`PartitionKey eq '${role}' and email eq '${email}'`);
        if (users.length > 0) {
          user = users[0];
          break;
        }
      }
      
      if (!user) {
        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // In production, use proper password comparison
      if (user.passwordHash !== password) {
        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // Log the user object to debug
      console.log('User found:', user);
      
      // Get user properties with proper casing
      const userId = user.rowKey || user.RowKey;
      const userEmail = user.email || user.Email;
      const userRole = user.role || user.Role || user.partitionKey || user.PartitionKey;
      
      // Generate JWT token
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }
      
      const token = jwt.sign(
        {
          id: userId,
          userId: userId, // Include both for compatibility
          email: userEmail,
          role: userRole
        },
        secret,
        { expiresIn: '7d' } // Set to 7 days
      );
      
      // Create response with user data
      const response = NextResponse.json({
        user: {
          id: userId,
          email: userEmail,
          role: userRole,
          firstName: user.firstName || user.FirstName,
          lastName: user.lastName || user.LastName
        }
      });
      
      // Set token as cookie
      response.cookies.set({
        name: 'token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
      });
      
      return response;
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