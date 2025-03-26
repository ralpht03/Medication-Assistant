# Utility Scripts for Medication Assistant

This directory contains utility scripts for the Medication Assistant application. These scripts are used for various administrative tasks, data management, and testing purposes.

## Available Scripts

### `direct-link-admin-patient.js`

**Purpose:** Directly link an admin user to a patient user in Azure Table Storage.

**Usage:**
```bash
node src/scripts/direct-link-admin-patient.js
```

**Description:**
This script establishes a direct link between an admin user and a patient user by:
1. Finding the admin user by email (default: `atest@usf.edu`)
2. Finding the patient user by email (default: `ptest@usf.edu`)
3. Adding the patient's ID to the admin's `linkedPatients` array
4. Updating the admin user entity in Azure Table Storage

**Configuration:**
Edit the script to change the admin and patient emails:
```javascript
// Admin and patient emails to link
const ADMIN_EMAIL = 'atest@usf.edu';
const PATIENT_EMAIL = 'ptest@usf.edu';
```

**Requirements:**
- Environment variables:
  - `AZURE_STORAGE_CONNECTION_STRING` or
  - `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_ACCOUNT_KEY`

### `link-admin-patient-azure.ts`

**Purpose:** TypeScript version of the admin-patient linking script with additional features.

**Usage:**
```bash
npx ts-node src/scripts/link-admin-patient-azure.ts
```

**Description:**
This script provides a more robust implementation of the admin-patient linking functionality, with:
- TypeScript type safety
- More detailed error handling
- Integration with the application's Azure Table service

**Requirements:**
- TypeScript and ts-node installed
- Environment variables properly configured

### `verify-admin-patient-link.ts`

**Purpose:** Verify that an admin is correctly linked to a patient.

**Usage:**
```bash
npx ts-node src/scripts/verify-admin-patient-link.ts
```

**Description:**
This script checks if an admin user is correctly linked to a patient by:
1. Retrieving the admin user entity
2. Checking the `linkedPatients` array for the patient's ID
3. Retrieving the patient user entity to verify it exists
4. Displaying the link status and user details

**Requirements:**
- TypeScript and ts-node installed
- Environment variables properly configured

## Common Issues and Troubleshooting

### Connection String Issues

If you encounter errors related to the Azure Storage connection string:

1. Verify that the `.env.local` file exists and contains the correct connection string
2. Check that the environment variables are properly loaded
3. Try using the account name and key instead of the connection string

### User Not Found Issues

If the script cannot find the admin or patient user:

1. Verify that the email addresses are correct
2. Check that the users exist in the Azure Table Storage
3. Try using the user IDs directly instead of email lookup

### LinkedPatients Format Issues

If there are issues with the `linkedPatients` array:

1. Check that the array is properly formatted as a JSON string
2. Verify that the patient IDs are correct
3. Try clearing the array and re-adding the patient ID

## Adding New Scripts

When adding new scripts to this directory:

1. Follow the existing naming conventions
2. Add proper error handling and logging
3. Document the script in this README
4. Include usage examples and requirements

## Environment Setup

Scripts in this directory require the following environment variables:

```
AZURE_STORAGE_CONNECTION_STRING=<your-connection-string>
```

Or alternatively:

```
AZURE_STORAGE_ACCOUNT=<your-account-name>
AZURE_STORAGE_ACCOUNT_KEY=<your-account-key>
```

These can be set in a `.env.local` file at the root of the project.