# Medication Assistant

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prerequisites

Before you begin, ensure you have met the following requirements:
- Node.js v18 or higher installed
- npm, yarn, pnpm, or bun package manager installed
- PostgreSQL database server running (version 15 or higher recommended)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/medication-assistant.git
   cd medication-assistant
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/medication_assistant"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. Run database migrations:
   ```bash
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Project Structure

```
medication-assistant/
├── docs/                  # Project documentation
├── public/                # Static assets
├── src/                   # Application source code
│   ├── app/               # Next.js app router
│   ├── components/        # Reusable components
│   ├── lib/               # Shared utilities and types
├── .env.local             # Environment variables
├── package.json           # Project dependencies and scripts
└── README.md              # Project documentation
```

## Available Scripts

- `dev`: Starts the development server
- `build`: Builds the application for production
- `start`: Starts the production server
- `lint`: Runs ESLint
- `db:migrate`: Runs database migrations
- `test`: Runs unit tests

## Testing

To run tests:
```bash
npm test
```

## Learn More

To learn more about Next.js, take a look at the following resources:
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
