import { NextResponse } from 'next/server';
import { UserService } from '@/lib/azure-tables';

const userService = new UserService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete the user and all associated data
    await userService.deleteUser(userId);

    return NextResponse.json({
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: 'Failed to delete user account' },
      { status: 500 }
    );
  }
} 