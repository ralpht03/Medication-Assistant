import { NextResponse } from "next/server";
import { TableClient } from "@azure/data-tables";

const tableClient = TableClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!,
  "Alerts"
);

interface Alert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
  medicationId?: string;
  status?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const alerts: Alert[] = [];
    const query = `PartitionKey eq '${userId}'`;
    
    for await (const alert of tableClient.listEntities({
      queryOptions: { filter: query }
    })) {
      alerts.push({
        id: alert.rowKey as string,
        type: (alert.type as string) || 'info',
        message: alert.message as string,
        timestamp: (alert.Timestamp as string) || new Date().toISOString(),
        read: (alert.read as boolean) || false,
        medicationId: alert.medicationId as string | undefined,
        status: alert.status as string | undefined
      });
    }

    // Sort alerts by timestamp, newest first
    alerts.sort((a: Alert, b: Alert) => 
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

    // Update the alert's read status
    await tableClient.updateEntity(
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

    await tableClient.deleteEntity(userId, alertId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete alert error:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
} 