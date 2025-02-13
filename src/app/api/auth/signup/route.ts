import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUsers = await db.users.query({ email })
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 409 }
      )
    }

    // Validate role
    const validRoles = ['patient', 'admin', 'helper']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: 'Invalid role' },
        { status: 400 }
      )
    }

    // In a real application, you would:
    // 1. Hash the password before storing
    // 2. Validate email format
    // 3. Implement email verification
    // 4. Add additional security measures
    const user = await db.users.create({
      name,
      email,
      role: role as 'patient' | 'admin' | 'helper',
      // In production, store hashed password
      password: password
    })

    // In a real application, you would:
    // 1. Create a session
    // 2. Set secure HTTP-only cookies
    // 3. Return proper tokens
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      role: user.role
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}