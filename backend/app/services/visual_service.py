import os
import cv2
import pytesseract
import yt_dlp
import time
from pathlib import Path

# Path setup
BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / "static"
VISUALS_DIR = STATIC_DIR / "visuals"

# Ensure directories exist
VISUALS_DIR.mkdir(parents=True, exist_ok=True)

def get_stream_url(youtube_url: str):
    """Get direct stream URL for a YouTube video."""
    ydl_opts = {
        "format": "best[height<=480]", # Lower res for faster processing
        "quiet": True,
        "nocheckcertificate": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        return info.get("url")

def extract_meaningful_frames(youtube_url: str, video_id: str, interval_sec: int = 10):
    """
    Samples frames from video and saves those containing significant text (slides/code).
    Returns a list of { timestamp, url } objects.
    """
    print(f"📸 Starting visual extraction for {video_id}...")
    
    video_folder = VISUALS_DIR / video_id
    video_folder.mkdir(exist_ok=True)
    
    stream_url = get_stream_url(youtube_url)
    if not stream_url:
        print("❌ Could not get stream URL")
        return []

    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print("❌ Could not open video stream")
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0: fps = 30 # Fallback
    
    duration_sec = cap.get(cv2.CAP_PROP_FRAME_COUNT) / fps
    
    visuals = []
    current_sec = 5 # Start 5 seconds in to avoid intros
    
    # Track the last saved frame to avoid near-duplicates
    last_text = ""

    while current_sec < duration_sec:
        # Seek to the timestamp
        frame_idx = int(current_sec * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        
        ret, frame = cap.read()
        if not ret:
            break
            
        # 1. Grayscale for OCR
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 2. OCR Detection (Small subset to find if it's a slide)
        # We don't need full OCR, just enough to know if there is "content"
        ocr_data = pytesseract.image_to_string(gray, config='--psm 11') # Sparse text detection
        
        # Heuristic: Is there enough text to be a slide?
        text_len = len(ocr_data.strip())
        
        # Also check for code-like patterns (indents, brackets, keywords)
        is_code = any(kw in ocr_data for kw in ["def ", "class ", "interface ", "function ", "{", "}"])
        
        # If it looks like a slide or code, and it's different from the last one
        if (text_len > 50 or is_code) and ocr_data.strip()[:50] != last_text[:50]:
            filename = f"frame_{int(current_sec)}.jpg"
            filepath = video_folder / filename
            
            # Save frame
            # Downscale for web performance
            small_frame = cv2.resize(frame, (854, 480))
            cv2.imwrite(str(filepath), small_frame)
            
            visuals.append({
                "timestamp": int(current_sec),
                "url": f"/static/visuals/{video_id}/{filename}"
            })
            
            last_text = ocr_data.strip()
            print(f"✅ Captured visual at {int(current_sec)}s")

        current_sec += interval_sec

    cap.release()
    print(f"🎬 Finished visual extraction: {len(visuals)} visuals found")
    return visuals

def capture_specific_frame(youtube_url: str, video_id: str, timestamp_sec: float):
    """
    Captures a single frame at a specific timestamp.
    Returns the URL of the saved image.
    """
    print(f"📸 Manually capturing frame for {video_id} at {timestamp_sec}s...")
    
    video_folder = VISUALS_DIR / video_id
    video_folder.mkdir(exist_ok=True)
    
    stream_url = get_stream_url(youtube_url)
    if not stream_url:
        return None

    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        return None

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0: fps = 30
    
    # Seek to the timestamp
    frame_idx = int(timestamp_sec * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    
    ret, frame = cap.read()
    if not ret:
        cap.release()
        return None
        
    filename = f"frame_{int(timestamp_sec)}.jpg"
    filepath = video_folder / filename
    
    # Save high quality
    small_frame = cv2.resize(frame, (854, 480))
    cv2.imwrite(str(filepath), small_frame)
    
    cap.release()
    print(f"✅ Manual capture success: {filename}")
    return f"/static/visuals/{video_id}/{filename}"
