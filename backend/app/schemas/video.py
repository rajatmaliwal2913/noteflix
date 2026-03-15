from pydantic import BaseModel
from typing import List, Optional

class Chapter(BaseModel):
    title: str
    start: float
    end: float

class VideoRequest(BaseModel):
    url: str
    depth: str = "concise"     
    format: str = "bullets"    

class VideoProcessRequest(BaseModel):
    url: str
    depth: str = "Standard"
    format: str = "Bullet Points"
    tone: str = "Student"
    language: str = "English"
    include_visuals: bool = True
    include_code: bool = True
    selected_chapters: Optional[List[Chapter]] = None

class ChatRequest(BaseModel):
    question: str
    transcript: Optional[List[dict]] = None

class CaptureFrameRequest(BaseModel):
    url: str
    video_id: str
    timestamp: float
