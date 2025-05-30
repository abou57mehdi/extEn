import requests
import json
import sys

def test_health():
    """Test the health endpoint"""
    try:
        response = requests.get('http://localhost:5000/api/health')
        print(f"Health check status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing health endpoint: {str(e)}")
        return False

def test_summarization():
    """Test the summarization endpoint"""
    test_data = {
        "conversation": [
            {"role": "user", "content": "What is artificial intelligence?"},
            {"role": "assistant", "content": "Artificial Intelligence (AI) refers to the simulation of human intelligence in machines that are programmed to think like humans and mimic their actions. The term may also be applied to any machine that exhibits traits associated with a human mind such as learning and problem-solving. The ideal characteristic of artificial intelligence is its ability to rationalize and take actions that have the best chance of achieving a specific goal."},
            {"role": "user", "content": "Can you give me some examples of AI applications?"},
            {"role": "assistant", "content": "Sure! Here are some common AI applications: 1) Virtual assistants like Siri, Alexa, and Google Assistant, 2) Recommendation systems used by Netflix, Amazon, and Spotify, 3) Autonomous vehicles and self-driving cars, 4) Image and facial recognition systems, 5) Natural language processing for translation and text analysis, 6) Medical diagnosis and healthcare applications, 7) Fraud detection in banking and finance, 8) Smart home devices and IoT applications, 9) Predictive maintenance in manufacturing, and 10) Gaming AI that can play chess, Go, and other complex games."}
        ]
    }

    try:
        print("Testing summarization endpoint...")
        response = requests.post(
            'http://localhost:5000/api/generate-summary',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )

        print(f"Summarization status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("\nSummary:")
            print(result.get('summary', 'No summary generated'))
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Error testing summarization endpoint: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing summarization server...")

    if not test_health():
        print("Health check failed. Make sure the server is running.")
        sys.exit(1)

    if not test_summarization():
        print("Summarization test failed.")
        sys.exit(1)

    print("\nAll tests passed successfully!")
