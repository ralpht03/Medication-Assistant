import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AzureTableService } from '@/lib/azure/table-service';
import { Alerts, AzureTableUser } from '@/lib/types';
import { createTableClient } from '@/lib/azure-table-utils';
import { odata } from "@azure/data-tables";

// Constants for table names
const ALERTS_TABLE = 'Alerts';
const MEDICATIONS_TABLE = 'Medications';
const VERIFICATION_LOGS_TABLE = 'VerificationLogs';
const USERS_TABLE = 'Users';


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
export async function GET(request: NextRequest) {
  const alertsTable = new AzureTableService(ALERTS_TABLE);
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // For helpers, we need to get all alerts for their linked patients
    if (role === 'helper') {
      // Get the helper's linked patients
      const usersService = new AzureTableService(USERS_TABLE);
      const helper = await usersService.getEntity('helper', userId);
      if (!helper) {
        return NextResponse.json([]);
      }

      let linkedPatients: string[] = [];
      try {
        if (helper.linkedPatients) {
          linkedPatients = JSON.parse(helper.linkedPatients as string);
        }
      } catch (error) {
        console.error('Error parsing linkedPatients:', error);
        return NextResponse.json([]);
      }

      if (!Array.isArray(linkedPatients) || linkedPatients.length === 0) {
        return NextResponse.json([]);
      }

      let allAlerts: Alerts[] = [];

      // Fetch alerts for each linked patient
      for (const patientId of linkedPatients) {
        let filter = odata`PartitionKey eq '${patientId}'`;
        const patientAlerts = await alertsTable.queryEntities(filter);
        
        // Get patient details for each alert
        const patient = await usersService.getEntity('patient', patientId);
        const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Unknown Patient';
        
        // Add patient name to each alert
        const alertsWithPatientName = (patientAlerts as Alerts[]).map(alert => ({
          ...alert,
          patientName
        }));
        
        allAlerts = [...allAlerts, ...alertsWithPatientName];
      }

      // Sort alerts by timestamp (newest first)
      allAlerts.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());

      // Filter alerts based on status and helper acknowledgment
      const filteredAlerts = allAlerts.filter(alert => {
        // If status is 'unread', only show unread and unacknowledged alerts
        if (status === 'unread') {
          return !alert.read && !alert.helperAck;
        }
        // Otherwise, show all unacknowledged alerts
        return !alert.helperAck;
      });

      console.log('Helper alerts:', {
        totalAlerts: allAlerts.length,
        filteredAlerts: filteredAlerts.length,
        linkedPatients,
        status
      });

      return NextResponse.json(filteredAlerts);
    }

    // For other roles, use the standard filtering
    let filter = odata`PartitionKey eq '${userId}'`;
    if (status === 'unread') {
      filter = odata`PartitionKey eq '${userId}' and read eq false`;
    }

    const alerts = await alertsTable.queryEntities(filter) as Alerts[];
    
    // Filter alerts based on role-specific acknowledgment
    const filteredAlerts = alerts.filter(alert => {
      switch (role) {
        case 'admin':
          return !alert.adminAck;
        case 'patient':
          return !alert.patientAck;
        default:
          return true;
      }
    });

    return NextResponse.json(filteredAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const alertsTable = new AzureTableService(ALERTS_TABLE);
  try {
    const session = await getSession(request);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, alertId, role } = body;

    if (!userId || !alertId || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get the alert using the patient's ID as PartitionKey and alertId as RowKey
    const alertResponse = await alertsTable.getEntity(userId, alertId);
    if (!alertResponse) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    const alert = alertResponse as unknown as Alerts;

    // For helpers, verify they are linked to the patient
    if (role === 'helper') {
      const usersService = new AzureTableService(USERS_TABLE);
      const helperResponse = await usersService.getEntity('helper', session.user.id);
      if (!helperResponse || !helperResponse.linkedPatients) {
        return NextResponse.json({ error: 'Helper not found or has no linked patients' }, { status: 403 });
      }
      const helper = helperResponse as unknown as AzureTableUser;

      const linkedPatients = JSON.parse(helper.linkedPatients as string);
      if (!linkedPatients.includes(alert.patientId)) {
        return NextResponse.json({ error: 'Helper is not linked to this patient' }, { status: 403 });
      }
    }

    // Update the alert based on role
    const update: Partial<Alerts> = {
      read: true
    };

    switch (role) {
      case 'admin':
        update.adminAck = true;
        break;
      case 'patient':
        update.patientAck = true;
        break;
      case 'helper':
        update.helperAck = true;
        break;
    }

    await alertsTable.updateEntity({
      ...alert,
      ...update
    } as Alerts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const alertsTable = new AzureTableService(ALERTS_TABLE);
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alertId');
    const userId = searchParams.get('userId');

    if (!alertId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get the alert to verify ownership
    const alertResponse = await alertsTable.getEntity(alertId, alertId);
    if (!alertResponse) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    const alert = alertResponse as unknown as Alerts;

    // Verify the user has permission to delete this alert
    if (alert.patientId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this alert' }, { status: 403 });
    }

    await alertsTable.deleteEntity(alertId, alertId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const alertsTable = new AzureTableService(ALERTS_TABLE);
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, medicationId, type, message, priority } = body;

    if (!patientId || !medicationId || !type || !message || !priority) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Create a new alert
    const alert: Alerts = {
      PartitionKey: patientId,
      RowKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      Timestamp: new Date().toISOString(),
      patientId,
      medicationId,
      type,
      message,
      priority,
      read: false,
      adminAck: false,
      patientAck: false,
      helperAck: false
    };

    await alertsTable.createEntity(alert);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
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
                const patient = await usersTable.getEntity('patient', patientId as string);
                patientName = `${patient.firstName} ${patient.lastName}`;
              } catch (error) {
                console.warn(`Could not find patient details for ${patientId}`);
              }
              
              const timestamp = new Date().toISOString();
              
              // Create patient alert
              const patientAlert = {
                PartitionKey: patientId as string,
                RowKey: `missed-dose-${medicationId}-${timestamp}`,
                Timestamp: timestamp,
                userId: patientId,
                patientId,
                medicationId,
                medicationName,
                type: 'missed_dose',
                message: `You missed your scheduled dose of ${medicationName} at ${medication.time}. Please take it as soon as possible.`,
                read: false,
                priority: 'high',
                adminAck: false,
                patientAck: false,
                helperAck: false
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
                      PartitionKey: admin.rowKey as string,
                      RowKey: `patient-missed-dose-${medicationId}-${timestamp}`,
                      Timestamp: timestamp,
                      userId: admin.rowKey as string,
                      patientId,
                      patientName,
                      medicationId,
                      medicationName,
                      type: 'patient_missed_dose',
                      message: `Patient ${patientName} missed their scheduled dose of ${medicationName} at ${medication.time}.`,
                      read: false,
                      priority: 'high',
                      adminAck: false,
                      patientAck: false,
                      helperAck: false
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
        timestamp: entity.timestamp || entity.Timestamp,
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
            timestamp: entity.timestamp || entity.Timestamp,
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