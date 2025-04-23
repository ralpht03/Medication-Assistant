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
  patientId: string;
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
    const helperId = searchParams.get('helperId');
    const patientId = searchParams.get('patientId');

    if (!adminId && !helperId && !patientId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user entity based on role
    let userEntity: UserEntity;
    let linkedIds: string[] = [];

    if (adminId) {
      try {
        const adminResponse = await usersClient.getEntity('admin', adminId);
        if (!adminResponse.partitionKey || !adminResponse.rowKey) {
          throw new Error('Invalid admin entity: missing partitionKey or rowKey');
        }
        userEntity = {
          ...adminResponse,
          partitionKey: adminResponse.partitionKey,
          rowKey: adminResponse.rowKey,
          firstName: adminResponse.firstName as string,
          lastName: adminResponse.lastName as string,
          email: adminResponse.email as string,
          role: adminResponse.role as string,
          linkedPatients: adminResponse.linkedPatients as string
        };
        linkedIds = parseJsonField<string[]>(userEntity.linkedPatients || '[]', []);
      } catch (error) {
        console.error('Error fetching admin entity:', error);
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
      }
    } else if (helperId) {
      try {
        const helperResponse = await usersClient.getEntity('helper', helperId);
        if (!helperResponse.partitionKey || !helperResponse.rowKey) {
          throw new Error('Invalid helper entity: missing partitionKey or rowKey');
        }
        userEntity = {
          ...helperResponse,
          partitionKey: helperResponse.partitionKey,
          rowKey: helperResponse.rowKey,
          firstName: helperResponse.firstName as string,
          lastName: helperResponse.lastName as string,
          email: helperResponse.email as string,
          role: helperResponse.role as string,
          linkedPatients: helperResponse.linkedPatients as string
        };
        linkedIds = parseJsonField<string[]>(userEntity.linkedPatients || '[]', []);
      } catch (error) {
        console.error('Error fetching helper entity:', error);
        return NextResponse.json({ error: 'Helper not found' }, { status: 404 });
      }
    } else if (patientId) {
      // For patients, they only see their own alerts
      linkedIds = [patientId];
    }

    if (linkedIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get alerts for each linked patient
    const alerts: AlertWithPatientInfo[] = [];
    for (const id of linkedIds) {
      try {
        const patientAlerts = await tableClient.queryEntities<Alerts>(`PartitionKey eq '${id}'`);
        
        for (const alert of patientAlerts) {
          try {
            const patientResponse = await usersClient.getEntity('patient', id);
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
          }
        }
      } catch (error) {
        console.error(`Error fetching alerts for patient ${id}:`, error);
      }
    }

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