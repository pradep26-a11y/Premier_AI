import faiss
import numpy as np
import pickle
import os
from google import genai
from dotenv import load_dotenv
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load Config
load_dotenv()
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

EMBED_MODEL = "text-embedding-004"
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
INDEX_FILE = os.path.join(DATA_DIR, "faiss_index.bin")
CHUNKS_FILE = os.path.join(DATA_DIR, "chunks.pkl")

class KnowledgeBase:
    def __init__(self):
        self.dimension = 768 # Google text-embedding-004 default
        self.client = None
        if GOOGLE_API_KEY and GOOGLE_API_KEY != "your_google_api_key_here":
            try:
                self.client = genai.Client(api_key=GOOGLE_API_KEY)
            except Exception as e:
                print(f"Failed to initialize Gemini Client: {e}")
        
        if os.path.exists(INDEX_FILE) and os.path.exists(CHUNKS_FILE):
            self.index = faiss.read_index(INDEX_FILE)
            with open(CHUNKS_FILE, "rb") as f:
                self.chunks = pickle.load(f)
        else:
            self.index = faiss.IndexFlatL2(self.dimension)
            self.chunks = []
        
        self.is_processing = False
        self.status_message = "Idle"

    def get_embedding(self, text: str) -> np.ndarray:
        if not self.client:
            print("Gemini API Client not initialized. Please check your GOOGLE_API_KEY.")
            return np.zeros(self.dimension, dtype='float32')
            
        try:
            result = self.client.models.embed_content(
                model=EMBED_MODEL,
                contents=text
            )
            embedding = result.embeddings[0].values
            return np.array(embedding, dtype='float32')
        except Exception as e:
            print(f"Cloud Embedding error: {e}")
            return np.zeros(self.dimension, dtype='float32')

    def add_texts(self, texts: list):
        if not texts: return
        embeddings = []
        for t in texts:
            t = t.strip()
            if t:
                emb = self.get_embedding(t)
                embeddings.append(emb)
        
        if not embeddings: return
        vectors = np.vstack(embeddings)
        self.index.add(vectors)
        self.chunks.extend(texts)
        self.save()

    def search(self, query: str, top_k: int = 3) -> list:
        if self.index.ntotal == 0:
            return []
            
        q_emb = self.get_embedding(query)
        q_vec = np.expand_dims(q_emb, axis=0)
        distances, indices = self.index.search(q_vec, min(top_k, self.index.ntotal))
        
        results = []
        for i in indices[0]:
            if i != -1 and i < len(self.chunks):
                results.append(self.chunks[i])
        return results

    def save(self):
        faiss.write_index(self.index, INDEX_FILE)
        with open(CHUNKS_FILE, "wb") as f:
            pickle.dump(self.chunks, f)

kb = KnowledgeBase()
