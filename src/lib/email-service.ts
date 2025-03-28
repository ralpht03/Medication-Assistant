// src/lib/email-service.ts

export interface InvitationEmailParams {
  to: string;
  inviterName: string;
  inviterRole: string;
  inviteeRole: string;
  token: string;
  message?: string;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  inviterRole,
  inviteeRole,
  token,
  message
}: InvitationEmailParams) {
  
  // Log invitation details for debugging
  console.log('Invitation created:', {
    to,
    inviterName,
    inviterRole,
    inviteeRole,
    token,
    message: message || '(No message)'
  });
  
  // Return success without attempting to send an email
  return { success: true };
}