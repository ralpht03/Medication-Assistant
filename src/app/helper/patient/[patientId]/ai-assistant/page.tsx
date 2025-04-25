"use client"

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import QuestionInput from '@/components/shared/QuestionInput'
import PageLayout from '@/components/PageLayout'
import { Medication } from '@/lib/types'
import { useParams } from 'next/navigation'

interface LLMResponse {
  text: string
  timestamp: Date
}

interface Conversation {
  question: string
  response: LLMResponse
}

export default function HelperAIAssistantPage() {
  const { patientId } = useParams()
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
        if (!patientId) {
          setError('Patient ID not found');
          return;
        }

        console.log('Loading medications for patient ID:', patientId);
        const response = await fetch(`/api/medications?patientId=${patientId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch medications');
        }
        
        const data = await response.json();
        console.log('Medications loaded:', data.medications);
        if (!data.medications || data.medications.length === 0) {
          setError('No medications found for this patient');
        }
        // Ensure each medication has a unique id
        const medicationsWithIds = (data.medications || []).map((med: any, index: number) => ({
          ...med,
          id: med.id || med.medicationId || med._id || `med-${index}` // Fallback to index-based ID if no other ID exists
        }));
        console.log('Processed medications:', medicationsWithIds);
        setMedications(medicationsWithIds);
      } catch (err) {
        console.error('Error loading medications:', err);
        setError('Failed to load medications. Please try again later.');
      }
    };

    loadMedications();
  }, [patientId]);

  const handleMedicationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    console.log('Selected medication ID:', selectedId);
    const med = medications.find(m => m.id === selectedId);
    console.log('Found medication:', med);
    setSelectedMedication(med || null);
  };

  const handleQuestionSubmit = async (question: string) => {
    if (isLoading) {
      return; // Prevent multiple requests while one is in progress
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!patientId) {
        setError('Patient ID not found');
        setIsLoading(false);
        return;
      }

      // Check if this is a medication-specific question and no medication is selected
      const isMedicationSpecific = question.toLowerCase().includes('this medication') ||
                                 question.toLowerCase().includes('side effect') ||
                                 question.toLowerCase().includes('dosage') ||
                                 question.toLowerCase().includes('interaction') ||
                                 question.toLowerCase().includes('miss') ||
                                 question.toLowerCase().includes('emergency');

      if (isMedicationSpecific && !selectedMedication) {
        setError('Please select a medication first');
        setIsLoading(false);
        return;
      }

      let action: string;
      let requestBody: any = {
        patientId: patientId,
        helperContext: true // Add helper context flag
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
        action = 'generalInfo';
        requestBody.question = question;
      } else if (question.toLowerCase().includes('interaction')) {
        action = 'interactions';
        requestBody.medications = medications;
        requestBody.checkAllMedications = true;
      } else if (question.toLowerCase().includes('schedule')) {
        action = 'schedule';
        requestBody.medications = medications;
      } else if (question.toLowerCase().includes('all medication') ||
                 question.toLowerCase().includes('patient\'s medication')) {
        action = 'allMedications';
        requestBody.medications = medications;
        requestBody.question = question;
      } else if (question.toLowerCase().includes('how should they take') ||
                 question.toLowerCase().includes('dosage info')) {
        if (selectedMedication) {
          action = 'info';
          requestBody.medication = selectedMedication;
        } else {
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
        action = 'generalQuestion';
        requestBody.question = question;
      }

      requestBody.action = action;

      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Instead of throwing an error, provide a fallback response
        const fallbackResponses: Record<string, string> = {
          'interactions': 'I apologize, but I\'m having trouble checking medication interactions right now. Please consult with a healthcare provider for this information.',
          'sideEffects': 'I apologize, but I\'m having trouble retrieving side effects information right now. Please check the medication label or consult with a healthcare provider.',
          'schedule': 'I apologize, but I\'m having trouble generating a medication schedule right now. Please refer to the prescribed dosage instructions.',
          'info': 'I apologize, but I\'m having trouble retrieving medication information right now. Please check the medication label or consult with a healthcare provider.',
          'missedDose': 'I apologize, but I\'m having trouble providing guidance for missed doses right now. Please refer to the medication label or contact a healthcare provider.',
          'emergency': 'I apologize, but I\'m having trouble providing emergency guidance right now. In case of emergency, please contact emergency services or a healthcare provider immediately.',
          'generalInfo': 'I apologize, but I\'m having trouble providing medical information right now. Please consult with a healthcare provider for accurate information.',
          'allMedications': 'I apologize, but I\'m having trouble retrieving medication information right now. Please check the patient\'s medication list or consult with a healthcare provider.',
          'generalQuestion': 'I apologize, but I\'m having trouble processing your question right now. Please try again later or consult with a healthcare provider.'
        };

        const fallbackResponse = fallbackResponses[action] || 'I apologize, but I\'m having trouble processing your request right now. Please try again later or consult with a healthcare provider.';

        setConversations(prev => [...prev, {
          question,
          response: {
            text: fallbackResponse,
            timestamp: new Date()
          }
        }]);
        return;
      }

      const data = await response.json();
      const aiResponse = data.info || data.effects || data.interactions ||
                        data.guidance || data.response || data.schedule;

      setConversations(prev => [...prev, {
        question,
        response: {
          text: aiResponse,
          timestamp: new Date()
        }
      }]);
    } catch (error) {
      console.error('Error getting LLM response:', error);
      // Provide a generic fallback response instead of showing an error
      setConversations(prev => [...prev, {
        question,
        response: {
          text: 'I apologize, but I\'m having trouble processing your request right now. Please try again later or consult with a healthcare provider.',
          timestamp: new Date()
        }
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      label: "Side Effects",
      question: "What are the side effects of this medication?"
    },
    {
      label: "Dosage Instructions",
      question: "How should they take this medication?"
    },
    {
      label: "Interactions",
      question: "Are there any interactions with their other medications?"
    },
    {
      label: "Missed Dose",
      question: "What should they do if they miss a dose?"
    },
    {
      label: "Emergency",
      question: "What should they do in case of an emergency with this medication?"
    }
  ];

  if (!hasAcknowledgedDisclaimer) {
    return (
      <PageLayout userType="helper" title="AI Assistant">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">AI Assistant Disclaimer</h2>
          <p className="mb-4">
            This AI assistant is designed to help you understand your patient's medications and provide general medical information. However, please note:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>The AI's responses are for informational purposes only</li>
            <li>Always verify information with healthcare professionals</li>
            <li>Do not use AI responses as a substitute for professional medical advice</li>
            <li>Report any concerning information to the patient's healthcare provider</li>
          </ul>
          <button
            onClick={() => setHasAcknowledgedDisclaimer(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            I Understand
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout userType="helper" title="AI Assistant">
      <div className="flex flex-col h-full">
        {/* Back Button */}
        <div className="mb-4">
          <a
            href={`/helper/patient/${patientId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Patient Dashboard
          </a>
        </div>

        {/* Medication Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Medication (Optional)
          </label>
          <select
            value={selectedMedication?.id || ''}
            onChange={handleMedicationChange}
            className="w-full p-2 border rounded-md"
            disabled={isLoading}
          >
            <option key="all-medications" value="">All Medications</option>
            {medications.map((med, index) => (
              <option key={`medication-${med.id || index}`} value={med.id}>
                {med.name} - {med.dosage}
              </option>
            ))}
          </select>
          {medications.length === 0 && (
            <p className="text-sm text-red-500 mt-2">
              No medications available for this patient
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuestionSubmit(action.question)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedMedication && !isLoading
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!selectedMedication || isLoading}
              >
                {action.label}
              </button>
            ))}
          </div>
          {!selectedMedication && (
            <p className="text-sm text-gray-500 mt-2">
              Please select a medication to use quick actions
            </p>
          )}
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-lg shadow-md p-4">
          {conversations.map((conv) => (
            <div key={`${conv.question}-${conv.response.timestamp.getTime()}`} className="mb-4">
              <div className="text-right mb-2">
                <p className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
                  {conv.question}
                </p>
              </div>
              <div className="text-left">
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                  <ReactMarkdown>{conv.response.text}</ReactMarkdown>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(conv.response.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          )}
          {error && (
            <div className="text-center text-red-500 py-4">
              {error}
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>

        {/* Question Input */}
        <div className="mt-auto">
          <QuestionInput onSubmit={handleQuestionSubmit} disabled={isLoading} />
        </div>
      </div>
    </PageLayout>
  );
} 