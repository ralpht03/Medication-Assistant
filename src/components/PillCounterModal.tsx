"use client";

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface PillCounterModalProps {
  medicationName: string;
  recommendedCount: string;
  onConfirm: (count: string) => void;
  onCancel: () => void;
  isVisible: boolean;
}

const PillCounterModal = ({ 
  medicationName, 
  recommendedCount, 
  onConfirm, 
  onCancel, 
  isVisible 
}: PillCounterModalProps) => {
  const [pillCount, setPillCount] = useState(recommendedCount);
  
  if (!isVisible) return null;
  
  const handlePillCountChange = (increment: boolean) => {
    const currentCount = parseInt(pillCount);
    const newCount = increment ? currentCount + 1 : Math.max(1, currentCount - 1);
    setPillCount(newCount.toString());
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Confirm Medication</h2>
        <p className="mb-4">
          How many pills of <span className="font-semibold">{medicationName}</span> are you taking?
        </p>
        
        <div className="flex items-center justify-center mb-6">
          <button 
            onClick={() => handlePillCountChange(false)}
            className="p-2 bg-gray-200 rounded-l-lg"
          >
            <Minus size={20} />
          </button>
          <div className="px-6 py-2 border-t border-b text-xl font-semibold">
            {pillCount}
          </div>
          <button 
            onClick={() => handlePillCountChange(true)}
            className="p-2 bg-gray-200 rounded-r-lg"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600">
            Recommended: {recommendedCount} {recommendedCount === "1" ? 'pill' : 'pills'}
          </p>
        </div>
        
        <div className="flex justify-between">
          <button 
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(pillCount)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Ingested pill/s
          </button>
        </div>
      </div>
    </div>
  );
};

export default PillCounterModal;