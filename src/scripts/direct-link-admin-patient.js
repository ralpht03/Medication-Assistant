// A simple script to directly link an admin and a patient in Azure Tables
// This script uses CommonJS modules and doesn't rely on the existing azure-tables.ts file

require('dotenv').config({ path: '.env.local' });
const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');

// Admin and patient emails to link
const ADMIN_EMAIL = 'atest@usf.edu';
const PATIENT_EMAIL = 'ptest@usf.edu';
const USERS_TABLE = 'Users';

// Create a TableClient for the Users table
function createTableClient() {
  try {
    // Debug environment variables
    console.log('Environment variables:');
    console.log('- AZURE_STORAGE_CONNECTION_STRING:', process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Set (value hidden)' : 'Not set');
    console.log('- AZURE_STORAGE_ACCOUNT:', process.env.AZURE_STORAGE_ACCOUNT || 'Not set');
    console.log('- AZURE_STORAGE_ACCOUNT_KEY:', process.env.AZURE_STORAGE_ACCOUNT_KEY ? 'Set (value hidden)' : 'Not set');
    
    // First try using connection string
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
      console.log('Using AZURE_STORAGE_CONNECTION_STRING to connect to Azure Tables');
      return TableClient.fromConnectionString(
        connectionString,
        USERS_TABLE
      );
    }
    
    // If no connection string, try using account name and key
    const accountName = process.env.AZURE_STORAGE_ACCOUNT;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    
    if (accountName && accountKey) {
      console.log('Using AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_ACCOUNT_KEY to connect to Azure Tables');
      const credential = new AzureNamedKeyCredential(accountName, accountKey);
      const url = `https://${accountName}.table.core.windows.net`;
      
      return new TableClient(
        url,
        USERS_TABLE,
        credential
      );
    }
    
    throw new Error('Either AZURE_STORAGE_CONNECTION_STRING or both AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_ACCOUNT_KEY must be provided in the environment variables.');
  } catch (error) {
    console.error(`Error initializing TableClient for ${USERS_TABLE}:`, error);
    throw new Error(`Failed to initialize Azure Table Storage client for ${USERS_TABLE}: ${error.message}`);
  }
}

// Get a user by email
async function getUserByEmail(tableClient, email) {
  console.log(`Finding user with email ${email}...`);
  
  const entities = tableClient.listEntities({
    queryOptions: {
      filter: `email eq '${email}'`
    }
  });

  let user = null;
  for await (const entity of entities) {
    user = entity;
    break;
  }

  if (!user) {
    throw new Error(`User with email ${email} not found`);
  }

  return user;
}

// Link an admin to a patient
async function linkAdminToPatient(adminEmail, patientEmail) {
  console.log(`Linking admin ${adminEmail} to patient ${patientEmail}...`);
  
  try {
    const tableClient = createTableClient();
    
    // Get the admin user
    const admin = await getUserByEmail(tableClient, adminEmail);
    
    if (admin.role !== 'admin') {
      throw new Error(`User ${adminEmail} is not an admin (role: ${admin.role})`);
    }
    
    console.log(`Found admin user: ${admin.firstName} ${admin.lastName} (ID: ${admin.rowKey})`);
    
    // Get the patient user
    const patient = await getUserByEmail(tableClient, patientEmail);
    
    if (patient.role !== 'patient') {
      throw new Error(`User ${patientEmail} is not a patient (role: ${patient.role})`);
    }
    
    console.log(`Found patient user: ${patient.firstName} ${patient.lastName} (ID: ${patient.rowKey})`);
    
    // Update the admin's linkedPatients array
    console.log('Updating admin\'s linkedPatients array...');
    const linkedPatients = admin.linkedPatients 
      ? JSON.parse(admin.linkedPatients) 
      : [];
    
    // Check if the patient is already linked
    if (linkedPatients.includes(patient.rowKey)) {
      console.log('Patient is already linked to this admin. No changes needed.');
      return;
    }
    
    // Add the patient ID to the array
    linkedPatients.push(patient.rowKey);
    
    // Update the admin record
    if (!admin.partitionKey || !admin.rowKey) {
      throw new Error('Admin entity is missing partitionKey or rowKey');
    }
    
    await tableClient.updateEntity({
      partitionKey: admin.partitionKey,
      rowKey: admin.rowKey,
      linkedPatients: JSON.stringify(linkedPatients)
    }, "Merge");
    
    console.log('✅ Successfully linked admin to patient!');
    console.log(`Admin ${admin.firstName} ${admin.lastName} (${adminEmail}) is now linked to patient ${patient.firstName} ${patient.lastName} (${patientEmail})`);
    
    // Verify the link
    await verifyAdminPatientLink(tableClient, adminEmail, patientEmail);
    
  } catch (error) {
    console.error('❌ Error linking admin to patient:', error);
    throw error;
  }
}

// Verify the link between an admin and a patient
async function verifyAdminPatientLink(tableClient, adminEmail, patientEmail) {
  console.log(`\nVerifying link between admin ${adminEmail} and patient ${patientEmail}...`);
  
  try {
    // Get the admin user
    const admin = await getUserByEmail(tableClient, adminEmail);
    
    if (admin.role !== 'admin') {
      throw new Error(`User ${adminEmail} is not an admin (role: ${admin.role})`);
    }
    
    // Get the patient user
    const patient = await getUserByEmail(tableClient, patientEmail);
    
    if (patient.role !== 'patient') {
      throw new Error(`User ${patientEmail} is not a patient (role: ${patient.role})`);
    }
    
    // Check if the patient is linked to the admin
    console.log('Checking if patient is linked to admin...');
    const linkedPatients = admin.linkedPatients 
      ? JSON.parse(admin.linkedPatients) 
      : [];
    
    if (linkedPatients.includes(patient.rowKey)) {
      console.log('✅ Patient is linked to this admin!');
      console.log(`Admin ${admin.firstName} ${admin.lastName} (${adminEmail}) is linked to patient ${patient.firstName} ${patient.lastName} (${patientEmail})`);
      
      // Display all linked patients for this admin
      console.log('\nAll patients linked to this admin:');
      if (linkedPatients.length > 0) {
        for (const patientId of linkedPatients) {
          try {
            // Try to get the patient details
            const entities = tableClient.listEntities({
              queryOptions: {
                filter: `rowKey eq '${patientId}'`
              }
            });
            
            let patientEntity = null;
            for await (const entity of entities) {
              patientEntity = entity;
              break;
            }
            
            if (patientEntity) {
              console.log(`- ${patientEntity.firstName} ${patientEntity.lastName} (ID: ${patientId})`);
            } else {
              console.log(`- Unknown patient (ID: ${patientId})`);
            }
          } catch (error) {
            console.log(`- Unknown patient (ID: ${patientId})`);
          }
        }
      } else {
        console.log('No patients linked to this admin.');
      }
      
      return true;
    } else {
      console.log('❌ Patient is NOT linked to this admin.');
      console.log(`Admin ${admin.firstName} ${admin.lastName} (${adminEmail}) is not linked to patient ${patient.firstName} ${patient.lastName} (${patientEmail})`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verifying admin-patient link:', error);
    throw error;
  }
}

// Run the script
async function main() {
  try {
    await linkAdminToPatient(ADMIN_EMAIL, PATIENT_EMAIL);
    console.log('\nScript completed successfully');
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

main();