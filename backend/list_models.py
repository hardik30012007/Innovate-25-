import google.generativeai as genai
import os

GEMINI_API_KEY = "AIzaSyCCMD3shnUEL1BF0P8jGm84j7n8VyjpPQA"
genai.configure(api_key=GEMINI_API_KEY)

print("Listing models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
