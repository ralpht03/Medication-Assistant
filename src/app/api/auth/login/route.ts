import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/azure-tables';
import { LoginData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Initialize UserService
    const userService = new UserService();
    
    // Login user
    const loginData: LoginData = {
      email,
      password
    };
    
    const result = await userService.login(loginData);

    // Set JWT token in HTTP-only cookie
    const response = NextResponse.json({
      user: result.user,
      message: 'Login successful'
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
    console.error('Login error:', error);
    
    // Handle specific errors
    if (error.message === 'User not found' || error.message === 'Invalid password') {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}