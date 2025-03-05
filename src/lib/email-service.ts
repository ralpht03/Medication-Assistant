// src/lib/email-service.ts
import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY is not set. Email functionality will not work.');
}

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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const invitationLink = `${baseUrl}/invitation/${token}`;
  
  const roleText = inviteeRole === 'patient' 
    ? 'patient in the medication management system' 
    : 'helper for medication management';

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@medicationassistant.com';
  
  const msg = {
    to,
    from: fromEmail,
    subject: `Invitation to join as a ${roleText}`,
    text: `
      ${inviterName} (${inviterRole}) has invited you to join as a ${roleText}.
      
      ${message ? `Message: ${message}\n\n` : ''}
      
      Click the link below to accept the invitation:
      ${invitationLink}
      
      This invitation will expire in 24 hours.
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568; margin-bottom: 20px;">Medication Management Invitation</h2>
        
        <p><strong>${inviterName}</strong> (${inviterRole}) has invited you to join as a ${roleText}.</p>
        
        ${message ? `<p style="background-color: #f7fafc; padding: 15px; border-radius: 5px; font-style: italic;">Message: ${message}</p>` : ''}
        
        <p>Click the button below to accept the invitation:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" style="background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 12px;">
            Accept Invitation
          </a>
        </p>
        
        <p style="color: #718096; font-size: 14px;"><em>This invitation will expire in 24 hours.</em></p>
        
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #718096; font-size: 12px; text-align: center;">
          If you're having trouble with the button above, copy and paste the URL below into your web browser:
          <br>
          <a href="${invitationLink}" style="color: #4299e1;">${invitationLink}</a>
        </p>
      </div>
    `
  };

  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('Email would be sent (SENDGRID_API_KEY not set):', msg);
      return { success: true, mock: true };
    }
    
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
}