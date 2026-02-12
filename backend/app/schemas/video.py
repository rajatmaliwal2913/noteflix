from pydantic import BaseModel

class VideoRequest(BaseModel):
    url: str
    depth: str = "concise"     # concise | detailed
    format: str = "bullets"    # bullets | paragraphs
