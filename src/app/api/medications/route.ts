import { NextResponse } from "next/server";
import { TableClient } from "@azure/data-tables";

const tableClient = TableClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!,
  "Medications"
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Query medications for specific patient
    const medications = [];
    const query = `PartitionKey eq '${patientId}'`;
    
    for await (const medication of tableClient.listEntities({
      queryOptions: { filter: query }
    })) {
      medications.push({
        id: medication.rowKey,
        name: medication.name,
        dosage: medication.dosage,
        time: medication.time,
        status: medication.status
      });
    }

    return NextResponse.json(medications);
  } catch (error) {
    console.error("Fetch medications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medications" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { patientId, name, dosage, time } = await request.json();
    
    const medication = {
      partitionKey: patientId,
      rowKey: `med_${Date.now()}`,
      name,
      dosage,
      time,
      status: 'pending'
    };

    await tableClient.createEntity(medication);

    return NextResponse.json(medication);
  } catch (error) {
    console.error("Create medication error:", error);
    return NextResponse.json(
      { error: "Failed to create medication" },
      { status: 500 }
    );
  }
} 