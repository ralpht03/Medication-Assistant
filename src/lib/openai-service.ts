import { Medication } from "./types";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OpenAIService {
  private endpoint: string;
  private apiKey: string;
  private deployment: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !key || !deployment) {
      throw new Error("Azure OpenAI configuration is missing");
    }

    this.endpoint = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
    this.apiKey = key;
    this.deployment = deployment;
  }

  private async getCompletion(prompt: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a helpful medical assistant providing information about medications. Always format your responses using markdown for better readability. Use bullet points, headers, and tables where appropriate. Be clear and concise."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    try {
      const response = await fetch(
        `${this.endpoint}openai/deployments/${this.deployment}/chat/completions?api-version=2023-05-15`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey
          },
          body: JSON.stringify({
            messages: messages,
            temperature: 0.7,
            max_tokens: 500,
            n: 1
          })
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.error("Error in getCompletion:", error);
      throw new Error(`Failed to get completion: ${error.message}`);
    }
  }

  async getMedicationInfo(medicationName: string): Promise<string> {
    const prompt = `
Provide detailed information about ${medicationName} in the following format:

# ${medicationName} Information

## General Information
[Provide a brief description of what the medication is and its primary uses]

## Dosage and Administration
- **Prescribed Dosage**: [Include typical dosage information]
- **Frequency**: [Include how often to take]
- **Best Time**: [Include optimal time to take]
- **Special Instructions**: [Include any special instructions like taking with food]

## Important Notes
- [Include any critical information about storage, missed doses, or special precautions]
- [Include any lifestyle modifications needed]

Please provide accurate, clear, and concise information formatted in markdown.`;
    return this.getCompletion(prompt);
  }

  async getSideEffects(medicationName: string): Promise<string> {
    const prompt = `
# Side Effects of ${medicationName}

## Common Side Effects
[List the most common side effects and what to expect]

## When to Seek Medical Attention
[List serious side effects that require immediate medical attention]

## Managing Side Effects
[Provide practical advice for managing common side effects]

Please provide the information in a clear, organized format using markdown.`;
    return this.getCompletion(prompt);
  }

  async checkInteractions(medications: Medication[]): Promise<string> {
    const medicationDetails = medications.map(med => 
      `- ${med.name} (${med.dosage}, ${med.frequency})`
    ).join("\n");

    const prompt = `
# Medication Interaction Analysis

## Current Medications
${medicationDetails}

## Potential Interactions
[Analyze and list any potential interactions between these medications]

## Recommendations
[Provide specific advice about managing these medications together]

## Important Notes
[Include any special precautions or timing considerations]

Please analyze these medications for potential interactions and provide clear, actionable advice using markdown formatting.`;
    return this.getCompletion(prompt);
  }

  async handleMissedDose(medication: Medication): Promise<string> {
    const prompt = `
# Missed Dose Guidelines for ${medication.name}

## What to Do
[Provide clear instructions for handling a missed dose of ${medication.name}]

## Important Notes
- Prescribed schedule: ${medication.frequency}
- Current dosage: ${medication.dosage}
- Regular timing: ${medication.time}

## Warnings
[Include what NOT to do, such as doubling up doses]

Please provide clear, step-by-step guidance using markdown formatting.`;
    return this.getCompletion(prompt);
  }

  async handleEmergencyQuestion(question: string, medication: Medication): Promise<string> {
    const prompt = `
# Emergency Response: ${medication.name}

## Question
${question}

## Medication Details
- Name: ${medication.name}
- Dosage: ${medication.dosage}
- Frequency: ${medication.frequency}
- Instructions: ${medication.instructions}

## Response
[Provide clear emergency guidance based on the question and medication details]

## Important Actions
[List specific steps the patient should take]

Please provide clear, actionable emergency guidance using markdown formatting.`;
    return this.getCompletion(prompt);
  }

  async getDailySchedule(medications: Medication[]): Promise<string> {
    const medicationDetails = medications
      .map(med => `- ${med.name} (${med.dosage}) - ${med.frequency} - ${med.time}${med.instructions ? ` - ${med.instructions}` : ''}`)
      .join("\n");

    const prompt = `
# Daily Medication Schedule

## Current Medications
${medicationDetails}

## Schedule Breakdown
[Organize medications by time of day in a clear schedule]

## Special Instructions
[Include any specific timing or administration instructions]

## Tips for Staying on Schedule
[Provide practical advice for maintaining the schedule]

Please create a clear, organized daily schedule using markdown formatting with tables and bullet points as appropriate.`;
    return this.getCompletion(prompt);
  }
}