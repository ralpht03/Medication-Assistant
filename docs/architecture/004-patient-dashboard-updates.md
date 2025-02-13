# Patient Dashboard Updates

## Current Changes Needed

1. Simplify Dashboard Components:
   - Keep only:
     - Current Medications
     - Medical Adherence
     - Quick Actions
   - Remove:
     - Upcoming Doses
     - Notifications Panel

2. Create Shared Calendar Component:
   - Location: `src/components/shared/Calendar.tsx`
   - Features:
     - Show medication schedule
     - Click to view details (name, dosage, frequency)
     - Color-coded status indicators
     - Reusable across all user personas

3. Notification System Updates:
   - Move notifications to separate page: `/patient/notifications`
   - Update Sidebar:
     - Add "Notifications" link
     - Show unread count badge
   - Update Header:
     - Make notification bell link to notifications page
     - Show unread count

## Implementation Steps

1. Update Dashboard Page:
   - Remove unused components
   - Adjust layout for remaining components
   - Update data fetching logic

2. Create Calendar Component:
   - Use react-big-calendar or similar
   - Add medication-specific styling
   - Implement click handlers for details

3. Create Notifications Page:
   - Move notifications panel content
   - Add pagination and filtering
   - Implement mark-as-read functionality

4. Update Navigation:
   - Add notifications link to Sidebar
   - Update Header notification bell
   - Add proper routing

## Migration Plan

1. First Iteration:
   - Simplify dashboard
   - Create basic calendar component
   - Move notifications to new page

2. Second Iteration:
   - Enhance calendar features
   - Add notification management
   - Implement proper state management

3. Final Iteration:
   - Add animations and transitions
   - Implement accessibility features
   - Add loading states and error handling