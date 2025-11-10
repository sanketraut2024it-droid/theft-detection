"""
DeepFace API Server for Face Recognition
This server provides face recognition, detection, and analysis using DeepFace library
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
from PIL import Image
import numpy as np
from deepface import DeepFace
import cv2
import os
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
PORT = int(os.getenv('PYTHON_API_PORT', '5099'))
MODEL_NAME = os.getenv('DEEPFACE_MODEL', 'VGG-Face')  # Options: VGG-Face, Facenet, OpenFace, DeepFace, DeepID, ArcFace, Dlib, SFace
DETECTOR_BACKEND = os.getenv('DETECTOR_BACKEND', 'opencv')  # Options: opencv, ssd, dlib, mtcnn, retinaface, mediapipe, yunet, yolo, centerface

print(f"🚀 DeepFace API Server starting on port {PORT}")
print(f"📦 Using model: {MODEL_NAME}")
print(f"🔍 Using detector: {DETECTOR_BACKEND}")

def base64_to_image(base64_string):
    """Convert base64 string to PIL Image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        return np.array(image)
    except Exception as e:
        print(f"Error converting base64 to image: {e}")
        return None

def image_to_base64(image_array):
    """Convert numpy array image to base64 string"""
    try:
        if len(image_array.shape) == 3:
            image = Image.fromarray(image_array)
        else:
            image = Image.fromarray(image_array.astype('uint8'))
        
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG')
        img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return img_str
    except Exception as e:
        print(f"Error converting image to base64: {e}")
        return None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': MODEL_NAME,
        'detector': DETECTOR_BACKEND,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/detect', methods=['POST'])
def detect():
    """Detect faces in an image"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        image_base64 = data['image']
        img_array = base64_to_image(image_base64)
        
        if img_array is None:
            return jsonify({'success': False, 'error': 'Invalid image format'}), 400
        
        # Detect faces using DeepFace
        try:
            # Use DeepFace to detect faces
            result = DeepFace.extract_faces(
                img_path=img_array,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False
            )
            
            faces_detected = len(result) if result else 0
            
            return jsonify({
                'success': True,
                'faces_detected': faces_detected,
                'detections': result if result else []
            })
        except Exception as e:
            print(f"Face detection error: {e}")
            return jsonify({
                'success': False,
                'error': str(e),
                'faces_detected': 0
            }), 500
            
    except Exception as e:
        print(f"Error in /detect: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze facial attributes (age, gender, emotion, race)"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        image_base64 = data['image']
        img_array = base64_to_image(image_base64)
        
        if img_array is None:
            return jsonify({'success': False, 'error': 'Invalid image format'}), 400
        
        # Analyze face using DeepFace
        try:
            result = DeepFace.analyze(
                img_path=img_array,
                actions=['age', 'gender', 'emotion', 'race'],
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False,
                silent=True
            )
            
            # Handle both single dict and list of dicts
            if isinstance(result, list):
                result = result[0]
            
            return jsonify({
                'success': True,
                'analysis': {
                    'age': result.get('age', None),
                    'gender': result.get('dominant_gender', None),
                    'gender_confidence': result.get('gender', {}),
                    'emotion': result.get('dominant_emotion', None),
                    'emotion_confidence': result.get('emotion', {}),
                    'race': result.get('dominant_race', None),
                    'race_confidence': result.get('race', {}),
                    'region': result.get('region', {})
                }
            })
        except Exception as e:
            print(f"Face analysis error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
            
    except Exception as e:
        print(f"Error in /analyze: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/represent', methods=['POST'])
def represent():
    """Get face embedding/descriptor for recognition"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        image_base64 = data['image']
        img_array = base64_to_image(image_base64)
        
        if img_array is None:
            return jsonify({'success': False, 'error': 'Invalid image format'}), 400
        
        # Get face embedding using DeepFace
        try:
            result = DeepFace.represent(
                img_path=img_array,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False,
                silent=True
            )
            
            # Handle both single dict and list of dicts
            if isinstance(result, list):
                result = result[0]
            
            embedding = result.get('embedding', [])
            face_region = result.get('facial_area', {})
            
            return jsonify({
                'success': True,
                'embedding': embedding,
                'descriptor': embedding,  # Alias for compatibility
                'face_region': face_region,
                'model': MODEL_NAME
            })
        except Exception as e:
            print(f"Face representation error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
            
    except Exception as e:
        print(f"Error in /represent: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/verify', methods=['POST'])
def verify():
    """Verify if two faces belong to the same person"""
    try:
        data = request.json
        if not data or 'img1' not in data or 'img2' not in data:
            return jsonify({'success': False, 'error': 'Two images required (img1 and img2)'}), 400
        
        img1_array = base64_to_image(data['img1'])
        img2_array = base64_to_image(data['img2'])
        
        if img1_array is None or img2_array is None:
            return jsonify({'success': False, 'error': 'Invalid image format'}), 400
        
        # Verify faces using DeepFace
        try:
            result = DeepFace.verify(
                img1_path=img1_array,
                img2_path=img2_array,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False,
                silent=True
            )
            
            return jsonify({
                'success': True,
                'verified': result.get('verified', False),
                'distance': result.get('distance', None),
                'threshold': result.get('threshold', None),
                'similarity_metric': result.get('similarity_metric', None)
            })
        except Exception as e:
            print(f"Face verification error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
            
    except Exception as e:
        print(f"Error in /verify: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/find', methods=['POST'])
def find():
    """Find faces in an image and return with embeddings"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        image_base64 = data['image']
        img_array = base64_to_image(image_base64)
        
        if img_array is None:
            return jsonify({'success': False, 'error': 'Invalid image format'}), 400
        
        # Find faces and get embeddings
        try:
            # First detect faces
            faces = DeepFace.extract_faces(
                img_path=img_array,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False
            )
            
            # Get embeddings for each face
            embeddings = DeepFace.represent(
                img_path=img_array,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False,
                silent=True
            )
            
            # Analyze attributes
            analysis = DeepFace.analyze(
                img_path=img_array,
                actions=['age', 'gender'],
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False,
                silent=True
            )
            
            # Combine results
            if isinstance(embeddings, list):
                embeddings = embeddings[0]
            if isinstance(analysis, list):
                analysis = analysis[0]
            
            return jsonify({
                'success': True,
                'faces_detected': len(faces) if faces else 0,
                'embedding': embeddings.get('embedding', []),
                'descriptor': embeddings.get('embedding', []),
                'face_region': embeddings.get('facial_area', {}),
                'age': analysis.get('age', None),
                'gender': analysis.get('dominant_gender', None),
                'gender_confidence': analysis.get('gender', {}),
                'model': MODEL_NAME
            })
        except Exception as e:
            print(f"Face find error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
            
    except Exception as e:
        print(f"Error in /find: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print(f"✅ DeepFace API Server ready!")
    print(f"📡 Listening on http://0.0.0.0:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)

