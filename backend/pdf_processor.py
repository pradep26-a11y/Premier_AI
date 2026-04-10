from pypdf import PdfReader
import re

def extract_chunks_from_pdf(file_path: str, chunk_size: int = 500) -> list:
    """Extract text from a PDF file using pypdf and split it into logical chunks."""
    reader = PdfReader(file_path)
    full_text = []
    
    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text.append(text)
            
    # Combine texts and perform basic cleanup
    cleaned = " ".join(full_text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Simple word-based chunking
    words = cleaned.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)

    return chunks
