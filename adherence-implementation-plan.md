# Medication Adherence Implementation Plan

## Overview

We'll implement a medication adherence tracking system that focuses on whether patients are taking the correct dosage of their medications. The system will use data from the VerificationLogs table in Azure Tables to calculate adherence metrics.

## Adherence Calculation Logic

The adherence calculation will be based on the following principles:

1. **Correct Dosage**: A medication is considered "taken correctly" only if:
   - The status is 'taken' AND
   - The pill count matches the recommended pill count (isCorrectDose is true)

2. **Adherence Percentage**: Calculated as:
   ```
   (correctly taken medications / total medications) * 100
   ```

3. **Streak**: The number of consecutive days where all medications were taken correctly.

## Implementation Steps

### 1. Update the Adherence API Endpoint

Modify `src/app/api/adherence/route.ts` to:

- Calculate the number of correctly taken medications (status = 'taken' AND isCorrectDose = true)
- Calculate the number of incorrectly taken medications (status = 'taken' BUT isCorrectDose = false)
- Include these metrics in the response

```typescript
// Calculate adherence metrics
const totalVerifications = verificationLogs.length;
const successfulVerifications = verificationLogs.filter(log => log.status === 'taken').length;
const correctDoseVerifications = verificationLogs.filter(log => log.status === 'taken' && log.isCorrectDose).length;
const incorrectDoseVerifications = successfulVerifications - correctDoseVerifications;

// Calculate adherence percentage based on correct dosage
const adherencePercentage = totalVerifications > 0 
  ? Math.round((correctDoseVerifications / totalVerifications) * 100).toString()
  : "0";
```

### 2. Update the Patient Dashboard

Modify `src/app/patient/dashboard/page.tsx` to:

- Display the adherence percentage based on correct dosage
- Show a breakdown of correct vs. incorrect dosages
- Use the existing ProgressChart component with the updated data

```typescript
setAdherenceData({
  percentage: data.adherencePercentage,
  streak: data.streak,
  dailyHistory: data.dailyAdherence,
  totalVerifications: data.totalVerifications,
  successfulVerifications: data.correctDoseVerifications, // Use correct dose verifications
  missedVerifications: data.totalVerifications - data.successfulVerifications,
  incorrectDoseVerifications: data.incorrectDoseVerifications
});
```

### 3. Enhance the ProgressChart Component

Update `src/components/shared/ProgressChart.tsx` to:

- Display the percentage of medications taken with the correct dosage
- Add a section showing correct vs. incorrect dosages
- Keep the UI simple and easy to understand

## Benefits

1. **Simplicity**: The adherence calculation is straightforward and easy to understand.
2. **Accuracy**: The system accounts for both taking the medication and taking the correct dosage.
3. **Actionable Insights**: Patients can see if they're consistently taking the wrong dosage.

## Example UI

```
Medication Adherence: 75%

Current streak: 3 days

Total medications: 20
Taken correctly: 15
Taken incorrectly: 3
Missed: 2

Daily History:
Mon: 3/4 taken
Tue: 2/3 taken
Wed: 4/4 taken
...
```

This implementation provides a clear and simple way to track medication adherence based on taking the correct dosage.