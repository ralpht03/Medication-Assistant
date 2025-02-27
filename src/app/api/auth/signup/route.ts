import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/azure-tables';
import { SignupData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, role, dateOfBirth, phoneNumber, address, emergencyContact } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
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

    // Create signup data object
    const signupData: SignupData = {
      firstName,
      lastName,
      email,
      password,
      role
    };

    // Add optional fields if provided
    if (dateOfBirth) signupData.dateOfBirth = dateOfBirth;
    if (phoneNumber) signupData.phoneNumber = phoneNumber;
    if (address) signupData.address = address;
    if (emergencyContact) signupData.emergencyContact = emergencyContact;

    // Initialize UserService and create user
    const userService = new UserService();
    
    // Ensure tables exist
    await userService.createTables();
    
    // Create user
    const result = await userService.signup(signupData);

    // Set JWT token in HTTP-only cookie
    const response = NextResponse.json({
      user: result.user,
      message: 'Signup successful'
    });
    
    response.cookies.set({
      name: 'auth_token',
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
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