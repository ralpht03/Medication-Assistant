import { NextResponse } from "next/server";
import { PredictionAPIClient } from "@azure/cognitiveservices-customvision-prediction";
import { ApiKeyCredentials } from "@azure/ms-rest-js";
import { VerificationLogs } from '@/lib/types';
import { AzureTableService } from '@/lib/azure/table-service';

// Validate and log environment variables in development
if (process.env.NODE_ENV === 'development') {
  console.log('Custom Vision Configuration:', {
    hasKey: !!process.env.CUSTOM_VISION_KEY,
    hasEndpoint: !!process.env.CUSTOM_VISION_ENDPOINT,
    endpoint: process.env.CUSTOM_VISION_ENDPOINT,
    projectId: process.env.CUSTOM_VISION_PROJECT_ID,
    iterationName: process.env.CUSTOM_VISION_ITERATION_NAME
  });
}

// Validate environment variables
if (!process.env.CUSTOM_VISION_ENDPOINT || !process.env.CUSTOM_VISION_KEY) {
  throw new Error('Missing required environment variables for Custom Vision');
}

// Format the endpoint correctly
const endpoint = process.env.CUSTOM_VISION_ENDPOINT?.replace(/\/+$/, ''); // Remove trailing slashes

// Log the exact configuration being used
console.log('Custom Vision Configuration:', {
  keyLength: process.env.CUSTOM_VISION_KEY?.length,
  endpoint,
  projectId: process.env.CUSTOM_VISION_PROJECT_ID,
  iterationName: process.env.CUSTOM_VISION_ITERATION_NAME
});

const predictionClient = new PredictionAPIClient(
  new ApiKeyCredentials({
    inHeader: {
      "Prediction-key": process.env.CUSTOM_VISION_KEY // Note: case sensitive!
    }
  }),
  endpoint
);

interface Prediction {
  probability: number;
  tagName: string;
}

interface PredictionResponse {
  predictions: Array<{
    probability: number;
    tagName: string;
    tagId: string;
  }>;
}

interface VerificationResult {
  verified: boolean;
  pill_name: string;
  confidence: number;
  message: string;
  medication?: {
    name: string;
    dosage: string;
  };
}

// The endpoint from your Azure Custom Vision
const PREDICTION_ENDPOINT = process.env.CUSTOM_VISION_ENDPOINT;
const PREDICTION_KEY = process.env.CUSTOM_VISION_KEY;

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { image, medicationId, patientId } = requestData;

    if (!image || !medicationId || !patientId) {
      throw new Error('Missing required fields: image, medicationId, or patientId');
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image.split(',')[1], 'base64');

    // Make the prediction request
    const response = await fetch(process.env.CUSTOM_VISION_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Prediction-Key': process.env.CUSTOM_VISION_KEY!,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prediction API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Prediction API error: ${response.status} ${response.statusText}`);
    }

    const results = await response.json() as PredictionResponse;

    // Process predictions with null check
    const predictions = results?.predictions || [];
    
    // Get the highest probability prediction
    const topPrediction = predictions.length > 0 
      ? predictions.reduce((prev, current) => 
          (current.probability > prev.probability) ? current : prev
        )
      : null;

    if (!topPrediction) {
      return NextResponse.json({
        verified: false,
        pill_name: 'unknown',
        confidence: 0,
        message: 'No pill detected in image. Please try again.'
      } as VerificationResult, { status: 200 });
    }

    // Verify against medication database
    try {
      const medicationsService = new AzureTableService('Medications');
      const medicationEntity = await medicationsService.getEntity(patientId, medicationId);
      
      if (!medicationEntity) {
        throw new Error('Medication not found in database');
      }

      const result: VerificationResult = {
        verified: topPrediction.probability > 0.75,
        pill_name: topPrediction.tagName,
        confidence: topPrediction.probability,
        message: topPrediction.probability > 0.75
          ? `Successfully identified as ${topPrediction.tagName}`
          : 'Low confidence detection. Please try again with better lighting',
        medication: {
          name: medicationEntity.name as string,
          dosage: medicationEntity.dosage as string
        }
      };

      return NextResponse.json(result);
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to verify medication against database');
    }
  } catch (error) {
    console.error("Pill verification error:", error);
    
    return NextResponse.json({
      verified: false,
      pill_name: 'unknown',
      confidence: 0,
      message: error instanceof Error ? error.message : "Failed to verify medication"
    } as VerificationResult, { status: 200 });
  }
}
