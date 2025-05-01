import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Medications } from '@/lib/types';
import CameraModal from '@/components/CameraModal';

export type MedicationStatus = 'taken' | 'missed' | 'upcoming';

interface MedicationCardProps {
  medication: Medications & {
    status: MedicationStatus;
    time: string;
    id?: string; // Add optional id property
  };
  showActions?: boolean;
  onTake?: () => void;
  onSnooze?: () => void;
}

const MedicationCard = ({ medication, showActions = false, onTake, onSnooze }: MedicationCardProps) => {
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  // Function to show alert
  const showAlert = (message: string) => {
    setAlert(message);
    setTimeout(() => setAlert(null), 5000); // Hide after 5 seconds
  };

  // Function to handle "Take Now" button click
  const handleTakeNow = () => {
    console.log('Opening camera modal with medication:', {
      RowKey: medication.RowKey,
      id: medication.id,
      name: medication.name
    });
    setShowCameraModal(true);
  };
  
  // Function to handle modal close
  const handleModalClose = () => {
    setShowCameraModal(false);
  };
  
  // Function to handle successful medication taking
  const handleMedicationTaken = async (data: {
    medicationId: string;
    patientId: string;
    pillCount: string;
    recommendedPillCount: string;
    status: 'taken' | 'missed' | 'skipped';
    notes?: string;
    bypassVerification?: boolean;
  }) => {
    try {
      console.log('handleMedicationTaken received data:', data);
      
      // Get user info from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) throw new Error('User not found');
      const user = JSON.parse(userStr);

      // Format the current date properly
      const now = new Date();
      const timestamp = now.toISOString();
      const formattedDate = now.toLocaleString();

      // Make API call to record the verification
      console.log('Sending verification data:', {
        ...data,
        medicationId: data.medicationId,
        patientName: `${user.firstName} ${user.lastName}`,
        verifiedBy: "self",
        timestamp: timestamp,
        formattedDate: formattedDate
      });

      const response = await fetch('/api/adherence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          medicationId: data.medicationId,
          patientName: `${user.firstName} ${user.lastName}`,
          verifiedBy: "self",
          timestamp: timestamp,
          formattedDate: formattedDate
        }),
      });

      const responseData = await response.json();
      console.log('API Response:', responseData);

      if (!response.ok) {
        throw new Error(`Failed to record medication verification: ${responseData.error || 'Unknown error'}`);
      }

      // Call onTake callback after successful API call
      if (onTake) onTake();
      setShowCameraModal(false);
    } catch (error) {
      console.error('Error recording medication verification:', error);
      showAlert('Failed to record medication verification. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium">{medication.name}</h3>
        </div>
      </div>
      <p className="text-sm text-gray-600">{medication.dosage}</p>
      <p className="text-sm text-gray-600">Scheduled Time: {medication.time}</p>
      <p className="text-sm text-gray-600">Recommended Dose: {medication.recommendedPillCount || 1} pill(s)</p>

      {showActions && (
        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleTakeNow}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Take Now
          </button>
          {onSnooze && (
            <button onClick={onSnooze} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
              Snooze
            </button>
          )}
        </div>
      )}
      
      {/* Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={handleModalClose}
        medication={{
          RowKey: (medication.RowKey || medication.id || '') as string,
          name: medication.name,
          recommendedPillCount: medication.recommendedPillCount,
          patientId: medication.patientId 
        }}
        onVerificationComplete={(data) => {
          if (!medication.RowKey && !medication.id) {
            showAlert('Invalid medication ID. Please try again.');
            return;
          }
          handleMedicationTaken(data);
        }}
      />
      
      {/* Alert Message */}
      {alert && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md max-w-md z-50">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            <p>{alert}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationCard;
