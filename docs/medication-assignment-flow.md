# Medication Assignment Flow Documentation

This document outlines the complete flow of medication assignment from administrators to patients in the Medication Assistant system.

## Overview

The Medication Assistant system allows administrators to assign medications to patients, and for patients to view and manage their assigned medications. This document explains the technical implementation of this feature, including data flow, API endpoints, and component interactions.

## Table of Contents

1. [Data Model](#data-model)
2. [Admin-Patient Relationship](#admin-patient-relationship)
3. [Medication Assignment Process](#medication-assignment-process)
4. [API Endpoints](#api-endpoints)
5. [Component Interactions](#component-interactions)
6. [Error Handling](#error-handling)
7. [Troubleshooting](#troubleshooting)

## Data Model

### User Entities

Users are stored in Azure Table Storage with the following structure:

**Admin User:**
```
{
  partitionKey: "USER",
  rowKey: "<admin-id>",  // e.g., "459e9187-2c24-492e-b0c5-f97fc19601b0"
  email: "<admin-email>",  // e.g., "atest@usf.edu"
  firstName: "<first-name>",
  lastName: "<last-name>",
  role: "admin",
  linkedPatients: "[\"<patient-id-1>\", \"<patient-id-2>\", ...]"  // JSON string array
}
```

**Patient User:**
```
{
  partitionKey: "USER",
  rowKey: "<patient-id>",  // e.g., "05c5c180-10a9-4edc-a847-8188b16e0822"
  email: "<patient-email>",  // e.g., "ptest@usf.edu"
  firstName: "<first-name>",
  lastName: "<last-name>",
  role: "patient"
}
```

### Medication Entities

Medications are stored in Azure Table Storage with the following structure:

```
{
  partitionKey: "<patient-id>",  // Links medication to specific patient
  rowKey: "<medication-id>",  // Unique identifier for the medication
  name: "<medication-name>",
  dosage: "<dosage>",
  frequency: "<frequency>",  // e.g., "daily", "twice-daily", or "custom:<custom-value>"
  route: "<route>",  // e.g., "oral", "injection"
  startDate: "<start-date>",
  endDate: "<end-date>",
  time: "<time>",  // e.g., "08:00"
  verificationMethod: "<verification-method>",
  prescribingDoctor: "<doctor-name>",
  pharmacy: "<pharmacy-name>",
  notes: "<notes>",
  refillsRemaining: <number>,
  lastFilled: "<date>"
}
```

## Admin-Patient Relationship

Administrators and patients are linked through the `linkedPatients` field in the admin user entity. This field contains a JSON string array of patient IDs that the admin is responsible for.

### Establishing the Link

The link between an admin and a patient is established when:

1. A patient accepts an invitation from an admin
2. An admin manually adds a patient to their list
3. A system administrator assigns a patient to an admin

The `linkedPatients` array is updated to include the patient's ID when the link is established.

## Medication Assignment Process

### Step 1: Admin Selects a Patient

The admin views their list of linked patients in the admin dashboard. The list is fetched from the `/api/admin/patients` endpoint, which:

1. Retrieves the admin user entity
2. Extracts the `linkedPatients` array
3. Fetches details for each linked patient
4. Returns the patient list to the admin dashboard

### Step 2: Admin Assigns Medication

When an admin selects a patient, they can open the Medication Assignment Modal to assign a new medication:

1. The modal displays a form with fields for medication details
2. The admin fills out the form and submits it
3. The form data is sent to the `/api/medications` endpoint with a POST request
4. The endpoint creates a new medication entity in Azure Table Storage with the patient's ID as the partition key

### Step 3: Patient Views Assigned Medications

When a patient logs in and views their medications:

1. The patient's dashboard or medications page makes a GET request to `/api/medications?patientId={patientId}`
2. The endpoint queries Azure Table Storage for all medications with the patient's ID as the partition key
3. The medications are returned to the patient's dashboard or medications page
4. The UI displays the medications to the patient

## API Endpoints

### `/api/admin/patients`

**Purpose:** Retrieve the list of patients linked to an admin

**Method:** GET

**Query Parameters:**
- `adminId`: The ID of the admin user

**Response:**
```json
{
  "patients": [
    {
      "id": "<patient-id>",
      "name": "<first-name> <last-name>",
      "email": "<patient-email>",
      "lastMedication": "<time-since-last-medication>",
      "nextScheduled": "<time-until-next-medication>",
      "adherenceRate": <percentage>,
      "status": "<normal|missed|overdose>",
      "medicationCount": <number>
    },
    ...
  ]
}
```

### `/api/medications`

**Purpose:** Create or retrieve medications

**Method:** POST

**Request Body:**
```json
{
  "patientId": "<patient-id>",
  "name": "<medication-name>",
  "dosage": "<dosage>",
  "frequency": "<frequency>",
  "route": "<route>",
  "startDate": "<start-date>",
  "endDate": "<end-date>",
  "time": "<time>",
  "verificationMethod": "<verification-method>",
  "prescribingDoctor": "<doctor-name>",
  "pharmacy": "<pharmacy-name>",
  "notes": "<notes>",
  "refillsRemaining": <number>,
  "lastFilled": "<date>"
}
```

**Response:**
```json
{
  "success": true,
  "medication": {
    "rowKey": "<medication-id>",
    "name": "<medication-name>",
    ...
  }
}
```

**Method:** GET

**Query Parameters:**
- `patientId`: The ID of the patient

**Response:**
```json
{
  "medications": [
    {
      "rowKey": "<medication-id>",
      "name": "<medication-name>",
      "dosage": "<dosage>",
      ...
    },
    ...
  ]
}
```

## Component Interactions

### Admin Dashboard → Patient List Table

The admin dashboard loads the `PatientListTable` component, which:

1. Fetches the list of linked patients from `/api/admin/patients`
2. Displays the patients in a table
3. Provides a button to open the Medication Assignment Modal for each patient

### Medication Assignment Modal

When an admin clicks the button to assign a medication to a patient, the `MedicationAssignmentModal` component:

1. Displays a form with fields for medication details
2. Validates the form data
3. Sends a POST request to `/api/medications` with the form data
4. Shows a success message when the medication is assigned
5. Calls the `onMedicationAssigned` callback to refresh the patient list

### Patient Dashboard

The patient dashboard:

1. Fetches the patient's medications from `/api/medications?patientId={patientId}`
2. Displays the medications in the "Today's Medications" section
3. Provides buttons for the patient to mark medications as taken or snooze reminders

### Patient Medications Page

The patient medications page:

1. Fetches the patient's medications from `/api/medications?patientId={patientId}`
2. Displays a comprehensive list of all medications assigned to the patient
3. Shows detailed information about each medication, including dosage, frequency, and instructions

## Error Handling

The system includes robust error handling to ensure that the medication assignment process works correctly even in edge cases:

### Admin User Lookup

- Multiple filter combinations are used to find the admin user
- Fallback to search by email when ID lookup fails
- Detailed logging for troubleshooting

### Patient User Lookup

- Multiple filter combinations for patient lookup
- Fallback to search by email
- Mock patient creation for testing when lookup fails

### LinkedPatients Parsing

- Error handling for linkedPatients parsing
- Fallback to hardcoded patient ID when parsing fails
- Detailed logging of the linkedPatients array

### Medication Lookup

- Multiple filter combinations for medication lookup
- Detailed logging of medication data
- Error handling throughout the process

## Troubleshooting

### Common Issues

1. **Admin cannot see linked patients**
   - Check that the admin user has the correct role
   - Verify that the linkedPatients array is properly formatted
   - Check the console logs for errors in the admin user lookup

2. **Patient cannot see assigned medications**
   - Verify that the medications were created with the correct patient ID as the partition key
   - Check that the patient is logged in with the correct account
   - Look for errors in the medication lookup process

3. **Medication assignment fails**
   - Check that all required fields are filled out in the form
   - Verify that the patient ID is correct
   - Look for errors in the API response

### Debugging

The system includes extensive logging to help diagnose issues:

- Admin user lookup process
- Patient user lookup process
- LinkedPatients parsing
- Medication creation and retrieval

Check the browser console and server logs for detailed information about any errors that occur during the medication assignment process.