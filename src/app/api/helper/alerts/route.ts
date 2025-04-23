import { NextRequest, NextResponse } from 'next/server'
import { TableClient, odata } from '@azure/data-tables'

export async function GET(request: NextRequest) {
  try {
    const helperId = request.nextUrl.searchParams.get('helperId')
    if (!helperId) {
      return NextResponse.json({ error: 'Helper ID is required' }, { status: 400 })
    }

    const read = request.nextUrl.searchParams.get('read')
    
    // Initialize table clients
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured')
    }

    const usersTable = TableClient.fromConnectionString(connectionString, 'Users')
    const alertsTable = TableClient.fromConnectionString(connectionString, 'Alerts')

    // Get the helper's linkedPatients using their ID
    const helperFilter = odata`PartitionKey eq 'helper' and RowKey eq ${helperId}`
    let helperUser = null
    
    try {
      const helperEntities = usersTable.listEntities({ queryOptions: { filter: helperFilter } })
      for await (const entity of helperEntities) {
        helperUser = entity
        break
      }
    } catch (error) {
      console.error('Error finding helper user:', error)
      return NextResponse.json({ error: 'Failed to find helper user' }, { status: 404 })
    }
    
    if (!helperUser) {
      return NextResponse.json({ error: 'Helper user not found' }, { status: 404 })
    }

    // Get the linkedPatients array
    let linkedPatients: string[] = []
    if (helperUser.linkedPatients) {
      try {
        linkedPatients = JSON.parse(helperUser.linkedPatients as string)
      } catch (error) {
        console.error('Error parsing linkedPatients:', error)
        return NextResponse.json({ error: 'Invalid linkedPatients format' }, { status: 500 })
      }
    }

    if (linkedPatients.length === 0) {
      return NextResponse.json([])
    }

    // Get alerts for these patients
    const filter = linkedPatients.map(id => `patientId eq '${id}'`).join(' or ')
    const readFilter = read !== null ? ` and read eq ${read}` : ''
    const entities = alertsTable.listEntities({
      queryOptions: { filter: `(${filter})${readFilter}` }
    })

    const results = []
    for await (const entity of entities) {
      results.push({
        id: entity.rowKey,
        patientId: entity.patientId,
        patientName: entity.patientName,
        message: entity.message,
        read: entity.read === 'true',
        createdAt: entity.createdAt
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching helper alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured')
    }

    const { alertId, read } = await request.json()
    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const alertsTable = TableClient.fromConnectionString(connectionString, 'Alerts')
    await alertsTable.updateEntity({
      partitionKey: 'Alert',
      rowKey: alertId,
      read: read ? 'true' : 'false'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
} 