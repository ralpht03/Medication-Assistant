# Setting Up Azure Communication Services for Email

This guide will walk you through the process of setting up Azure Communication Services (ACS) for sending emails in the Medication Assistant application.

## Prerequisites

- An Azure account with an active subscription
- Access to the Azure portal (https://portal.azure.com)
- A verified domain for sending emails

## Step 1: Create an Azure Communication Services Resource

1. Sign in to the [Azure portal](https://portal.azure.com)
2. Click on "Create a resource" in the upper left corner
3. Search for "Communication Services" and select it
4. Click "Create"
5. Fill in the required information:
   - Subscription: Select your Azure subscription
   - Resource group: Create a new one or use an existing one
   - Resource name: Enter a unique name for your resource (e.g., "medication-assistant-comm")
   - Data location: Select a location close to your users
6. Click "Review + create" and then "Create"
7. Wait for the deployment to complete

## Step 2: Get the Connection String

1. Once the deployment is complete, click "Go to resource"
2. In the left menu, click on "Keys"
3. Copy the "Connection String" value
4. Update your `.env.local` file with this value:
   ```
   AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING=your-connection-string-here
   ```

## Step 3: Set Up Email Communication

1. In the left menu of your Communication Services resource, click on "Email Communication Services"
2. Click "Start" to begin the setup process
3. Follow the steps to provision an email service:
   - Choose "Connect your own domain" or "Use an Azure domain"
   - If using your own domain, you'll need to verify domain ownership through DNS records
   - Complete the domain verification process

## Step 4: Configure Sender Email

1. After your domain is verified, go to "Domains" in the Email Communication Services section
2. Add a sender email address from your verified domain
3. Update your `.env.local` file with this value:
   ```
   ACS_FROM_EMAIL=your-verified-email@your-domain.com
   ACS_FROM_NAME=Medication Assistant
   ```

## Step 5: Test the Email Service

1. In the Azure portal, navigate to your Email Communication Services resource
2. Click on "Test sending" in the left menu
3. Enter your own email address as the recipient
4. Enter a subject and message
5. Click "Send" to test the email delivery

## Troubleshooting

If you encounter issues with email delivery:

1. Check that your domain verification is complete and active
2. Verify that your connection string is correctly copied to the `.env.local` file
3. Ensure that your sender email is from a verified domain
4. Check the Azure portal for any service health issues
5. Review the application logs for specific error messages

## Additional Resources

- [Azure Communication Services Documentation](https://docs.microsoft.com/en-us/azure/communication-services/)
- [Email Communication Services Overview](https://docs.microsoft.com/en-us/azure/communication-services/concepts/email/email-overview)
- [Quickstart: Send an email using Email Communication Services](https://docs.microsoft.com/en-us/azure/communication-services/quickstarts/email/send-email)