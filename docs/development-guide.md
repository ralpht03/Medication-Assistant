# Development Guide

This guide explains how to work with and test the authentication and database system during development.

## Table of Contents
1. [Setup](#setup)
2. [Development Workflow](#development-workflow)
3. [Testing](#testing)
4. [Common Tasks](#common-tasks)
5. [Troubleshooting](#troubleshooting)

## Setup

### Prerequisites
- Node.js installed
- npm or yarn package manager
- Basic understanding of TypeScript and React
- Code editor (VS Code recommended)

### Initial Setup
1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm run dev
```

## Development Workflow

### 1. Working with the Mock Database

The mock database is stored in `db.json`. Here's how to work with it:

```typescript
// Example: Creating a test user
import { db } from '@/lib/db'

const newUser = await db.users.create({
  name: "Test User",
  email: "test@example.com",
  password: "password123",
  role: "patient"
})
```

#### Viewing Database Contents
You can directly view the database contents in `db.json`:
```json
{
  "users": [
    {
      "id": "generated-uuid",
      "name": "Test User",
      "email": "test@example.com",
      "password": "password123",
      "role": "patient",
      "createdAt": "2024-01-26T...",
      "updatedAt": "2024-01-26T..."
    }
  ]
}
```

### 2. Testing Authentication

#### Testing Signup
1. Visit http://localhost:3000/signup
2. Fill in the form:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
   - Role: Patient
3. Submit the form
4. Verify in `db.json` that the user was created
5. Check that you're redirected to the appropriate dashboard

#### Testing Login
1. Visit http://localhost:3000/login
2. Use credentials from a created account
3. Verify role-based routing works correctly

### 3. Making Changes

#### Modifying the Database Schema
1. Update interfaces in `src/lib/types.ts`
2. Update database operations in `src/lib/db.ts`
3. Update API routes as needed
4. Test changes with the UI

Example of adding a new field:
```typescript
// 1. Update the interface
interface User {
  id: string
  name: string
  email: string
  password: string
  role: "patient" | "admin" | "helper"
  phoneNumber: string  // New field
  createdAt: string
  updatedAt: string
}

// 2. Update create operation usage
const user = await db.users.create({
  name: "Test",
  email: "test@example.com",
  password: "password",
  role: "patient",
  phoneNumber: "123-456-7890"  // Include new field
})
```

## Testing

### Manual Testing Checklist

#### Authentication
- [ ] Signup with valid data succeeds
- [ ] Signup with existing email fails
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails
- [ ] Role-based routing works correctly
- [ ] Form validation works (required fields, email format)

#### Database Operations
- [ ] Create operations add data to db.json
- [ ] Read operations retrieve correct data
- [ ] Update operations modify existing data
- [ ] Delete operations remove data
- [ ] Query operations filter correctly

### Automated Testing (Future Implementation)

```typescript
// Example test structure for future implementation
describe('Authentication', () => {
  it('should create new user on signup', async () => {
    const user = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "patient"
    }
    
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(user)
    })
    
    expect(response.ok).toBe(true)
  })
})
```

## Common Tasks

### 1. Adding a New User Manually
```typescript
const user = await db.users.create({
  name: "Admin User",
  email: "admin@example.com",
  password: "admin123",
  role: "admin"
})
```

### 2. Finding Users by Role
```typescript
const patients = await db.users.query({ role: "patient" })
```

### 3. Updating User Information
```typescript
const updated = await db.users.update(userId, {
  name: "Updated Name"
})
```

## Troubleshooting

### Common Issues and Solutions

1. **Database File Not Found**
   - Error: "ENOENT: no such file or directory, open 'db.json'"
   - Solution: Create db.json with initial structure:
   ```json
   {
     "users": [],
     "medications": [],
     "prescriptions": [],
     "adherenceRecords": []
   }
   ```

2. **Type Errors**
   - Error: "Property 'x' is missing in type..."
   - Solution: Check interface definitions in types.ts and ensure all required fields are provided

3. **API Route Errors**
   - Error: "API resolved without sending a response"
   - Solution: Ensure all code paths in API routes return a response:
   ```typescript
   export async function POST(request: NextRequest) {
     try {
       // ... handle request
       return NextResponse.json({ success: true })
     } catch (error) {
       return NextResponse.json(
         { error: error.message },
         { status: 400 }
       )
     }
   }
   ```

### Development Tips

1. **Monitoring Database Changes**
   - Keep db.json open in editor to watch changes
   - Use console.log in API routes for debugging
   - Check Network tab in browser dev tools

2. **Testing Different Roles**
   - Create test accounts for each role
   - Test role-specific features
   - Verify proper access restrictions

3. **Resetting the Database**
   - Make a backup of db.json
   - Reset to initial state when needed
   - Keep test data minimal

## Next Steps

1. **Adding Features**
   - Password reset functionality
   - Email verification
   - Session management
   - Remember me functionality

2. **Security Improvements**
   - Password hashing
   - Rate limiting
   - Input validation
   - CSRF protection

3. **Production Preparation**
   - Database migration plan
   - Backup strategy
   - Monitoring setup
   - Error logging

Remember to always backup db.json before making significant changes, as it contains all your development data.