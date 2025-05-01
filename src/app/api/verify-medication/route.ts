import { NextResponse } from "next/server";
import { PredictionAPIClient } from "@azure/cognitiveservices-customvision-prediction";
import { ApiKeyCredentials } from "@azure/ms-rest-js";
import { VerificationLogs, Alerts } from '@/lib/types';
import { AzureTableService } from '@/lib/azure/table-service';


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

export async function POST(request: Request) {
  // Format the endpoint correctly
  const endpoint = process.env.CUSTOM_VISION_ENDPOINT?.replace(/\/+$/, ''); // Remove trailing slashes

  const predictionClient = new PredictionAPIClient(
    new ApiKeyCredentials({
      inHeader: {
        "Prediction-key": process.env.CUSTOM_VISION_KEY // Note: case sensitive!
      }
    }),
    endpoint
  );
  // The endpoint from your Azure Custom Vision
  const PREDICTION_ENDPOINT = process.env.CUSTOM_VISION_ENDPOINT;
  const PREDICTION_KEY = process.env.CUSTOM_VISION_KEY;

  try {
    const requestData = await request.json();
    const { image, medicationId, patientId } = requestData;

    console.log('Starting medication verification:', {
      medicationId,
      patientId,
      imageSize: image.length
    });

    if (!image || !patientId) {
      throw new Error('Missing required fields: image or patientId');
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
    console.log('Raw prediction results:', {
      predictionsCount: results?.predictions?.length || 0,
      allPredictions: results?.predictions?.map(p => ({
        tagName: p.tagName,
        probability: (p.probability * 100).toFixed(2) + '%'
      }))
    });

    // Process predictions with null check
    const predictions = results?.predictions || [];
    
    // Get the highest probability prediction
    const topPrediction = predictions.length > 0 
      ? predictions.reduce((prev, current) => 
          (current.probability > prev.probability) ? current : prev
        )
      : null;

    if (!topPrediction) {
      console.log('No valid predictions found in response');
      return NextResponse.json({
        verified: false,
        pill_name: 'unknown',
        confidence: 0,
        message: 'No pill detected in image. Please ensure the pill is centered and well-lit.'
      }, { status: 200 });
    }

    // Simple identification (Pill Identification page)
    if (!medicationId || medicationId === 'identification-only') {
      const simpleResult = {
        verified: true,
        pill_name: topPrediction.tagName,
        confidence: topPrediction.probability,
        message: `Successfully identified as ${topPrediction.tagName}`
      };
      console.log('Simple identification result:', simpleResult);
      return NextResponse.json(simpleResult);
    }

    // Full verification (from Take Now flow)
    try {
      const medicationsService = new AzureTableService('Medications');
      const medicationEntity = await medicationsService.getEntity(patientId, medicationId);
      if (!medicationEntity) {
        console.log('Medication not found:', { patientId, medicationId });
        return NextResponse.json({
          verified: false,
          pill_name: 'unknown',
          confidence: 0,
          message: 'Medication not found in database'
        }, { status: 200 });
      }

      const medication = {
        name: medicationEntity.name as string,
        dosage: medicationEntity.dosage as string
      };

      const result = {
        verified: topPrediction.probability > 0.75,
        pill_name: topPrediction.tagName,
        confidence: topPrediction.probability,
        message: topPrediction.probability > 0.75
          ? `Successfully identified as ${topPrediction.tagName}`
          : 'Low confidence detection. Please try again with better lighting',
        medication: medication
      };

      // Only create alert if the detected pill doesn't match the expected medication
      if (result.pill_name !== medication.name) {
        const alertsService = new AzureTableService('Alerts');
        const timestamp = new Date().toISOString();
        
        const alert: Alerts = {
          PartitionKey: patientId,
          RowKey: `pill_identification_failed-${timestamp}`,
          Timestamp: timestamp,
          type: 'pill_identification_failed',
          message: `Wrong pill detected. Expected: ${medication.name}, Detected: ${result.pill_name}. Please verify you are taking the correct medication.`,
          priority: 'high',
          medicationId: medicationId,
          patientId: patientId,
          read: false,
          adminAck: false,
          patientAck: false,
          helperAck: false
        };
        
        await alertsService.createEntity(alert);
      }
      
      // Create alert if pill identification was skipped
      if (requestData.bypassVerification) {
        const alertsService = new AzureTableService('Alerts');
        const timestamp = new Date().toISOString();
        
        const alert: Alerts = {
          PartitionKey: patientId,
          RowKey: `pill_identification_skipped-${timestamp}`,
          Timestamp: timestamp,
          type: 'pill_identification_skipped',
          message: `Pill identification was skipped for ${medication.name}. Please ensure you are taking the correct medication.`,
          priority: 'high',
          medicationId: medicationId,
          patientId: patientId,
          read: false,
          adminAck: false,
          patientAck: false,
          helperAck: false
        };
        
        await alertsService.createEntity(alert);
      }
      
      console.log('Full verification result:', result);
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in full verification:', error);
      return NextResponse.json({
        verified: false,
        pill_name: 'unknown',
        confidence: 0,
        message: 'Error verifying medication against database'
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Verification process error:', error);
    return NextResponse.json({
      verified: false,
      pill_name: 'unknown',
      confidence: 0,
      message: error instanceof Error ? error.message : "Failed to verify medication"
    } as VerificationResult, { status: 200 });
  }
}
