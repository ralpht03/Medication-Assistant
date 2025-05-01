import { useState } from 'react'

interface ProgressChartProps {
  data?: {
    percentage: number;
    streak: number;
    total: number;
    taken: number;
    missed: number;
    incorrect?: number;
  };
  loading?: boolean;
}

export default function ProgressChart({ data, loading = false }: ProgressChartProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // If no data, show empty state
  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-12">
          <p className="text-gray-500">No adherence data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Medication Adherence
      </h3>

      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl font-bold text-blue-600">{data.percentage}%</div>
        <div className="text-sm text-gray-500">
          Current streak: <span className="font-medium text-gray-900">{data.streak} days</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Total medications</span>
            <span className="font-medium text-gray-900">{data.total}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-blue-600 rounded-full"
              style={{ width: `${data.percentage}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">Taken Correctly</div>
            <div className="text-lg font-semibold text-green-600">
              {data.taken}
            </div>
          </div>
          {data.incorrect !== undefined && (
            <div>
              <div className="text-sm text-gray-500 mb-1">Incorrect Dose</div>
              <div className="text-lg font-semibold text-yellow-600">
                {data.incorrect}
              </div>
            </div>
          )}
          <div>
            <div className="text-sm text-gray-500 mb-1">Missed</div>
            <div className="text-lg font-semibold text-red-600">
              {data.missed}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}