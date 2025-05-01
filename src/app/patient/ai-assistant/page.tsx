"use client"

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import QuestionInput from '@/components/shared/QuestionInput'
import PageLayout from '@/components/PageLayout'
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
  const conversationEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when conversations change
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations]);

  useEffect(() => {
    const loadMedications = async () => {
      try {
        // Get the user from localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          setError('User not found. Please log in again.');
          return;
        }

        const user = JSON.parse(userStr);
        // Try all possible ID fields
        const patientId = user.id || user.rowKey || user.RowKey;
        
        if (!patientId) {
          console.error('Patient ID not found in user data:', user);
          setError('User ID not found. Please log in again.');
          return;
        }

        console.log('Loading medications for patient ID:', patientId);
        const response = await fetch(`/api/medications?patientId=${patientId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch medications');
        }
        
        const data = await response.json();
        console.log('Medications loaded:', data.medications);
        setMedications(data.medications || []);
      } catch (err) {
        console.error('Error loading medications:', err);
        setError('Failed to load medications. Please try again later.');
      }
    };

    loadMedications();
  }, []);

  const handleQuestionSubmit = async (question: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the user from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setError('User not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      const user = JSON.parse(userStr);
      // Try all possible ID fields
      const patientId = user.id || user.rowKey || user.RowKey;
      
      if (!patientId) {
        console.error('Patient ID not found in user data:', user);
        setError('User ID not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      let action: string;
      let requestBody: any = {
        patientId: patientId
      };

      // Check if this is a general medical question (not medication-specific)
      const isGeneralMedicalQuestion =
        question.toLowerCase().includes('what is') ||
        question.toLowerCase().includes('how does') ||
        question.toLowerCase().includes('can you explain') ||
        question.toLowerCase().includes('tell me about') ||
        question.toLowerCase().includes('information on');

      // Determine the action and set up the request body
      if (isGeneralMedicalQuestion) {
        // Handle general medical questions without requiring medication selection
        action = 'generalInfo';
        requestBody.question = question;
      } else if (question.toLowerCase().includes('interaction')) {
        // For interactions, always include ALL medications for comprehensive analysis
        // regardless of whether a specific medication is selected
        action = 'interactions';
        requestBody.medications = medications;
        
        // Add a note to the request to emphasize checking all medications
        requestBody.checkAllMedications = true;
      } else if (question.toLowerCase().includes('schedule')) {
        // For schedule questions, use all medications
        action = 'schedule';
        requestBody.medications = medications;
      } else if (question.toLowerCase().includes('all medication') ||
                 question.toLowerCase().includes('my medication')) {
        // Questions about all medications
        action = 'allMedications';
        requestBody.medications = medications;
        requestBody.question = question;
      } else if (question.toLowerCase().includes('how should i take') ||
                 question.toLowerCase().includes('dosage info')) {
        if (selectedMedication) {
          action = 'info';
          requestBody.medication = selectedMedication;
        } else {
          // If no medication is selected for dosage info, get schedule for all medications
          action = 'schedule';
          requestBody.medications = medications;
        }
      } else if (selectedMedication) {
        if (question.toLowerCase().includes('side effect')) {
          action = 'sideEffects';
          requestBody.medication = selectedMedication;
        } else if (question.toLowerCase().includes('miss') || question.toLowerCase().includes('missed')) {
          action = 'missedDose';
          requestBody.medication = selectedMedication;
        } else if (question.toLowerCase().includes('emergency')) {
          action = 'emergency';
          requestBody.medication = selectedMedication;
          requestBody.question = question;
        } else {
          action = 'info';
          requestBody.medication = selectedMedication;
        }
      } else {
        // For any other question without a selected medication, treat it as a general question
        action = 'generalQuestion';
        requestBody.question = question;
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
      question: "Are there any potential drug interactions I should be aware of?",
      note: "Checks all medications"
    }
  ]

  return (
    <PageLayout userType="patient" title="AI Assistant">
      {/* Modal Disclaimer */}
      {!hasAcknowledgedDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-white/30">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-6 m-4">
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
      )}

      {/* Main Chat Interface */}
      <div className="flex flex-col h-full w-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50 w-full">
          {/* Top Controls: Medication Selection and Quick Actions */}
          <div className="p-4 bg-white border-b border-gray-200 w-full">
            <div className="flex flex-wrap gap-4 w-full">
              {/* Medication Selection */}
              <div className="flex-1 min-w-[300px]">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Select Medication</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {medications.map((med) => (
                    <button
                      key={med.rowKey}
                      onClick={() => {
                        // Toggle selection - if already selected, unselect it
                        if (selectedMedication?.rowKey === med.rowKey) {
                          setSelectedMedication(null);
                        } else {
                          setSelectedMedication(med);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg shadow-sm transition-colors text-sm ${
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
                  <div className="mt-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-sm">
                      <p className="font-medium text-blue-900">Selected: {selectedMedication.name}</p>
                      <p className="text-blue-700">Dosage: {selectedMedication.dosage}</p>
                      <p className="text-blue-700">Frequency: {selectedMedication.frequency}</p>
                      {selectedMedication.instructions && (
                        <p className="text-blue-700">Instructions: {selectedMedication.instructions}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedMedication(null)}
                      className="mt-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex-1 min-w-[300px]">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Quick Questions</h2>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuestionSubmit(action.question)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
                    >
                      <div>
                        {action.label}
                        {action.note && (
                          <div className="text-xs text-blue-600 mt-1">
                            ({action.note})
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg m-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Chat Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4 w-full"
            id="conversation-container"
            style={{ scrollBehavior: 'smooth' }}
          >
            {/* Welcome Message */}
            {conversations.length === 0 && (
              <div className="text-center py-10 w-full">
                <div className="bg-white rounded-lg shadow-sm p-6 w-full">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Welcome to AI Assistant</h3>
                  <p className="text-gray-600 mb-4">
                    Ask me anything about your medications, side effects, or general medical questions.
                  </p>
                  <p className="text-gray-500 text-sm">
                    {selectedMedication
                      ? `Currently selected: ${selectedMedication.name}`
                      : "Select a medication from above or ask a general question to get started."}
                  </p>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {conversations.map((conv, index) => (
              <div key={index} className="flex flex-col w-full">
                {/* User Question */}
                <div className="flex justify-end mb-2">
                  <div className="bg-blue-500 text-white rounded-lg rounded-tr-none py-2 px-4 max-w-[80%]">
                    <p>{conv.question}</p>
                  </div>
                </div>
                
                {/* AI Response */}
                <div className="flex justify-start mb-4">
                  <div className="bg-white rounded-lg rounded-tl-none py-3 px-4 shadow-sm max-w-[80%]">
                    <div className="prose prose-sm text-gray-700 overflow-y-auto max-h-[300px]">
                      <ReactMarkdown>{conv.response.text}</ReactMarkdown>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      {conv.response.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Invisible element to scroll to */}
            <div ref={conversationEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <QuestionInput
              onSubmit={handleQuestionSubmit}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}