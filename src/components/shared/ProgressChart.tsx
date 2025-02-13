import { useState } from 'react'

interface ProgressChartProps {
  data: {
    percentage: number
    streak: number
    history: {
      date: string
      taken: number
      total: number
    }[]
  }
  period: 'weekly' | 'monthly'
  onPeriodChange?: (period: 'weekly' | 'monthly') => void
}

const ProgressChart = ({ data, period, onPeriodChange }: ProgressChartProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  const handlePeriodChange = (newPeriod: 'weekly' | 'monthly') => {
    setSelectedPeriod(newPeriod)
    onPeriodChange?.(newPeriod)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Medication Adherence</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => handlePeriodChange('weekly')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedPeriod === 'weekly'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => handlePeriodChange('monthly')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedPeriod === 'monthly'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl font-bold text-blue-600">{data.percentage}%</div>
        <div className="text-sm text-gray-500">
          Current streak: <span className="font-medium text-gray-900">{data.streak} days</span>
        </div>
      </div>

      <div className="relative pt-1">
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
          <div
            style={{ width: `${data.percentage}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
          />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {data.history.map((day, index) => (
          <div key={day.date} className="flex items-center justify-between">
            <div className="text-sm text-gray-500">{day.date}</div>
            <div className="flex items-center">
              <div className="text-sm font-medium text-gray-900">
                {day.taken}/{day.total}
              </div>
              <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(day.taken / day.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProgressChart