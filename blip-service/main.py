"""
Image Captioning Service using Microsoft GIT

GIT (Generative Image-to-text Transformer) is the industry standard for
high-quality image captioning. It outperforms BLIP in most benchmarks.

Usage:
    pip install -r requirements.txt
    python main.py

The service will be available at http://localhost:8100

Model: microsoft/git-large-coco (~1.7GB)
- State-of-the-art image captioning
- No repetition issues
- Clean, accurate descriptions
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoProcessor, AutoModelForCausalLM
from PIL import Image
import requests
from io import BytesIO
import torch
import time

app = FastAPI(title="Image Captioning Service", version="2.0.0")

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variables
processor = None
model = None
device = None
MODEL_NAME = "microsoft/git-large-coco"


def load_model():
    """Load GIT model at startup"""
    global processor, model, device

    print(f"Loading {MODEL_NAME}...")
    start = time.time()

    processor = AutoProcessor.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)

    # Use GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)

    elapsed = time.time() - start
    print(f"Model loaded on {device} in {elapsed:.2f}s")


@app.on_event("startup")
async def startup_event():
    load_model()


class CaptionRequest(BaseModel):
    url: str


class CaptionResponse(BaseModel):
    caption: str
    processing_time_ms: int


class BatchRequest(BaseModel):
    images: list[dict]  # [{ url, productName, ... }]


class BatchResponse(BaseModel):
    images: list[dict]
    total_time_ms: int


def generate_caption(image: Image.Image) -> str:
    """Generate caption for a PIL Image using GIT"""
    pixel_values = processor(images=image, return_tensors="pt").pixel_values.to(device)

    generated_ids = model.generate(
        pixel_values=pixel_values,
        max_length=50,
    )

    caption = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return caption


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "device": device,
        "model": MODEL_NAME
    }


@app.post("/caption", response_model=CaptionResponse)
async def caption_single(request: CaptionRequest):
    """Generate caption for a single image URL"""
    try:
        start = time.time()

        # Download image
        response = requests.get(request.url, timeout=30)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content)).convert('RGB')

        # Generate caption
        caption = generate_caption(image)

        elapsed_ms = int((time.time() - start) * 1000)

        return CaptionResponse(caption=caption, processing_time_ms=elapsed_ms)

    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/caption-batch", response_model=BatchResponse)
async def caption_batch(request: BatchRequest):
    """Generate captions for multiple images"""
    try:
        start = time.time()
        results = []

        for i, img_data in enumerate(request.images):
            url = img_data.get("url")

            try:
                # Download image
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                image = Image.open(BytesIO(response.content)).convert('RGB')

                # Generate caption
                caption = generate_caption(image)

                results.append({
                    **img_data,
                    "caption": caption
                })

                print(f"[{i+1}/{len(request.images)}] {img_data.get('productName', 'unknown')}: {caption}")

            except Exception as e:
                print(f"[{i+1}/{len(request.images)}] Error: {str(e)}")
                # Fallback to product description or name
                results.append({
                    **img_data,
                    "caption": img_data.get("productDescription") or img_data.get("productName") or "unknown",
                    "error": str(e)
                })

        total_ms = int((time.time() - start) * 1000)

        return BatchResponse(images=results, total_time_ms=total_ms)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
