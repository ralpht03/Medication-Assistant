# Application Structure Documentation

This document explains the organization and purpose of the Medication Assistant application's directory structure, focusing on the app directory, components, and lib folder.

## Table of Contents
1. [App Directory Overview](#app-directory-overview)
2. [Page Structure](#page-structure)
3. [API Routes](#api-routes)
4. [Components](#components)
5. [Lib Folder](#lib-folder)
6. [Public Assets](#public-assets)

## App Directory Overview

The application follows Next.js 13+ App Router structure:

```
app/
├── (auth)/               # Authentication related pages
│   ├── login/            # Login page
│   └── signup/           # Signup page
├── admin/                # Admin specific pages
│   └── dashboard/        # Admin dashboard
├── helper/               # Helper specific pages
│   └── dashboard/        # Helper dashboard
├── patient/              # Patient specific pages
│   └── dashboard/        # Patient dashboard
├── api/                  # API routes
│   └── auth/             # Authentication API
│       ├── login/        # Login API route
│       └── signup/       # Signup API route
├── globals.css           # Global styles
├── layout.tsx            # Root layout
└── page.tsx              # Home page
```

## Page Structure

### Authentication Pages
- `app/(auth)/login/page.tsx`: Login page component
- `app/(auth)/signup/page.tsx`: Signup page component

### Role-Specific Pages
- `app/admin/dashboard/page.tsx`: Admin dashboard
- `app/helper/dashboard/page.tsx`: Helper dashboard
- `app/patient/dashboard/page.tsx`: Patient dashboard

### Layouts
- `app/layout.tsx`: Root layout component
- `app/globals.css`: Global CSS styles

## API Routes

### Authentication API
- `app/api/auth/login/route.ts`: Handles login requests
- `app/api/auth/signup/route.ts`: Handles signup requests

## Components

The components folder contains reusable UI components:

```
components/
├── AdherenceSummary.tsx  # Medication adherence summary
├── Dashboard.tsx         # Main dashboard layout
├── Header.tsx            # Page header
├── MedicationList.tsx    # List of medications
└── Sidebar.tsx           # Navigation sidebar
```

### Key Components

1. **Header.tsx**
   - Contains navigation and user profile
   - Displays based on user role

2. **Sidebar.tsx**
   - Provides navigation links
   - Role-specific menu items

3. **MedicationList.tsx**
   - Displays list of medications
   - Includes search and filter functionality

4. **AdherenceSummary.tsx**
   - Shows medication adherence statistics
   - Visualizes data with charts

## Lib Folder

The lib folder contains shared utilities and database operations:

```
lib/
├── db.ts                 # Database operations
└── types.ts              # Type definitions
```

### Key Files

1. **db.ts**
   - Contains database operations:
     - Create, Read, Update, Delete (CRUD)
     - Query operations
   - Handles mock database interactions

2. **types.ts**
   - Defines TypeScript interfaces:
     - User, Medication, Prescription, AdherenceRecord
   - Ensures type safety across the application

## Public Assets

The public folder contains static assets:

```
public/
├── file.svg              # File icon
├── globe.svg             # Globe icon
├── next.svg              # Next.js logo
├── vercel.svg            # Vercel logo
└── window.svg            # Window icon
```

## Development Workflow

### Adding New Pages
1. Create new folder under app/
2. Add page.tsx file
3. Implement component logic
4. Add any necessary API routes

### Adding New Components
1. Create new file in components/
2. Implement component logic
3. Export component
4. Import and use in pages

### Modifying Database Operations
1. Update types in lib/types.ts
2. Modify operations in lib/db.ts
3. Update API routes as needed

## Best Practices

1. **Component Organization**
   - Keep components small and focused
   - Use descriptive names
   - Follow consistent patterns

2. **Type Safety**
   - Use TypeScript interfaces
   - Validate data at API boundaries
   - Use type guards where needed

3. **Code Structure**
   - Keep related files together
   - Use clear folder hierarchy
   - Maintain consistent naming

This structure provides a solid foundation for building and maintaining the Medication Assistant application.