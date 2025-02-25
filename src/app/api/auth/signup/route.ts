import { NextRequest, NextResponse } from 'next/server'
import { AzureTableService } from '@/lib/azure/table-service'

const usersTable = new AzureTableService('Users')

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
    const existingUsers = await usersTable.queryEntities(`email eq '${email}'`)
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

    // Create user in Azure Table Storage
    const user = {
      PartitionKey: role,
      RowKey: crypto.randomUUID(),
      email,
      passwordHash: password, // In production, use proper password hashing
      role,
      firstName: name.split(' ')[0],
      lastName: name.split(' ')[1] || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

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

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}