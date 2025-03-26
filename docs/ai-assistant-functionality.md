# AI Assistant Functionality

This document explains how the AI Assistant feature works in the Medication Assistant application, including the recent enhancements to support medication-independent questions.

## Overview

The AI Assistant provides patients with information about their medications, potential interactions, side effects, and general medical information. It uses Azure OpenAI to generate responses based on the patient's questions and medication data.

## Key Components

### 1. AI Assistant Page (`src/app/patient/ai-assistant/page.tsx`)

The main user interface for the AI Assistant, which includes:
- Medication selection
- Quick question buttons
- Free-form question input
- Conversation history
- Medical disclaimer

### 2. OpenAI Service (`src/lib/openai-service.ts`)

Handles communication with Azure OpenAI and formats prompts for different types of questions:
- Medication information
- Side effects
- Drug interactions
- Missed doses
- Emergency questions
- Daily medication schedules
- General medical information
- Questions about all medications

### 3. Medications API (`src/app/api/medications/route.ts`)

Processes requests from the AI Assistant page and routes them to the appropriate OpenAI Service method.

## Question Flow

1. User enters a question or selects a quick question
2. The question is analyzed to determine its type
3. The appropriate action is selected based on the question type
4. If needed, the user's medications are retrieved from the database
5. A prompt is generated and sent to Azure OpenAI
6. The response is displayed to the user

## Question Types

### Medication-Specific Questions

These questions require a specific medication to be selected:
- Medication information
- Side effects
- Missed doses
- Emergency questions

### General Questions

These questions do not require a specific medication to be selected:
- Drug interactions (uses all medications)
- Medication schedules (uses all medications)
- General medical information
- Questions about all medications

## Recent Enhancements

### 1. User Authentication

The AI Assistant now uses the logged-in user's ID to fetch their medications:
```javascript
const userStr = localStorage.getItem('user');
if (!userStr) {
  setError('User not found. Please log in again.');
  return;
}

const user = JSON.parse(userStr);
const patientId = user.id || user.rowKey || user.RowKey;
```

### 2. Medication-Independent Questions

The AI Assistant now supports questions without requiring a medication selection:
```javascript
// Check if this is a general medical question
const isGeneralMedicalQuestion = 
  question.toLowerCase().includes('what is') || 
  question.toLowerCase().includes('how does') ||
  question.toLowerCase().includes('can you explain') ||
  question.toLowerCase().includes('tell me about') ||
  question.toLowerCase().includes('information on');

if (isGeneralMedicalQuestion) {
  action = 'generalInfo';
  requestBody.question = question;
}
```

### 3. New Question Types

New question types have been added:
- `generalInfo`: General medical information
- `generalQuestion`: Any question without a specific category
- `allMedications`: Questions about all medications

## OpenAI Prompts

Each question type uses a specific prompt template to generate the most relevant response:

### General Medical Information

```
# Medical Information

## Question
[User's question]

## Answer
[Comprehensive answer]

## Additional Information
[Relevant context]

## References
[Medical guidelines]
```

### General Questions

```
# Response to Question

## Question
[User's question]

## Answer
[Helpful response]

## Additional Context
[Relevant information]
```

### All Medications Information

```
# Medication Information

## Question About Medications
[User's question]

## Current Medications
[List of medications]

## Response
[Comprehensive answer]

## Important Notes
[Warnings and considerations]
```

## Usage Examples

### Medication-Specific Questions

1. Select a medication (e.g., "Lisinopril")
2. Ask "What are the side effects of this medication?"
3. The system will use the `sideEffects` action with the selected medication

### General Medical Questions

1. Without selecting a medication, ask "What is hypertension?"
2. The system will use the `generalInfo` action to provide information about hypertension

### Questions About All Medications

1. Without selecting a medication, ask "What is the best time to take all my medications?"
2. The system will use the `allMedications` action to provide a response based on all the user's medications

## Error Handling

The AI Assistant includes robust error handling:
- Authentication errors (user not found, ID not found)
- API errors (failed to fetch medications, failed to get AI response)
- Input validation (ensuring questions are properly formatted)

## Medical Disclaimer

The AI Assistant includes a prominent medical disclaimer that users must acknowledge before using the feature. This disclaimer emphasizes that:
- The information is for informational purposes only
- It is not a substitute for professional medical advice
- Users should always consult with healthcare providers
- The information may not be completely accurate or up-to-date

## Future Enhancements

Potential future enhancements for the AI Assistant include:
- Context-aware follow-up questions
- More sophisticated natural language processing
- Integration with medication adherence data
- Personalized responses based on patient history
- Voice input and output