import os
import google.generativeai as genai
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables. Please check your .env file.")
genai.configure(api_key=GEMINI_API_KEY)

# Generation Config
generation_config = {
    "temperature": 0.4,
    "top_p": 1,
    "top_k": 32,
    "max_output_tokens": 2048,
     "response_mime_type": "application/json",
}

model = genai.GenerativeModel(
    model_name="gemini-flash-latest", 
    generation_config=generation_config,
)

SYSTEM_PROMPT = """
You are the AI Assistant for the "Green Corridor Interventions" project. 
Your goal is to help users navigate the map, understand zones, and perform actions like upvoting.

You have control over the website via structured JSON commands.
When a user asks something, you must return a JSON object with:
1. "reply": A natural language response to the user.
2. "action": An action code (or null if just chatting).
3. "params": A dictionary of parameters for the action.

AVAILABLE ACTIONS:
- "PAN_TO_ZONE": Moves map to a specific zone. Params: { "id": "zone_X" }
- "UPVOTE_ZONE": Upvotes a specific zone. Params: { "id": "zone_X" }
- "FILTER_MAP": Filters map layers. Params: { "status": "completed" | "wip" | "suggested" | "all" }
- "SHOW_PRIORITY": Pans to the highest priority/score zone. Params: {}
- "EXPLAIN_ZONE": detailed info about a zone. Params: { "id": "zone_X" }

CONTEXT:
- There are zones numbered zone_0 to zone_21.
- "Work Done" means Completed.
- "High Priority" usually means high score.

EXAMPLES:
User: "Show me zone 10"
Response: { "reply": "Taking you to Zone 10.", "action": "PAN_TO_ZONE", "params": { "id": "zone_10" } }

User: "Upvote it" (if context implies zone 10)
Response: { "reply": "Upvoted Zone 10!", "action": "UPVOTE_ZONE", "params": { "id": "zone_10" } }

User: "Where is the best place to plant trees?"
Response: { "reply": "Based on the analysis, I'm taking you to the highest priority zone recommended for interventions.", "action": "SHOW_PRIORITY", "params": {} }

User: "Hello"
Response: { "reply": "Hi! I can help you explore green corridors. Try asking me to 'Show Zone 5' or 'Find the best zone'.", "action": null, "params": {} }
"""

def ask_gemini_agent(user_text, context_text=""):
    """
    Sends user text to Gemini and returns structured JSON command.
    """
    try:
        chat_session = model.start_chat(
            history=[
                {
                    "role": "user",
                    "parts": [SYSTEM_PROMPT]
                },
                {
                    "role": "model",
                    "parts": ["Understood. I am ready to convert natural language requests into JSON commands for the Green Corridor map."]
                }
            ]
        )
        
        # Add dynamic context if needed (e.g., "User is currently looking at Zone 5")
        full_prompt = f"{user_text}\n\n[CONTEXT STATE]: {context_text}"
        
        response = chat_session.send_message(full_prompt)
        
        # Clean response (remove markdown code blocks if present, though JSON mode usually handles it)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        return json.loads(text)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[AI AGENT ERROR] {e}")
        return {
            "reply": f"I'm having trouble connecting (Error: {str(e)}). Please check the backend terminal for details.",
            "action": None,
            "params": {}
        }

if __name__ == "__main__":
    # Test
    print(ask_gemini_agent("upvote zone 5"))
