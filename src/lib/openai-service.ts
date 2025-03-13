import { Medication } from "./types";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OpenAIService {
  private endpoint: string;
  private apiKey: string;
  private deployment: string;
  private apiVersion: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';

    if (!endpoint || !key || !deployment) {
      throw new Error("Azure OpenAI configuration is missing");
    }

    this.endpoint = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
    this.apiKey = key;
    this.deployment = deployment;
    this.apiVersion = apiVersion;
    
    console.log('OpenAI Service initialized with:', {
      endpoint: this.endpoint,
      deployment: this.deployment,
      apiVersion: this.apiVersion,
      hasKey: !!this.apiKey
    });
  }

  private async getCompletion(prompt: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a helpful medical assistant providing information about medications. Format your responses using markdown for better readability. Use bullet points and tables where appropriate, but DO NOT include section headings like 'Answer' or 'Response' in your replies. Provide cohesive, natural responses that flow well. Be clear, concise, and conversational while maintaining a professional tone."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    try {
      const url = `${this.endpoint}openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
      console.log('Making OpenAI API request to:', url);
      
      const response = await fetch(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey
          },
          body: JSON.stringify({
            messages: messages,
            temperature: 0.7,
            max_tokens: 800,
            n: 1
          })
        }
      );

      if (!response.ok) {
        // Try to get more detailed error information
        let errorDetail = '';
        try {
          const errorData = await response.json();
          errorDetail = JSON.stringify(errorData);
        } catch (e) {
          errorDetail = await response.text();
        }
        
        console.error('OpenAI API error details:', errorDetail);
        throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}. Details: ${errorDetail}`);
      }

      const data = await response.json();
      console.log('OpenAI API response received:', {
        choices: data.choices?.length || 0,
        hasContent: !!data.choices?.[0]?.message?.content
      });
      
      return data.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.error("Error in getCompletion:", error);
      // Log additional details about the error
      if (error.cause) {
        console.error("Error cause:", error.cause);
      }
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
      
      throw new Error(`Failed to get completion: ${error.message}`);
    }
  }

  async getMedicationInfo(medicationName: string): Promise<string> {
    const prompt = `
You are a helpful medical assistant providing information to a patient about ${medicationName}.

Provide detailed information about this medication including:
- A brief description of what the medication is and its primary uses
- Typical dosage information
- How often to take it and the optimal time
- Any special instructions like taking with food
- Critical information about storage, missed doses, or special precautions
- Any lifestyle modifications needed

Your response should be clear, helpful, and written in a conversational but professional tone. Format important points as bullet points where appropriate, but maintain a natural flow to your response.`;
    return this.getCompletion(prompt);
  }

  async getSideEffects(medicationName: string): Promise<string> {
    const prompt = `
You are a helpful medical assistant providing information to a patient about the side effects of ${medicationName}.

Provide information about:
- The most common side effects and what to expect
- Serious side effects that require immediate medical attention
- Practical advice for managing common side effects

Your response should be clear, helpful, and written in a conversational but professional tone. Format important points as bullet points where appropriate, but maintain a natural flow to your response.`;
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

  async getGeneralMedicalInfo(question: string): Promise<string> {
    const prompt = `
You are a helpful medical assistant providing information to a patient. The patient has asked: "${question}"

Provide a comprehensive, accurate answer to this medical question. Include relevant context and additional details that might be helpful. If appropriate, mention general medical guidelines or sources.

Remember to emphasize that this is general information and not personalized medical advice. Your response should be clear, helpful, and written in a conversational but professional tone.`;
    return this.getCompletion(prompt);
  }

  async answerGeneralQuestion(question: string): Promise<string> {
    const prompt = `
You are a helpful medical assistant providing information to a patient. The patient has asked: "${question}"

Provide a helpful, informative answer to this question. Include any relevant information that might help the user understand better.

Your response should be clear, helpful, and written in a conversational but professional tone. If the question is outside your scope of knowledge or requires personalized medical advice, indicate that the user should consult with a healthcare professional.`;
    return this.getCompletion(prompt);
  }

  async getAllMedicationsInfo(question: string, medications: Medication[]): Promise<string> {
    const medicationDetails = medications
      .map(med => `- ${med.name} (${med.dosage}) - ${med.frequency}${med.instructions ? ` - ${med.instructions}` : ''}`)
      .join("\n");

    const prompt = `
You are a helpful medical assistant providing information to a patient about their medications. The patient has asked: "${question}"

The patient is currently taking the following medications:
${medicationDetails}

Provide a comprehensive answer about these medications based on the question. Include any relevant warnings, interactions, or special considerations.

Your response should be clear, helpful, and written in a conversational but professional tone. Focus on addressing the specific question while providing context about all the medications listed.`;
    return this.getCompletion(prompt);
  }
}