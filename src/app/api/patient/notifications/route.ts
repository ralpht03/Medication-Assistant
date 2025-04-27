import { NextRequest, NextResponse } from 'next/server'
import { createTableClient } from '@/lib/azure-tables'
import { Notification } from '@/lib/types'
import { getSession } from '@/lib/auth'

const NOTIFICATIONS_TABLE = 'Notifications'

export async function GET(request: NextRequest) {
  try {
    console.log('Getting session...');
    const session = await getSession(request)
    console.log('Session:', session);
    
    if (!session) {
      console.error('No session found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }
    
    if (!session.user) {
      console.error('No user in session');
      return NextResponse.json({ error: 'No user in session' }, { status: 401 })
    }
    
    if (!session.user.id) {
      console.error('No user ID in session');
      return NextResponse.json({ error: 'No user ID in session' }, { status: 401 })
    }

    console.log('Session user:', session.user);
    const tableClient = await createTableClient(NOTIFICATIONS_TABLE)
    console.log('Fetching notifications for user:', session.user.id);
    
    // Create an array to store all notifications
    const notifications: Notification[] = [];
    
    try {
      // Get the iterator with proper GUID quoting
      const filter = `PartitionKey eq '${session.user.id}'`;
      console.log('Using filter:', filter);
      
      const iterator = tableClient.listEntities<Notification>({
        queryOptions: {
          filter,
          orderBy: ['createdAt desc'],
          top: 20
        }
      });
      
      // Collect all notifications from the iterator
      let count = 0;
      for await (const notification of iterator) {
        console.log('Found notification:', notification);
        notifications.push(notification);
        count++;
      }
      
      console.log(`Found ${count} notifications for user ${session.user.id}`);
      return NextResponse.json(notifications);
    } catch (iteratorError) {
      console.error('Error iterating over notifications:', iteratorError);
      throw iteratorError;
    }
  } catch (error) {
    console.error('Error in GET /api/patient/notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, read } = await request.json()

    const tableClient = await createTableClient(NOTIFICATIONS_TABLE)
    const notification = await tableClient.getEntity<Notification>(
      session.user.id,
      notificationId
    )

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    const updatedNotification = {
      ...notification,
      read
    }

    await tableClient.updateEntity(updatedNotification, 'Replace')

    return NextResponse.json(updatedNotification)
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('DELETE request body:', body)
    
    const { notificationId } = body
    if (!notificationId) {
      console.error('Missing notificationId in request body')
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    console.log('Deleting notification:', { userId: session.user.id, notificationId })
    const tableClient = await createTableClient(NOTIFICATIONS_TABLE)
    
    try {
      await tableClient.deleteEntity(session.user.id, notificationId)
      console.log('Successfully deleted notification')
      return NextResponse.json({ success: true })
    } catch (deleteError) {
      console.error('Error deleting notification from table:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete notification from database' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in DELETE /api/patient/notifications:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 