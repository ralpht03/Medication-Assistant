import { NextResponse } from "next/server";
import { AzureTableService } from '@/lib/azure/table-service'
import { Alerts } from '@/lib/types'
import { TableEntity } from "@azure/data-tables";
import { parseJsonField } from '@/lib/azure-table-utils';

const ALERTS_TABLE = 'Alerts'
const USERS_TABLE = 'Users'

// Initialize table clients with error handling
let tableClient: AzureTableService;
let usersClient: AzureTableService;

try {
  tableClient = new AzureTableService(ALERTS_TABLE);
  usersClient = new AzureTableService(USERS_TABLE);
} catch (error) {
  console.error('Error initializing Azure Table clients:', error);
  throw new Error('Failed to initialize Azure Table clients');
}

interface AlertWithPatientInfo extends Alerts {
  patientName: string;
  patientEmail: string;
}

interface UserEntity extends TableEntity {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  linkedPatients?: string;
}

interface RawAlert extends TableEntity {
  partitionKey: string;
  rowKey: string;
  userId: string;
  medicationId: string;
  type: string;
  message: string;
  read: boolean;
  priority?: string;
  timestamp: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    
    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    console.log('Received request for adminId:', adminId);

    // Get admin entity
    let adminEntity: UserEntity;
    try {
      const adminResponse = await usersClient.getEntity('admin', adminId);
      if (!adminResponse.partitionKey || !adminResponse.rowKey) {
        throw new Error('Invalid admin entity: missing partitionKey or rowKey');
      }
      adminEntity = {
        ...adminResponse,
        partitionKey: adminResponse.partitionKey,
        rowKey: adminResponse.rowKey,
        firstName: adminResponse.firstName as string,
        lastName: adminResponse.lastName as string,
        email: adminResponse.email as string,
        role: adminResponse.role as string,
        linkedPatients: adminResponse.linkedPatients as string
      };
      console.log('Found admin entity:', {
        partitionKey: adminEntity.partitionKey,
        rowKey: adminEntity.rowKey,
        email: adminEntity.email,
        role: adminEntity.role
      });
    } catch (error: any) {
      console.error('Error fetching admin entity:', error);
      if (error.statusCode === 404) {
        return NextResponse.json({ error: `Admin with ID ${adminId} not found` }, { status: 404 });
      }
      throw error;
    }

    // Get linked patients
    let linkedPatients: string[] = [];
    try {
      linkedPatients = parseJsonField<string[]>(adminEntity.linkedPatients as string, []);
      console.log('Parsed linked patients:', linkedPatients);
    } catch (error: any) {
      console.error('Error parsing linked patients:', error);
      return NextResponse.json([]);
    }

    if (!linkedPatients || linkedPatients.length === 0) {
      console.log('No linked patients found, returning empty array');
      return NextResponse.json([]);
    }

    // Get alerts for each patient
    const alerts: AlertWithPatientInfo[] = [];
    for (const patientId of linkedPatients) {
      try {
        console.log('Fetching alerts for patient:', patientId);
        const patientAlerts = await tableClient.queryEntities<Alerts>(`PartitionKey eq '${patientId}'`);
        console.log(`Found ${patientAlerts.length} alerts for patient ${patientId}`);

        for (const alert of patientAlerts) {
          try {
            const patientResponse = await usersClient.getEntity('patient', patientId);
            if (!patientResponse.partitionKey || !patientResponse.rowKey) {
              throw new Error('Invalid patient entity: missing partitionKey or rowKey');
            }
            const patientUser: UserEntity = {
              ...patientResponse,
              partitionKey: patientResponse.partitionKey,
              rowKey: patientResponse.rowKey,
              firstName: patientResponse.firstName as string,
              lastName: patientResponse.lastName as string,
              email: patientResponse.email as string,
              role: patientResponse.role as string
            };
            alerts.push({
              ...alert,
              patientName: `${patientUser.firstName} ${patientUser.lastName}`,
              patientEmail: patientUser.email
            });
          } catch (error) {
            console.error(`Error fetching patient user for alert:`, error);
            // Continue with next alert
          }
        }
      } catch (error) {
        console.error(`Error fetching alerts for patient ${patientId}:`, error);
        // Continue with next patient
      }
    }

    console.log(`Returning ${alerts.length} total alerts`);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Mark alert as read
export async function PATCH(req: Request) {
  try {
    const { userId, alertId } = await req.json();
    if (!userId || !alertId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const alert = await tableClient.getEntity(userId, alertId);
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const updatedAlert = {
      ...alert,
      PartitionKey: userId,
      RowKey: alertId,
      read: true
    };

    await tableClient.updateEntity(updatedAlert);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

// Delete alert
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partitionKey = searchParams.get('partitionKey');
    const rowKey = searchParams.get('rowKey');

    if (!partitionKey || !rowKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
      // First, verify the alert exists
      const alert = await tableClient.getEntity(partitionKey, rowKey);
      if (!alert) {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }

      // Delete the alert
      await tableClient.deleteEntity(partitionKey, rowKey);
      return NextResponse.json({ success: true });
    } catch (error: any) {
      // Handle specific Azure Table Storage errors
      if (error.statusCode === 404) {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json({ 
      error: 'Failed to delete alert',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 