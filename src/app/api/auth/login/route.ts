import { NextResponse } from 'next/server'
import { TableClient } from "@azure/data-tables"

if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined in environment variables');
}

const tableClient = TableClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING,
  "Users"
);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Query user by email
    const users = [];
    const query = `email eq '${email}'`;
    
    for await (const user of tableClient.listEntities({
      queryOptions: { filter: query }
    })) {
      users.push(user);
    }
    
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

    // Return user data without sensitive information
    return NextResponse.json({
      user: {
        id: user.rowKey,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}