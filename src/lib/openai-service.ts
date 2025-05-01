import { Medication } from "./types";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OpenAIService {
  private endpoint!: string;
  private apiKey!: string;
  private deployment!: string;
  private apiVersion!: string;
  private initialized = false;

  private initializeIfNeeded() {
    if (this.initialized) return;

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
    this.initialized = true;

    console.log('OpenAI Service initialized with:', {
      endpoint: this.endpoint,
      deployment: this.deployment,
      apiVersion: this.apiVersion,
      hasKey: !!this.apiKey
    });
  }

  private async getCompletion(prompt: string): Promise<string> {
    this.initializeIfNeeded();

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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify({
          messages,
          temperature: 0.7,
          max_tokens: 800,
          n: 1
        })
      });

      if (!response.ok) {
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
      if (error.cause) console.error("Error cause:", error.cause);
      if (error.stack) console.error("Error stack:", error.stack);
      throw new Error(`Failed to get completion: ${error.message}`);
    }
  }

  async getMedicationInfo(medication: Medication, isHelper: boolean = false): Promise<string> {
    const context = isHelper ? "a helper assisting a patient" : "a patient";
    const pronoun = isHelper ? "they" : "you";
    const prompt = `
You are a helpful medical assistant providing information to ${context} about ${medication.name}.

Provide detailed information about this medication including:
- A brief description of what the medication is and its primary uses
- Typical dosage information
- How often to take it and the optimal time
- Any special instructions like taking with food
- Critical information about storage, missed doses, or special precautions
- Any lifestyle modifications needed

Your response should be clear, helpful, and written in a conversational but professional tone. Format important points as bullet points where appropriate, but maintain a natural flow to your response. Use "${pronoun}" when referring to the person taking the medication.`;
    return this.getCompletion(prompt);
  }

  async getSideEffects(medication: Medication, isHelper: boolean = false): Promise<string> {
    const context = isHelper ? "a helper assisting a patient" : "a patient";
    const pronoun = isHelper ? "they" : "you";
    const prompt = `
You are a helpful medical assistant providing information to ${context} about the side effects of ${medication.name}.

Provide information about:
- The most common side effects and what to expect
- Serious side effects that require immediate medical attention
- Practical advice for managing common side effects

Your response should be clear, helpful, and written in a conversational but professional tone. Format important points as bullet points where appropriate, but maintain a natural flow to your response. Use "${pronoun}" when referring to the person taking the medication.`;
    return this.getCompletion(prompt);
  }

  async checkInteractions(medications: Medication[], isHelper: boolean = false): Promise<string> {
    const context = isHelper ? "a helper assisting a patient" : "a patient";
    const pronoun = isHelper ? "they" : "you";
    const medicationDetails = medications.map(med =>
      `- ${med.name} (${med.dosage}, ${med.frequency})`
    ).join("\n");
    const medicationCount = medications.length;

    const prompt = `
# Comprehensive Medication Interaction Analysis

## All Current Medications (${medicationCount} total)
${medicationDetails}

## Potential Interactions
[Perform a thorough analysis of ALL possible interactions between ANY of these ${medicationCount} medications. Consider both direct interactions between pairs of medications and any complex interactions involving multiple medications.]

## Severity Classification
[Classify any identified interactions by severity (mild, moderate, severe) and explain what each level means for the patient]

## Recommendations
[Provide specific advice about safely managing these medications together, including any timing adjustments that might reduce interaction risks]

## Important Notes
[Include any special precautions, monitoring needs, or symptoms that might indicate an adverse interaction]

Please analyze ALL of these medications together for ANY potential interactions and provide clear, actionable advice using markdown formatting. Consider both common and rare interactions, and explain the practical implications for the patient. Use "${pronoun}" when referring to the person taking the medication.`;
    return this.getCompletion(prompt);
  }

  async getMissedDoseGuidance(medication: Medication, isHelper: boolean = false): Promise<string> {
    const context = isHelper ? "a helper assisting a patient" : "a patient";
    const pronoun = isHelper ? "they" : "you";
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

Please provide clear, step-by-step guidance using markdown formatting. Use "${pronoun}" when referring to the person taking the medication.`;
    return this.getCompletion(prompt);
  }

  async getEmergencyGuidance(medication: Medication, question: string, isHelper: boolean = false): Promise<string> {
    const context = isHelper ? "a helper assisting a patient" : "a patient";
    const pronoun = isHelper ? "they" : "you";
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
[Include immediate steps to take and when to seek emergency medical attention]

Please provide clear, actionable guidance using markdown formatting. Use "${pronoun}" when referring to the person taking the medication.`;
    return this.getCompletion(prompt);
  }

  async getSchedule(medications: Medication[], isHelper: boolean = false): Promise<string> {
    const context = isHelper ? "a helper assisting a patient" : "a patient";
    const pronoun = isHelper ? "they" : "you";
    const medicationDetails = medications.map(med =>
      `- ${med.name} (${med.dosage}, ${med.frequency}, ${med.time})`
    ).join("\n");

    const prompt = `
# Daily Medication Schedule

## Current Medications
${medicationDetails}

## Schedule Overview
[Provide a clear, organized schedule showing when each medication should be taken]

## Important Notes
[Include any special instructions about timing, food interactions, or other considerations]

## Tips for Success
[Provide practical advice for maintaining the schedule]

Please provide a clear, easy-to-follow schedule using markdown formatting. Use "${pronoun}" when referring to the person taking the medication.`;
    return this.getCompletion(prompt);
  }

  async getGeneralMedicalInfo(question: string, isHelper: boolean = false): Promise<string> {
    const context = isHelper ? "a helper assisting a patient" : "a patient";
    const pronoun = isHelper ? "they" : "you";
    const prompt = `
You are a helpful medical assistant providing information to ${context}.

Question: ${question}

Please provide clear, accurate information in a conversational but professional tone. Use markdown formatting for better readability. Use "${pronoun}" when referring to the person in question.`;
    return this.getCompletion(prompt);
  }

  async answerGeneralQuestion(question: string, isHelper: boolean = false): Promise<string> {
    const context = isHelper ? "a helper assisting a patient" : "a patient";
    const pronoun = isHelper ? "they" : "you";
    const prompt = `
You are a helpful medical assistant providing information to ${context}.

Question: ${question}

Please provide a helpful, accurate response in a conversational but professional tone. Use markdown formatting for better readability. Use "${pronoun}" when referring to the person in question.`;
    return this.getCompletion(prompt);
  }

  async getAllMedicationsInfo(medications: Medication[], question: string, isHelper: boolean = false): Promise<string> {
    const context = isHelper ? "a helper assisting a patient" : "a patient";
    const pronoun = isHelper ? "they" : "you";
    const medicationDetails = medications.map(med =>
      `- ${med.name} (${med.dosage}, ${med.frequency})`
    ).join("\n");

    const prompt = `
# Comprehensive Medication Overview

## Current Medications
${medicationDetails}

## Question
${question}

## Response
[Provide a comprehensive answer to the question, considering all medications]

## Important Notes
[Include any special considerations or warnings]

Please provide clear, detailed information using markdown formatting. Use "${pronoun}" when referring to the person taking the medication.`;
    return this.getCompletion(prompt);
  }
}
