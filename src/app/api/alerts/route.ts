import { NextResponse } from "next/server";
import { createTableClient } from '@/lib/azure-table-utils';

// Constants for table names
const ALERTS_TABLE = 'Alerts';
const MEDICATIONS_TABLE = 'Medications';
const VERIFICATION_LOGS_TABLE = 'VerificationLogs';

/**
 * GET /api/alerts
 *
 * Query parameters:
 * - userId: The user ID to fetch alerts for
 * - type: (optional) Filter by alert type
 * - status: (optional) 'read', 'unread', or 'all'
 * - limit: (optional) Maximum number of alerts to return
 * - adminId: (optional) If provided, fetch alerts for an admin
 * - patientId: (optional) If adminId is provided, filter by patient ID
 * - action: (optional) 'check-missed-doses' to check for missed doses
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 }
      );
    }

    // Create table clients
    const alertsTable = createTableClient(ALERTS_TABLE);
    const usersTable = createTableClient('Users');
    
    let alerts = [];
    
    // Get user's linked patients/admins based on role
    const user = await usersTable.getEntity('USER', userId);
    let linkedIds: string[] = [];
    
    if (role === 'admin') {
      // Admin gets alerts for their linked patients
      if (user.linkedPatients) {
        linkedIds = JSON.parse(user.linkedPatients);
      }
    } else if (role === 'helper') {
      // Helper gets alerts for their linked patients
      if (user.linkedPatients) {
        linkedIds = JSON.parse(user.linkedPatients);
      }
    } else if (role === 'patient') {
      // Patient gets their own alerts
      linkedIds = [userId];
    }

    // Build filter based on role and linked IDs
    let filter = '';
    if (role === 'admin' || role === 'helper') {
      // For admin/helper, get alerts where partitionKey is in linkedIds
      filter = linkedIds.map(id => `PartitionKey eq '${id}'`).join(' or ');
    } else {
      // For patient, get their own alerts
      filter = `PartitionKey eq '${userId}'`;
    }

    if (type) {
      filter += ` and type eq '${type}'`;
    }

    if (status === 'read') {
      filter += ` and read eq true`;
    } else if (status === 'unread') {
      filter += ` and read eq false`;
    }

    // Fetch alerts
    const alertEntities = alertsTable.listEntities({ queryOptions: { filter } });
    
    for await (const entity of alertEntities) {
      // Get patient info for the alert
      let patientName = 'Unknown';
      try {
        const patient = await usersTable.getEntity('USER', entity.partitionKey);
        patientName = `${patient.firstName} ${patient.lastName}`;
      } catch (error) {
        console.error('Error fetching patient info:', error);
      }

      alerts.push({
        id: entity.rowKey,
        type: entity.type,
        message: entity.message,
        timestamp: entity.Timestamp,
        read: entity.read || false,
        priority: entity.priority || 'medium',
        medicationId: entity.medicationId,
        medicationName: entity.medicationName,
        patientId: entity.partitionKey,
        patientName
      });

      if (alerts.length >= limit) {
        break;
      }
    }

    // Sort alerts by timestamp, newest first
    alerts.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Fetch alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// Mark alert as read
export async function PATCH(request: Request) {
  try {
    const { userId, alertId } = await request.json();

    if (!userId || !alertId) {
      return NextResponse.json(
        { error: "User ID and Alert ID are required" },
        { status: 400 }
      );
    }

    // Create table client
    const alertsTable = createTableClient(ALERTS_TABLE);
    
    // Update the alert's read status
    await alertsTable.updateEntity(
      {
        partitionKey: userId,
        rowKey: alertId,
        read: true
      },
      "Merge"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update alert error:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

/**
 * Check for missed medication doses and generate alerts
 */
async function checkMissedDoses() {
  try {
    // Create table clients
    const medicationsTable = createTableClient(MEDICATIONS_TABLE);
    const verificationLogsTable = createTableClient(VERIFICATION_LOGS_TABLE);
    const alertsTable = createTableClient(ALERTS_TABLE);
    
    // Get current date/time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Track created alerts
    const createdAlerts = [];
    
    // Get all active medications
    for await (const medication of medicationsTable.listEntities()) {
      try {
        // Skip if no frequency or time information
        if (!medication.frequency || !medication.time) {
          continue;
        }
        
        const patientId = medication.patientId || medication.PartitionKey;
        const medicationId = medication.RowKey;
        const medicationName = medication.name || medicationId;
        
        // Parse medication time
        const [hours, minutes] = (medication.time as string).split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // Check if medication should have been taken by now
        // Only check if scheduled time is at least 1 hour in the past
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        if (scheduledTime < oneHourAgo) {
          // Check if there's a verification record for this medication today
          const startOfDay = new Date(today);
          startOfDay.setHours(0, 0, 0, 0);
          
          const filter = `PartitionKey eq '${patientId}' and medicationId eq '${medicationId}' and Timestamp ge datetime'${startOfDay.toISOString()}'`;
          
          let verificationExists = false;
          const verificationEntities = verificationLogsTable.listEntities({ queryOptions: { filter } });
          
          for await (const entity of verificationEntities) {
            verificationExists = true;
            break;
          }
          
          // If no verification exists, create missed dose alert
          if (!verificationExists) {
            // Check if we already created an alert for this medication today
            const alertFilter = `partitionKey eq '${patientId}' and type eq 'missed_dose' and medicationId eq '${medicationId}' and Timestamp ge datetime'${startOfDay.toISOString()}'`;
            
            let alertExists = false;
            const alertEntities = alertsTable.listEntities({ queryOptions: { filter: alertFilter } });
            
            for await (const entity of alertEntities) {
              alertExists = true;
              break;
            }
            
            // Only create alert if one doesn't already exist for today
            if (!alertExists) {
              // Get patient details
              const usersTable = createTableClient('Users');
              let patientName = patientId;
              try {
                const patient = await usersTable.getEntity('USER', patientId as string);
                patientName = `${patient.firstName} ${patient.lastName}`;
              } catch (error) {
                console.warn(`Could not find patient details for ${patientId}`);
              }
              
              const timestamp = new Date().toISOString();
              
              // Create patient alert
              const patientAlert = {
                partitionKey: patientId as string,
                rowKey: `missed-dose-${medicationId}-${timestamp}`,
                Timestamp: timestamp,
                userId: patientId,
                patientId,
                medicationId,
                medicationName,
                type: 'missed_dose',
                message: `You missed your scheduled dose of ${medicationName} at ${medication.time}. Please take it as soon as possible.`,
                read: false,
                priority: 'high'
              };
              
              await alertsTable.createEntity(patientAlert);
              createdAlerts.push(patientAlert);
              
              // Find linked admin(s) for this patient
              try {
                // Query for admins linked to this patient
                const adminFilter = `role eq 'admin' and linkedPatients ne null`;
                const adminEntities = usersTable.listEntities({ queryOptions: { filter: adminFilter } });
                
                for await (const admin of adminEntities) {
                  // Check if this admin is linked to the patient
                  const linkedPatients = admin.linkedPatients ? JSON.parse(admin.linkedPatients as string) : [];
                  if (linkedPatients.includes(patientId)) {
                    const adminAlert = {
                      partitionKey: admin.rowKey as string,
                      rowKey: `patient-missed-dose-${medicationId}-${timestamp}`,
                      Timestamp: timestamp,
                      userId: admin.rowKey as string,
                      patientId,
                      patientName,
                      medicationId,
                      medicationName,
                      type: 'patient_missed_dose',
                      message: `Patient ${patientName} missed their scheduled dose of ${medicationName} at ${medication.time}.`,
                      read: false,
                      priority: 'high'
                    };
                    
                    await alertsTable.createEntity(adminAlert);
                    createdAlerts.push(adminAlert);
                  }
                }
              } catch (error) {
                console.error("Error finding linked admins:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing medication ${medication.RowKey}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Missed dose check completed",
      alertsCreated: createdAlerts.length,
      alerts: createdAlerts.map(a => ({ type: a.type, medicationId: a.medicationId }))
    });
  } catch (error) {
    console.error("Error checking missed doses:", error);
    return NextResponse.json(
      { error: "Failed to check missed doses", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Get alerts for an admin user
 */
async function getAdminAlerts(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");
    const patientId = searchParams.get("patientId"); // Optional: filter by specific patient
    const type = searchParams.get("type"); // Optional: filter by alert type
    const status = searchParams.get("status"); // Optional: 'read', 'unread', or 'all'
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID is required" },
        { status: 400 }
      );
    }

    // Create table clients
    const alertsTable = createTableClient(ALERTS_TABLE);
    const usersTable = createTableClient('Users');
    
    // Get admin's linked patients
    let linkedPatientIds: string[] = [];
    
    try {
      const admin = await usersTable.getEntity('USER', adminId);
      
      if (admin.role !== 'admin') {
        return NextResponse.json(
          { error: "User is not an admin" },
          { status: 403 }
        );
      }
      
      if (admin.linkedPatients) {
        linkedPatientIds = JSON.parse(admin.linkedPatients as string);
      }
    } catch (error) {
      console.error("Error fetching admin:", error);
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }
    
    // If filtering by specific patient, check if patient is linked to admin
    if (patientId && !linkedPatientIds.includes(patientId)) {
      return NextResponse.json(
        { error: "Patient not linked to admin" },
        { status: 403 }
      );
    }
    
    const allAlerts = [];
    
    // Get alerts where admin is the direct recipient
    let adminFilter = `partitionKey eq '${adminId}'`;
    
    if (type) {
      adminFilter += ` and type eq '${type}'`;
    }
    
    if (status === 'read') {
      adminFilter += ` and read eq true`;
    } else if (status === 'unread') {
      adminFilter += ` and read eq false`;
    }
    
    const adminAlertEntities = alertsTable.listEntities({ queryOptions: { filter: adminFilter } });
    
    for await (const entity of adminAlertEntities) {
      allAlerts.push({
        id: entity.rowKey,
        type: entity.type,
        message: entity.message,
        timestamp: entity.Timestamp,
        read: entity.read || false,
        priority: entity.priority || 'medium',
        medicationId: entity.medicationId,
        medicationName: entity.medicationName,
        patientId: entity.patientId,
        patientName: entity.patientName
      });
      
      if (allAlerts.length >= limit) {
        break;
      }
    }
    
    // If we're filtering by a specific patient, also get that patient's alerts
    if (patientId) {
      // Only proceed if we haven't reached the limit yet
      if (allAlerts.length < limit) {
        let patientFilter = `partitionKey eq '${patientId}'`;
        
        if (type) {
          patientFilter += ` and type eq '${type}'`;
        }
        
        if (status === 'read') {
          patientFilter += ` and read eq true`;
        } else if (status === 'unread') {
          patientFilter += ` and read eq false`;
        }
        
        const patientAlertEntities = alertsTable.listEntities({ queryOptions: { filter: patientFilter } });
        
        for await (const entity of patientAlertEntities) {
          allAlerts.push({
            id: entity.rowKey,
            type: entity.type,
            message: entity.message,
            timestamp: entity.Timestamp,
            read: entity.read || false,
            priority: entity.priority || 'medium',
            medicationId: entity.medicationId,
            medicationName: entity.medicationName,
            patientId: patientId,
            patientName: entity.patientName || 'Patient'
          });
          
          if (allAlerts.length >= limit) {
            break;
          }
        }
      }
    }
    
    // Sort alerts by timestamp, newest first
    allAlerts.sort((a, b) =>
      new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()
    );
    
    return NextResponse.json(allAlerts);
  } catch (error) {
    console.error("Fetch admin alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin alerts" },
      { status: 500 }
    );
  }
}

// Delete alert
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const alertId = searchParams.get("alertId");

    if (!userId || !alertId) {
      return NextResponse.json(
        { error: "User ID and Alert ID are required" },
        { status: 400 }
      );
    }

    // Create table client
    const alertsTable = createTableClient(ALERTS_TABLE);
    
    // Delete the alert
    await alertsTable.deleteEntity(userId, alertId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete alert error:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}