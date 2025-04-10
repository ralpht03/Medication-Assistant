"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '@/components/PageLayout'
import { AlertCircle, PillIcon, Clock, AlertTriangle, X } from 'lucide-react'

export default function TestAlertsPage() {
  const [patientId, setPatientId] = useState('patient123')
  const [medicationId, setMedicationId] = useState('med-one-a-day-women')
  const [medicationName, setMedicationName] = useState('One_A_Day_Women')
  const [pillCount, setPillCount] = useState(1)
  const [recommendedCount, setRecommendedCount] = useState(1)
  const [alertType, setAlertType] = useState('overdose')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleGenerateAlert = async () => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      let endpoint = '';
      let payload = {};

      switch (alertType) {
        case 'overdose':
        case 'underdose':
          endpoint = '/api/adherence';
          payload = {
            medicationId,
            patientId,
            status: 'taken',
            pillCount: alertType === 'overdose' ? recommendedCount + 1 : recommendedCount - 1,
            recommendedCount,
            notes: `Test ${alertType} alert`
          };
          break;
        
        case 'missed_dose':
          endpoint = '/api/alerts?action=check-missed-doses';
          // This is a GET endpoint, so no payload needed
          break;
        
        case 'verification_bypassed':
          endpoint = '/api/adherence';
          payload = {
            medicationId,
            patientId,
            status: 'taken',
            pillCount: recommendedCount,
            recommendedCount,
            bypassVerification: true,
            notes: 'Test verification bypass alert'
          };
          break;
        
        case 'pill_identification_failed':
          endpoint = '/api/verify-medication';
          payload = {
            medicationId,
            patientId,
            verified: false,
            status: 'failed',
            notes: 'Test pill identification failed alert'
          };
          break;
      }

      if (alertType === 'missed_dose') {
        const response = await fetch(endpoint);
        const data = await response.json();
        setResult(data);
      } else {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        setResult(data);
      }
    } catch (error) {
      console.error('Error generating alert:', error);
      setError('Failed to generate alert. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdose':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'underdose':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'missed_dose':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'verification_bypassed':
        return <PillIcon className="h-5 w-5 text-blue-500" />;
      case 'pill_identification_failed':
        return <X className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <PageLayout userType="admin" title="Test Alerts">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Test Alert Generation</h1>
        <p className="mt-1 text-gray-600">
          Use this page to generate test alerts for different scenarios
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Alert Parameters</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Type
                </label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="overdose">Overdose</option>
                  <option value="underdose">Underdose</option>
                  <option value="missed_dose">Missed Dose</option>
                  <option value="verification_bypassed">Verification Bypassed</option>
                  <option value="pill_identification_failed">Pill Identification Failed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g., patient123"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication ID
                </label>
                <input
                  type="text"
                  value={medicationId}
                  onChange={(e) => setMedicationId(e.target.value)}
                  placeholder="e.g., med123"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="e.g., Lisinopril 10mg"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {(alertType === 'overdose' || alertType === 'underdose') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recommended Pill Count
                    </label>
                    <input
                      type="number"
                      value={recommendedCount}
                      onChange={(e) => setRecommendedCount(parseInt(e.target.value))}
                      min={1}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Pill Count
                    </label>
                    <input
                      type="number"
                      value={alertType === 'overdose' ? recommendedCount + 1 : recommendedCount - 1}
                      readOnly
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {alertType === 'overdose' 
                        ? 'For overdose, actual count is automatically set to 1 more than recommended' 
                        : 'For underdose, actual count is automatically set to 1 less than recommended'}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleGenerateAlert}
                disabled={loading || !patientId || !medicationId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Alert'}
              </button>
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-4">Alert Preview</h2>
            
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getAlertIcon(alertType)}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {alertType === 'overdose' && `You took ${recommendedCount + 1} pills instead of the recommended ${recommendedCount} for ${medicationName || 'your medication'}. This is an overdose.`}
                    {alertType === 'underdose' && `You took ${recommendedCount - 1} pills instead of the recommended ${recommendedCount} for ${medicationName || 'your medication'}. This is less than prescribed.`}
                    {alertType === 'missed_dose' && `You missed your scheduled dose of ${medicationName || 'your medication'} at 08:00.`}
                    {alertType === 'verification_bypassed' && `You bypassed verification for ${medicationName || 'your medication'}. Please ensure you're taking the correct medication.`}
                    {alertType === 'pill_identification_failed' && `Pill identification failed for ${medicationName || 'your medication'}. The pill you scanned doesn't match your prescribed medication.`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p>{error}</p>
                </div>
              </div>
            )}
            
            {result && (
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2">API Response:</h3>
                <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto max-h-60">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="mt-6">
              <p className="text-sm text-gray-600">
                After generating an alert, go to the{' '}
                <button 
                  onClick={() => router.push('/patient/alerts')}
                  className="text-blue-600 hover:underline"
                >
                  Patient Alerts
                </button>
                {' '}or{' '}
                <button 
                  onClick={() => router.push('/admin/alerts')}
                  className="text-blue-600 hover:underline"
                >
                  Admin Alerts
                </button>
                {' '}page to see it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}