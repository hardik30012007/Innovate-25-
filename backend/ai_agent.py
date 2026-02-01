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

ZONE MAPPING (Landmarks/Names to IDs):
- zone_0: Dwarka Sector 10 Park
- zone_1: Rohini Japanese Park
- zone_2: Sanjay Van South
- zone_3: Hauz Khas Lake Ext
- zone_4: Lodhi Garden Zone
- zone_5: Okhla Bird Sanctuary
- zone_6: Yamuna Biodiversity Park
- zone_7: Nehru Park Chanakyapuri
- zone_8: Deer Park Safdarjung
- zone_9: Buddha Jayanti Park
- zone_10: Indraprastha Park
- zone_11: Millennium Park
- zone_12: Swarn Jayanti Park
- zone_13: District Park Janakpuri
- zone_14: Talkatora Garden
- zone_15: Mughal Gardens
- zone_16: Sunder Nursery
- zone_17: National Rose Garden
- zone_18: Garden of Five Senses
- zone_19: Mehrauli Archaeological Park

CONTEXT:
- There are specific zones named above.
- If a user mentions a place like "Okhla Bird Sanctuary", use its ID (zone_5).
- "Work Done" means Completed.
- "High Priority" usually means high score.

EXAMPLES:
User: "Show me Okhla Bird Sanctuary"
Response: { "reply": "Taking you to Okhla Bird Sanctuary (Zone 5).", "action": "PAN_TO_ZONE", "params": { "id": "zone_5" } }

User: "Show me zone 10"
Response: { "reply": "Taking you to Zone 10 (Indraprastha Park).", "action": "PAN_TO_ZONE", "params": { "id": "zone_10" } }

User: "Upvote Garden of Five Senses"
Response: { "reply": "Certainly! Upvoting Garden of Five Senses (Zone 18).", "action": "UPVOTE_ZONE", "params": { "id": "zone_18" } }
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
