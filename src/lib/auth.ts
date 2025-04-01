// src/lib/auth.ts
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  id?: string;
  userId?: string;
  role: string;
  email: string;
}

export async function getSession(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');
    
    const decoded = jwt.verify(token, secret) as unknown as JWTPayload;
    
    return {
      user: {
        id: decoded.id || decoded.userId,
        userId: decoded.id || decoded.userId,
        role: decoded.role,
        email: decoded.email
      }
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}