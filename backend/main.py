from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import os
import shutil
import base64
from io import BytesIO
from PIL import Image
import logging

from knowledge_base import kb
from pdf_processor import extract_chunks_from_pdf
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load Environment Variables
load_dotenv()
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

app = FastAPI(title="Premier Academy Encyclopedia - Pure Cloud")

# Initialize Gemini Client
client = None
if GOOGLE_API_KEY and GOOGLE_API_KEY != "your_google_api_key_here":
    try:
        client = genai.Client(api_key=GOOGLE_API_KEY)
        print("Pure Cloud Mode: Google Gemini Enabled.")
    except Exception as e:
        print(f"Gemini Initialization failed: {e}. System will not function without API Key.")
else:
    print("WARNING: No Google API Key found. System operating in degraded mode.")

# Setup CORS - In production, restrict this to servicebloggers.com
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update to specific domain for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    mode: str = "fast"  # "fast" or "planning"
    image: str | None = None   # Base64 string
    model: str = "gemini-1.5-flash"
    system_prompt: str = "You are the Premier Academy Encyclopedia agent, a brilliant, highly capable educational AI. Always provide well-structured, clear, and comprehensive answers based ONLY on the context provided. If no context answers the question, try your best to answer from general knowledge but mention you didn't find it in the textbook."

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini Engine not configured.")
        
    try:
        # Planning mode: Increase context depth
        top_k = 3 if req.mode == "fast" else 8
        
        # Perform Search
        relevant_chunks = kb.search(req.message, top_k=top_k)
        context_block = "\n\n".join(relevant_chunks)
        
        system_instructions = f"{req.system_prompt}\n\n[OFFLINE ENCYCLOPEDIA CONTEXT]\n"
        if context_block:
            system_instructions += f"Use the following accurately extracted textbook context to answer the user's question:\n{context_block}\n"
        else:
            system_instructions += "No specific textbook context found. Answer from general knowledge but mention that this isn't in the textbooks yet."
        system_instructions += "\n[/OFFLINE ENCYCLOPEDIA CONTEXT]"

        if req.mode == "planning":
            system_instructions += "\n\n[MODE: PLANNING]\nPerform a deep analysis. Think step-by-step. Synthesize the context thoroughly."

            # Construct Gemini Message
        contents = []
        
        # Add Image if present
        if req.image:
            # Handle base64 image
            header, encoded = req.image.split(",", 1)
            image_data = base64.b64decode(encoded)
            img = Image.open(BytesIO(image_data))
            contents.append(img)
            
        # Add Text Prompt
        contents.append(req.message)

        # Generate Response
        response = client.models.generate_content(
            model=req.model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instructions,
                temperature=0.3,
                max_output_tokens=2048
            )
        )
        
        return {
            "response": response.text,
            "engine": f"Gemini Cloud ({'1.5 Flash' if 'flash' in req.model else '1.5 Pro'})",
            "speed": "Turbo (Cloud)"
        }
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config")
async def get_config():
    return {
        "is_hybrid": True,
        "engine": "Cloud (Gemini)" if client else "Error: Key Missing"
    }

def process_pdf_background(temp_path: str, filename: str):
    try:
        kb.is_processing = True
        kb.status_message = f"Analyzing {filename}..."
        chunks = extract_chunks_from_pdf(temp_path)
        
        kb.status_message = f"Generating Cloud Memory for {len(chunks)} sections..."
        kb.add_texts(chunks)
        
        kb.status_message = f"Successfully integrated {filename}."
    except Exception as e:
        kb.status_message = f"Error: {str(e)}"
    finally:
        kb.is_processing = False
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/ingest")
async def ingest_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF textbooks are supported.")
        
    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        background_tasks.add_task(process_pdf_background, temp_path, file.filename)
        return {"message": f"Upload successful. Indexing {file.filename} in the cloud brain."}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
async def get_status():
    return {
        "is_processing": kb.is_processing,
        "status_message": kb.status_message
    }

@app.get("/health")
async def health_check():
    """Endpoint for 24/7 monitoring services."""
    return {"status": "operational", "engine": "Gemini Cloud"}

# Mount static files
if os.path.exists("../frontend"):
    app.mount("/static", StaticFiles(directory="../frontend"), name="static")

@app.get("/", response_class=HTMLResponse)
def serve_index():
    with open("../frontend/index.html", "r", encoding="utf-8") as f:
        return f.read()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
