import cv2
import numpy as np
import base64
import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Azure Custom Vision Configuration
AZURE_CUSTOM_VISION_ENDPOINT = os.getenv("AZURE_CUSTOM_VISION_ENDPOINT")
AZURE_CUSTOM_VISION_PREDICTION_KEY = os.getenv("AZURE_CUSTOM_VISION_PREDICTION_KEY")
AZURE_CUSTOM_VISION_PROJECT_ID = os.getenv("AZURE_CUSTOM_VISION_PROJECT_ID")
PREDICTION_URL = f"{AZURE_CUSTOM_VISION_ENDPOINT}/customvision/v3.0/Prediction/{AZURE_CUSTOM_VISION_PROJECT_ID}/classify/iterations/Iteration1/image"

@app.route('/api/process_pill', methods=['POST'])
def process_pill():
    try:
        data = request.json
        image_data = data['image']

        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(",")[1])
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Save the image for sending to Azure Custom Vision
        image_path = "pill_image.jpg"
        cv2.imwrite(image_path, frame)

        # Send image to Azure Custom Vision API
        with open(image_path, "rb") as image_file:
            headers = {
                "Prediction-Key": AZURE_CUSTOM_VISION_PREDICTION_KEY,
                "Content-Type": "application/octet-stream"
            }
            response = requests.post(PREDICTION_URL, headers=headers, data=image_file)

        # Process response
        if response.status_code == 200:
            predictions = response.json().get("predictions", [])
            if predictions:
                best_match = max(predictions, key=lambda x: x["probability"])
                pill_name = best_match["tagName"]
                confidence = best_match["probability"]
                return jsonify({"pill_name": pill_name, "confidence": confidence})
            else:
                return jsonify({"error": "No predictions returned."}), 400
        else:
            return jsonify({"error": "Azure Custom Vision API request failed."}), response.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
