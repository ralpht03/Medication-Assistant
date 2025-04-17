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

// The endpoint from your Azure Custom Vision
const PREDICTION_ENDPOINT = process.env.CUSTOM_VISION_ENDPOINT;
const PREDICTION_KEY = process.env.CUSTOM_VISION_KEY;

export async function POST(request: Request) {
  try {
    console.log('Verify medication API called');
    const requestData = await request.json();
    const { image, medicationId, patientId } = requestData;
    
    console.log('Verify medication request:', {
      medicationId,
      patientId,
      imageSize: image ? image.length : 0
    });
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image.split(',')[1], 'base64');
    console.log('Image buffer size:', imageBuffer.length);

    // Make the prediction request using fetch
    console.log('Making prediction request to:', process.env.CUSTOM_VISION_ENDPOINT);
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

    const results = await response.json();
    console.log('Prediction API response:', results);

    // Process predictions
    const predictions = results.predictions || [];
    const topPrediction = predictions[0];

    // If no predictions were found
    if (!topPrediction) {
      console.log('No predictions found');
      return NextResponse.json({
        verified: false,
        pill_name: 'unknown',
        confidence: 0,
        message: 'No pill detected in image. Please ensure the pill is centered and well-lit.'
      }, { status: 200 }); // Return 200 as this is a valid response
    }

    const result = {
      verified: topPrediction.probability > 0.75,
      pill_name: topPrediction.tagName,
      confidence: topPrediction.probability,
      message: topPrediction.probability > 0.75
        ? `Successfully identified as ${topPrediction.tagName}`
        : 'Low confidence detection. Please try again with better lighting'
    };
    
    console.log('Verification result:', result);

    // Get medication information
    const medicationsService = new AzureTableService('Medications');
    const medicationEntity = await medicationsService.getEntity(patientId, medicationId);
    const medication = {
      name: medicationEntity.name as string,
      dosage: medicationEntity.dosage as string
    };

    // Log verification attempt
    const timestamp = new Date().toISOString();
    const verificationLog: VerificationLogs = {
      PartitionKey: patientId,
      RowKey: timestamp,
      Timestamp: timestamp,
      medicationName: medication.name,
      medicationId: medicationId,
      pillCount: requestData.pillCount || 1,
      recommendedCount: parseInt(medication.dosage, 10),
      timeTaken: timestamp,
      status: result.verified ? 'taken' : 'missed',
      notes: result.message || '',
      verificationMethod: 'camera',
      isCorrectDose: (requestData.pillCount || 1) === parseInt(medication.dosage, 10)
    };

    // Store verification log in Azure
    const tableService = new AzureTableService('VerificationLogs');
    await tableService.createEntity(verificationLog);
    console.log('Verification log saved successfully');

    return NextResponse.json(result);
  } catch (error) {
    console.error("Pill verification error:", error);
    const errorResult = {
      error: error instanceof Error ? error.message : "Failed to verify medication",
      message: "Unable to process image. Please try again.",
      verified: false,
      pill_name: 'unknown',
      confidence: 0
    };
    console.log('Returning error response:', errorResult);
    
    return NextResponse.json(
      errorResult,
      { status: 200 } // Return 200 even for processing errors
    );
  }
}
