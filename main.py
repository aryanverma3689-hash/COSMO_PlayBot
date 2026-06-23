from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import os

from langchain_mistralai import ChatMistralAI
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage, messages_to_dict, messages_from_dict

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

model = ChatMistralAI(model="mistral-small-2506", temperature=0.9)

class ChatRequest(BaseModel):
    message: str
    mode: int

# Global state for simplicity in this demo
global_messages = []
current_mode = None

HISTORY_FILE = "chat_history.json"

def save_history():
    global global_messages, current_mode
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            data = {
                "mode": current_mode,
                "messages": messages_to_dict(global_messages)
            }
            json.dump(data, f)
    except Exception as e:
        print(f"Error saving history: {e}")

def load_history():
    global global_messages, current_mode
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                current_mode = data.get("mode")
                msgs = data.get("messages", [])
                global_messages = messages_from_dict(msgs)
        except Exception as e:
            print(f"Error loading history: {e}")

# Load history on startup
load_history()

def get_system_message(mode: int) -> str:
    if mode == 1:
        return "You are an angry AI agent. You respond aggressively and impatiently."
    elif mode == 2:
        return "You are a very funny AI agent. You respond with humor and jokes."
    elif mode == 3:
        return "You are a very sad AI agent. You respond in a depressed and emotional tone."
    else:
        return "You are a highly professional, intelligent, and articulate AI assistant. Provide concise and highly accurate responses."

@app.post("/chat")
async def chat(req: ChatRequest):
    global global_messages, current_mode
    
    # Reset conversation if mode changes or if uninitialized
    if current_mode != req.mode or len(global_messages) == 0:
        current_mode = req.mode
        system_content = get_system_message(req.mode)
        global_messages = [SystemMessage(content=system_content)]
        
    global_messages.append(HumanMessage(content=req.message))
    
    try:
        response = model.invoke(global_messages)
        global_messages.append(AIMessage(content=response.content))
        save_history()
        return {"reply": response.content}
    except Exception as e:
        # In case of API errors, remove the last user message so they can try again
        global_messages.pop()
        return {"reply": f"Error: {str(e)}", "error": True}

@app.post("/reset")
async def reset():
    global global_messages, current_mode
    global_messages = []
    current_mode = None
    save_history()
    return {"status": "reset"}

@app.get("/history")
async def get_history():
    global global_messages, current_mode
    return {
        "mode": current_mode if current_mode is not None else 0,
        "messages": messages_to_dict(global_messages)
    }

@app.get("/", response_class=HTMLResponse)
async def get_root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()
