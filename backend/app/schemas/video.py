from pydantic import BaseModel

class VideoRequest(BaseModel):
    url: str


class ChatRequest(BaseModel):
    question: str
