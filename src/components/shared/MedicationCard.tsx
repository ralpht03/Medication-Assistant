import { Check, Clock, X, Bell } from "lucide-react";
import { useRef, useState } from "react";
import axios from "axios"; // Import axios

interface MedicationCardProps {
  medication: {
    id: string | number;
    name: string;
    dosage: string;
    time: string;
    status: "taken" | "missed" | "upcoming";
    instructions?: string;
  };
  showActions?: boolean;
  onTake?: () => void;
  onSnooze?: () => void;
}

const statusConfig = {
  taken: { icon: Check, className: "bg-green-100 text-green-800", text: "Taken" },
  missed: { icon: X, className: "bg-red-100 text-red-800", text: "Missed" },
  upcoming: { icon: Clock, className: "bg-yellow-100 text-yellow-800", text: "Upcoming" }
};

const MedicationCard = ({ medication, showActions = false, onTake, onSnooze }: MedicationCardProps) => {
  const StatusIcon = statusConfig[medication.status].icon;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Function to start camera
  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (error) {
        console.error("Camera access denied", error);
      }
    }
  };

  // Function to capture an image from the video feed
  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg"); // Convert frame to base64
  };

  // Function to verify pill before marking as taken
  const verifyAndTakeMedication = async () => {
    setIsProcessing(true);
    setMessage("Processing...");

    const image = captureImage();
    if (!image) {
      setMessage("Error capturing image.");
      setIsProcessing(false);
      return;
    }

    try {
      const response = await axios.post("/api/pill-recognition", { image });
      const { pill_name, confidence } = response.data;

      if (confidence > 0.75 && pill_name.toLowerCase().includes(medication.name.toLowerCase())) {
        setMessage(`Pill recognized as ${pill_name}. Confidence: ${(confidence * 100).toFixed(2)}%.`);
        if (onTake) onTake(); // Mark medication as taken
      } else {
        setMessage(`Pill does not match. Detected: ${pill_name} (Confidence: ${(confidence * 100).toFixed(2)}%)`);
      }
    } catch (error) {
      console.error("Error identifying pill:", error);
      setMessage("Error verifying medication.");
    }

    setIsProcessing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium">{medication.name}</h3>
          <span className={`px-2 py-1 text-sm rounded ${statusConfig[medication.status].className}`}>
            <StatusIcon className="w-4 h-4 inline-block mr-1" />
            {statusConfig[medication.status].text}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-600">{medication.dosage}</p>
      <p className="text-sm text-gray-600">Scheduled Time: {medication.time}</p>

      {showActions && (
        <div className="mt-4 flex space-x-2">
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Open Camera
          </button>
          <button
            onClick={verifyAndTakeMedication}
            className={`px-4 py-2 text-white rounded ${
              isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={isProcessing}
          >
            {isProcessing ? "Verifying..." : "Take Now"}
          </button>
          {onSnooze && (
            <button onClick={onSnooze} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
              Snooze
            </button>
          )}
        </div>
      )}

      {/* Camera Video & Canvas */}
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Message Display */}
      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
    </div>
  );
};

export default MedicationCard;
