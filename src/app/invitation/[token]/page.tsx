"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InvitationDetails {
  inviterName: string;
  inviterRole: string;
  inviteeRole: string;
  inviteeEmail: string;
  message: string;
}

export default function InvitationAcceptPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/verify/${token}`);
        const data = await response.json();
        
        if (!data.valid) {
          setError(data.message || 'Invalid invitation');
          return;
        }
        
        setInvitation(data.invitation);
      } catch (err: any) {
        setError(err.message || 'Failed to verify invitation');
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyInvitation();
  }, [token]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!firstName || !lastName || !password) {
      setFormError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    
    try {
      const response = await fetch(`/api/invitations/accept/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          password
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to accept invitation');
      }
      
      // Redirect to login page
      router.push('/login?registered=true');
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-600 mb-4 text-center">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Invalid Invitation</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="text-center">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!invitation) {
    return null;
  }
  
  const roleText = invitation.inviteeRole === 'patient' ? 'Patient' : 'Helper';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Accept Invitation</h2>
          <p className="text-gray-600 mt-2">
            {invitation.inviterName} ({invitation.inviterRole}) has invited you to join as a {roleText.toLowerCase()}.
          </p>
          
          {invitation.message && (
            <div className="mt-4 p-4 bg-gray-50 rounded text-left">
              <p className="text-sm text-gray-700 italic">"{invitation.message}"</p>
            </div>
          )}
        </div>
        
        {formError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {formError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={invitation.inviteeEmail}
              disabled
              className="w-full p-2 border rounded bg-gray-50"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Account...' : 'Accept Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}