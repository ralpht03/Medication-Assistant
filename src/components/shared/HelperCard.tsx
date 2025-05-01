import React from 'react';

interface Helper {
  id: string;
  name: string;
  profilePictureUrl?: string; // Optional profile picture
  expertise?: string; // Optional expertise or role description
}

interface HelperCardProps {
  helper: Helper;
  onInvite: () => void; // Action triggered when clicking the invite button
}

const HelperCard: React.FC<HelperCardProps> = ({ helper, onInvite }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      {/* Header: Profile Picture and Helper Name */}
      <div className="flex items-center space-x-3">
        <div className="w-16 h-16">
          <img
            src={helper.profilePictureUrl || '/default-avatar.png'}
            alt={`${helper.name}'s profile`}
            className="rounded-full object-cover w-full h-full"
          />
        </div>
        <div>
          <h3 className="text-lg font-medium">{helper.name}</h3>
          {helper.expertise && <p className="text-sm text-gray-500">{helper.expertise}</p>}
        </div>
      </div>

      {/* Invite Button */}
      <div className="mt-4">
        <button
          onClick={onInvite}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
        >
          Invite
        </button>
      </div>
    </div>
  );
};

export default HelperCard;