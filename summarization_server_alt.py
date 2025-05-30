import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the summarization model
MODEL_NAME = "distilbart-cnn-12-6"  # Smaller model than bart-large-cnn
MAX_LENGTH = 150
MIN_LENGTH = 30

logger.info(f"Loading model: {MODEL_NAME}")

summarizer = None

try:
    # Import transformers here to avoid errors if not installed
    from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
    
    # Load model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained(f"sshleifer/{MODEL_NAME}")
    model = AutoModelForSeq2SeqLM.from_pretrained(f"sshleifer/{MODEL_NAME}")
    summarizer = pipeline("summarization", model=model, tokenizer=tokenizer)
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Error loading model: {str(e)}")
    summarizer = None

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "model": MODEL_NAME})

@app.route('/api/generate-summary', methods=['POST'])
def generate_summary():
    """Generate a summary from conversation data"""
    try:
        data = request.json
        logger.info(f"Received request with {len(data.get('conversation', []))} messages")
        
        if not data or 'conversation' not in data:
            return jsonify({"error": "No conversation data provided"}), 400
        
        conversation = data['conversation']
        
        if not conversation or len(conversation) == 0:
            return jsonify({"error": "Empty conversation"}), 400
        
        # Format the conversation into a single text
        formatted_text = format_conversation(conversation)
        logger.info(f"Formatted text length: {len(formatted_text)}")
        
        # Generate summary
        if summarizer:
            try:
                # Truncate input if it's too long
                max_input_length = 1024  # Adjust based on model's capabilities
                if len(formatted_text) > max_input_length:
                    logger.warning(f"Input text too long ({len(formatted_text)} chars), truncating to {max_input_length}")
                    formatted_text = formatted_text[:max_input_length]
                
                summary = summarize_text(formatted_text)
                logger.info(f"Summary generated: {len(summary)} chars")
                return jsonify({"summary": summary})
            except Exception as e:
                logger.error(f"Error during summarization: {str(e)}")
                # Fall back to extractive summarization
                summary = extractive_summarization(formatted_text)
                return jsonify({"summary": summary, "method": "extractive_fallback"})
        else:
            # If model failed to load, use extractive summarization
            logger.warning("Model not available, using extractive summarization")
            summary = extractive_summarization(formatted_text)
            return jsonify({"summary": summary, "method": "extractive"})
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500

def format_conversation(conversation):
    """Format the conversation data into a single text"""
    formatted_lines = []
    
    for msg in conversation:
        role = msg.get('role', '')
        content = msg.get('content', '')
        
        if not content:
            # Try alternative field names
            content = msg.get('message', '')
        
        if role and content:
            formatted_lines.append(f"{role.capitalize()}: {content}")
    
    return "\n\n".join(formatted_lines)

def summarize_text(text):
    """Generate a summary using the transformer model"""
    try:
        result = summarizer(text, max_length=MAX_LENGTH, min_length=MIN_LENGTH, do_sample=False)
        return result[0]['summary_text']
    except Exception as e:
        logger.error(f"Error in summarize_text: {str(e)}")
        return extractive_summarization(text)

def extractive_summarization(text, num_sentences=5):
    """Simple extractive summarization as a fallback"""
    import nltk
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')
    
    from nltk.tokenize import sent_tokenize
    from nltk.corpus import stopwords
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords')
    
    from collections import defaultdict
    
    # Tokenize the text into sentences
    sentences = sent_tokenize(text)
    
    # If there are fewer sentences than requested, return all of them
    if len(sentences) <= num_sentences:
        return " ".join(sentences)
    
    # Simple frequency-based summarization
    stop_words = set(stopwords.words('english') + stopwords.words('french'))
    word_frequencies = defaultdict(int)
    
    # Count word frequencies
    for sentence in sentences:
        for word in nltk.word_tokenize(sentence.lower()):
            if word not in stop_words and word.isalnum():
                word_frequencies[word] += 1
    
    # Normalize frequencies
    max_frequency = max(word_frequencies.values()) if word_frequencies else 1
    for word in word_frequencies:
        word_frequencies[word] = word_frequencies[word] / max_frequency
    
    # Score sentences
    sentence_scores = defaultdict(int)
    for i, sentence in enumerate(sentences):
        for word in nltk.word_tokenize(sentence.lower()):
            if word in word_frequencies:
                sentence_scores[i] += word_frequencies[word]
    
    # Get top sentences
    top_sentences = sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True)[:num_sentences]
    top_sentences = sorted(top_sentences, key=lambda x: x[0])  # Sort by original position
    
    # Combine sentences
    summary = " ".join([sentences[i] for i, _ in top_sentences])
    return summary

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Return the last 100 log entries"""
    return jsonify({"message": "Log endpoint not implemented"})

@app.route('/api/messages', methods=['GET'])
def get_messages():
    """Return the last 100 messages"""
    return jsonify({"message": "Messages endpoint not implemented"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Using port 5000 to avoid conflicts
    app.run(host='0.0.0.0', port=port, debug=True)
