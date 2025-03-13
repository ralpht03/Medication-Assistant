"use client"

import { useState, useEffect, FormEvent, useRef } from 'react'
import { Send, Mic, MicOff } from 'lucide-react'

// Add type declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface QuestionInputProps {
  onSubmit: (question: string) => void
  isLoading: boolean
}

export default function QuestionInput({ onSubmit, isLoading }: QuestionInputProps) {
  const [question, setQuestion] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if browser supports speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result) => result.transcript)
            .join('');
          
          setQuestion(transcript);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          if (isListening) {
            // Restart if it ends while we're still supposed to be listening
            recognitionRef.current.start();
          }
        };
      }
    }
    
    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isLoading) return

    // Stop listening if active
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    onSubmit(question.trim())
    setQuestion('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask your question here..."
        className="w-full min-h-[100px] p-4 pr-24 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        disabled={isLoading}
      />
      
      {/* Speech recognition button */}
      {speechSupported && (
        <button
          type="button"
          onClick={toggleListening}
          disabled={isLoading}
          className={`absolute right-14 bottom-3 p-2 rounded-full transition-colors
            ${isListening
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
          title={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      )}
      
      {/* Submit button */}
      <button
        type="submit"
        disabled={!question.trim() || isLoading}
        className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors
          ${
            question.trim() && !isLoading
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-400'
          }
        `}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </form>
  )
}