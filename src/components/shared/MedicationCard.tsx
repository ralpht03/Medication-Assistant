import { Check, Clock, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Medications } from '@/lib/types';
import CameraModal from '@/components/CameraModal';

export type MedicationStatus = 'taken' | 'missed' | 'upcoming';

const statusConfig: Record<MedicationStatus, {
  icon: any; // Or proper Lucide icon type
  className: string;
  text: string;
}> = {
  taken: { icon: Check, className: "bg-green-100 text-green-800", text: "Taken" },
  missed: { icon: X, className: "bg-red-100 text-red-800", text: "Missed" },
  upcoming: { icon: Clock, className: "bg-yellow-100 text-yellow-800", text: "Upcoming" }
};

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
  const StatusIcon = statusConfig[medication.status].icon;
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  // Function to show alert
  const showAlert = (message: string) => {
    setAlert(message);
    setTimeout(() => setAlert(null), 5000); // Hide after 5 seconds
  };

  // Function to handle "Take Now" button click
  const handleTakeNow = () => {
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
      // Make API call to record the verification
      const response = await fetch('/api/adherence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to record medication verification');
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
          <span className={`px-2 py-1 text-sm rounded ${statusConfig[medication.status].className}`}>
            <StatusIcon className="w-4 h-4 inline-block mr-1" />
            {statusConfig[medication.status].text}
          </span>
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
          id: medication.id || medication.RowKey, // Use id if available, fallback to RowKey
          name: medication.name,
          recommendedPillCount: medication.recommendedPillCount,
          patientId: medication.patientId 
        }}
        onVerificationComplete={handleMedicationTaken}
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
