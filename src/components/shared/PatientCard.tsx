import React from 'react';

interface Patient {
  id: string;
  name: string;
  profilePictureUrl?: string; // Optional profile picture
  adherencePercentage: number; // Adherence data
}

interface PatientCardProps {
  patient: Patient;
  onClick: () => void; // Action triggered when clicking the card
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick }) => {
  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header: Profile Picture and Patient Name */}
      <div className="flex items-center space-x-3">
        <div className="w-16 h-16">
          <img
            src={patient.profilePictureUrl || '/default-avatar.png'}
            alt={`${patient.name}'s profile`}
            className="rounded-full object-cover w-full h-full"
          />
        </div>
        <div>
          <h3 className="text-lg font-medium">{patient.name}</h3>
          <p className="text-sm text-gray-500">Adherence: {patient.adherencePercentage}%</p>
        </div>
      </div>
    </div>
  );
};

export default PatientCard;