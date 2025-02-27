"use client"

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import QuestionInput from '@/components/shared/QuestionInput'
import EmergencyPanel from '@/components/shared/EmergencyPanel'
import { Medication } from '@/lib/types'

interface LLMResponse {
  text: string
  timestamp: Date
}

interface Conversation {
  question: string
  response: LLMResponse
}

export default function AIAssistantPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasAcknowledgedDisclaimer, setHasAcknowledgedDisclaimer] = useState(false)

  useEffect(() => {
    const loadMedications = async () => {
      try {
        // TODO: Replace with actual patient ID from auth context
        const patientId = "test-patient-1"
        const response = await fetch(`/api/medications?patientId=${patientId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch medications')
        }
        const data = await response.json()
        setMedications(data.medications)
      } catch (err) {
        console.error('Error loading medications:', err)
        setError('Failed to load medications. Please try again later.')
      }
    }

    loadMedications()
  }, [])

  const handleQuestionSubmit = async (question: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      let action: string
      let requestBody: any = {
        patientId: "test-patient-1" // TODO: Replace with actual patient ID from auth context
      }

      // Determine the action and set up the request body
      if (question.toLowerCase().includes('interaction')) {
        // For interactions, always include all medications for comprehensive analysis
        action = 'interactions'
      } else if (question.toLowerCase().includes('schedule')) {
        // For schedule questions, use all medications
        action = 'schedule'
      } else if (question.toLowerCase().includes('how should i take') || 
                 question.toLowerCase().includes('dosage info')) {
        if (selectedMedication) {
          action = 'info'
          requestBody.medication = selectedMedication
        } else {
          // If no medication is selected for dosage info, get schedule for all medications
          action = 'schedule'
        }
      } else if (selectedMedication) {
        if (question.toLowerCase().includes('side effect')) {
          action = 'sideEffects'
          requestBody.medication = selectedMedication
        } else if (question.toLowerCase().includes('miss') || question.toLowerCase().includes('missed')) {
          action = 'missedDose'
          requestBody.medication = selectedMedication
        } else if (question.toLowerCase().includes('emergency')) {
          action = 'emergency'
          requestBody.medication = selectedMedication
          requestBody.question = question
        } else {
          action = 'info'
          requestBody.medication = selectedMedication
        }
      } else {
        setError('Please select a medication first or ask about interactions/schedule.')
        setIsLoading(false)
        return
      }

      requestBody.action = action

      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from AI')
      }

      const data = await response.json()
      const aiResponse = data.info || data.effects || data.interactions || 
                        data.guidance || data.response || data.schedule

      setConversations(prev => [...prev, {
        question,
        response: {
          text: aiResponse,
          timestamp: new Date()
        }
      }])
    } catch (error) {
      console.error('Error getting LLM response:', error)
      setError('Failed to get response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    {
      label: "Side Effects",
      question: "What are the common side effects of my medications?"
    },
    {
      label: "Dosage Info",
      question: "How should I take my medications?"
    },
    {
      label: "Missed Dose",
      question: "What should I do if I miss a dose?"
    },
    {
      label: "Drug Interactions",
      question: "Are there any potential drug interactions I should be aware of?"
    }
  ]

  if (!hasAcknowledgedDisclaimer) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Important Medical Disclaimer</h2>
          <div className="prose prose-sm">
            <p className="text-red-600 font-semibold mb-4">
              Please read this disclaimer carefully before using the AI Assistant.
            </p>
            <div className="space-y-4 text-gray-700">
              <p>
                The AI Assistant is provided for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
              </p>
              <p>
                Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or medication.
              </p>
              <p>
                Never disregard professional medical advice or delay in seeking it because of something you have read or learned from this AI Assistant.
              </p>
              <p>
                The information provided by this AI Assistant:
              </p>
              <ul className="list-disc pl-5">
                <li>Is not medical advice</li>
                <li>Should not be used in medical emergencies</li>
                <li>May not be completely accurate or up-to-date</li>
                <li>Should always be verified with your healthcare provider</li>
              </ul>
              <p>
                In case of a medical emergency, immediately call your doctor or emergency services.
              </p>
              <p className="font-semibold">
                By clicking "I Understand and Agree" below, you acknowledge that you have read, understood, and agree to these terms and limitations of the AI Assistant.
              </p>
            </div>
          </div>
          <button
            onClick={() => setHasAcknowledgedDisclaimer(true)}
            className="mt-6 w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            I Understand and Agree
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex h-screen pt-16">
        <div className="w-64 flex-shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Main content area */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">AI Assistant</h1>

                {/* Medication Selection */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3">Select Medication</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {medications.map((med) => (
                      <button
                        key={med.rowKey}
                        onClick={() => setSelectedMedication(med)}
                        className={`px-4 py-2 rounded-lg shadow-sm transition-colors ${
                          selectedMedication?.rowKey === med.rowKey
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {med.name}
                      </button>
                    ))}
                  </div>
                  {selectedMedication && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="font-medium text-blue-900">Selected: {selectedMedication.name}</p>
                      <p className="text-sm text-blue-700">Dosage: {selectedMedication.dosage}</p>
                      <p className="text-sm text-blue-700">Frequency: {selectedMedication.frequency}</p>
                      {selectedMedication.instructions && (
                        <p className="text-sm text-blue-700">Instructions: {selectedMedication.instructions}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3">Quick Questions</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionSubmit(action.question)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                {/* Question Input */}
                <div className="mb-6">
                  <QuestionInput
                    onSubmit={handleQuestionSubmit}
                    isLoading={isLoading}
                  />
                </div>

                {/* Conversation History */}
                <div className="space-y-6">
                  {conversations.map((conv, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm p-4">
                      <div className="mb-4">
                        <p className="font-medium text-gray-900">You asked:</p>
                        <p className="mt-1 text-gray-600">{conv.question}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Response:</p>
                        <div className="mt-1 text-gray-600 prose prose-sm max-w-none">
                          <ReactMarkdown>{conv.response.text}</ReactMarkdown>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          {conv.response.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Emergency Information Sidebar */}
            <div className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
              <EmergencyPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}