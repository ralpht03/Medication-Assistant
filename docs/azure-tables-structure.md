# Azure Tables Database Structure

## Overview
This document describes the Azure Tables database structure for the Medication Assistant application. Azure Tables is a NoSQL key-value store that provides scalable, schema-less storage.

## Table Structure

### USERS Table
- **PartitionKey**: "USER"
- **RowKey**: User ID (UUID)
- Properties:
  - email (String)
  - passwordHash (String)
  - firstName (String)
  - lastName (String)
  - dateOfBirth (String)
  - phoneNumber (String)
  - address (String)
  - emergencyContact (String)
  - createdAt (DateTime)
  - updatedAt (DateTime)
  - linkedPatients (String) - JSON array of patient IDs

### PATIENTS Table
- **PartitionKey**: "PATIENT"
- **RowKey**: User ID (UUID)
- Properties:
  - profile (String) - JSON object
  - medicalHistory (String) - JSON object
  - allergies (String) - JSON array
  - currentMedications (String) - JSON array

### MEDICATIONS Table
- **PartitionKey**: Patient ID (UUID)
- **RowKey**: Medication ID (UUID)
- Properties:
  - name (String)
  - dosage (String)
  - frequency (String)
  - route (String)
  - startDate (DateTime)
  - endDate (DateTime)
  - prescribingDoctor (String)
  - pharmacy (String)
  - notes (String)
  - refillsRemaining (Int32)
  - lastFilled (DateTime)

### VERIFICATIONLOGS Table
- **PartitionKey**: Patient ID (UUID)
- **RowKey**: Timestamp (DateTime) + "-" + Verification ID (UUID)
- Properties:
  - method (String)
  - verified (Boolean)
  - verificationData (String) - JSON object
  - imageUrl (String)
  - pillImageUrls (String) - JSON array
  - videoUrl (String)
  - helperId (String)
  - patientConfirmation (Boolean)
  - helperConfirmation (Boolean)

### ADHERENCE Table
- **PartitionKey**: Patient ID (UUID)
- **RowKey**: Month (YYYY-MM) + "-" + Record ID (UUID)
- Properties:
  - adherencePercentage (Double)
  - dailyAdherence (String) - JSON array

### ALERTS Table
- **PartitionKey**: User ID (UUID)
- **RowKey**: Timestamp (DateTime) + "-" + Alert ID (UUID)
- Properties:
  - medicationId (String)
  - type (String)
  - message (String)
  - read (Boolean)

## Partition Key Strategies
1. **USERS**: Fixed partition key "USER" for all user records
2. **PATIENTS**: Fixed partition key "PATIENT" for all patient records
3. **MEDICATIONS**: Partitioned by Patient ID to group medications by patient
4. **VERIFICATIONLOGS**: Partitioned by Patient ID to group logs by patient
5. **ADHERENCE**: Partitioned by Patient ID to group adherence records by patient
6. **ALERTS**: Partitioned by User ID to group alerts by user

## Query Patterns
1. Get user by ID:
   - Table: USERS
   - Query: PartitionKey eq "USER" and RowKey eq "user-id"

2. Get patient profile by user ID:
   - Table: PATIENTS
   - Query: PartitionKey eq "PATIENT" and RowKey eq "user-id"

3. Get medications for a patient:
   - Table: MEDICATIONS
   - Query: PartitionKey eq "patient-id"

4. Get verification logs for a patient:
   - Table: VERIFICATIONLOGS
   - Query: PartitionKey eq "patient-id"

5. Get adherence records for a patient:
   - Table: ADHERENCE
   - Query: PartitionKey eq "patient-id"

6. Get alerts for a user:
   - Table: ALERTS
   - Query: PartitionKey eq "user-id"

## Performance Considerations
1. Use appropriate partition keys to distribute load evenly
2. Store related data in the same partition for efficient queries
3. Use denormalized data where appropriate to reduce joins
4. Use JSON strings for complex nested data structures
5. Consider table storage limits (1MB per entity)

## Migration from Mock Database
1. Convert JSON data to Azure Tables entities
2. Map relationships using partition and row keys
3. Update application code to use Azure Tables SDK
4. Implement retry logic for transient failures
5. Add monitoring for table storage metrics

## Best Practices
1. Use consistent naming conventions for partition and row keys
2. Store timestamps in ISO 8601 format
3. Use JSON for complex data structures
4. Implement proper error handling
5. Use table storage metrics for monitoring
6. Implement proper access control using SAS tokens

## Example Queries

### Get All Medications for a Patient
```typescript
const query = new TableQuery()
  .where('PartitionKey eq ?', patientId);

const medications = await tableClient.queryEntities(query);
```

### Get Recent Verification Logs
```typescript
const query = new TableQuery()
  .where('PartitionKey eq ? and RowKey ge ?', 
    patientId, 
    new Date().toISOString().split('T')[0]);

const logs = await tableClient.queryEntities(query);
```

### Get Unread Alerts
```typescript
const query = new TableQuery()
  .where('PartitionKey eq ? and read eq ?', 
    userId, 
    false);

const alerts = await tableClient.queryEntities(query);
```

## Authentication Implementation

### Password Hashing
1. Use bcrypt for password hashing
2. Store hashed passwords in the passwordHash field
3. Example implementation:
```typescript
import bcrypt from 'bcrypt';

const saltRounds = 10;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

### Signup Flow
1. Validate input data
2. Check if email exists in USERS table
3. Hash password
4. Create new user entity
5. Example signup implementation:
```typescript
import { v4 as uuidv4 } from 'uuid';
import { TableQuery, TableService } from 'azure-storage';

async function signup(tableClient: TableService, userData: {
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: string
}) {
  // Check if user exists
  const query = new TableQuery()
    .where('PartitionKey eq ? and email eq ?', 'USER', userData.email);
  
  const existingUser = await tableClient.queryEntities('USERS', query, null);
  if (existingUser.entries.length > 0) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(userData.password);

  // Create user entity
  const userEntity = {
    PartitionKey: 'USER',
    RowKey: uuidv4(),
    email: userData.email,
    passwordHash: hashedPassword,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await tableClient.insertEntity('USERS', userEntity);
  
  // If user is a patient, create patient profile
  if (userData.role === 'patient') {
    const patientEntity = {
      PartitionKey: 'PATIENT',
      RowKey: userEntity.RowKey,
      profile: JSON.stringify({}),
      medicalHistory: JSON.stringify({}),
      allergies: JSON.stringify([]),
      currentMedications: JSON.stringify([])
    };
    
    await tableClient.insertEntity('PATIENTS', patientEntity);
  }

  return {
    id: userEntity.RowKey,
    email: userEntity.email,
    firstName: userEntity.firstName,
    lastName: userEntity.lastName,
    role: userEntity.role
  };
}
```

### Login Flow
1. Find user by email
2. Verify password hash
3. Generate session token
4. Example login implementation:
```typescript
import { TableQuery, TableService } from 'azure-storage';
import jwt from 'jsonwebtoken';

async function login(tableClient: TableService, email: string, password: string) {
  // Find user by email
  const query = new TableQuery()
    .where('PartitionKey eq ? and email eq ?', 'USER', email);
  
  const result = await tableClient.queryEntities('USERS', query, null);
  if (result.entries.length === 0) {
    throw new Error('User not found');
  }

  const user = result.entries[0];

  // Verify password
  const passwordMatch = await verifyPassword(password, user.passwordHash._);
  if (!passwordMatch) {
    throw new Error('Invalid password');
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.RowKey._,
      email: user.email._,
      role: user.role._
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  return {
    user: {
      id: user.RowKey._,
      email: user.email._,
      firstName: user.firstName._,
      lastName: user.lastName._,
      role: user.role._
    },
    token
  };
}
```

### API Routes Implementation
Update the existing API routes to use Azure Tables:

```typescript
// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTableService } from '@/lib/azure-tables';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, role } = body;
    
    // Validate input
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const tableService = getTableService();
    const user = await signup(tableService, {
      email,
      password,
      firstName,
      lastName,
      role
    });
    
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}

// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTableService } from '@/lib/azure-tables';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const tableService = getTableService();
    const result = await login(tableService, email, password);
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }
}
```

## Next Steps
1. Implement Azure Tables SDK integration
2. Create migration scripts
3. Update API routes to use Azure Tables
4. Implement proper error handling
5. Add monitoring and alerting