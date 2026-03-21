"""
NoteFlix Transcript Service
FINAL PIPELINE (production-ready)

1) Fetch video metadata using yt-dlp
2) Fetch subtitles using yt-dlp (reliable method)
3) Fallback to Whisper if subtitles unavailable
4) Return unified transcript format
"""

import os
import uuid
import json
import glob
import re
import requests
import asyncio
from pathlib import Path
from typing import List, Dict, Any
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import JSONFormatter
import yt_dlp
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)

def get_video_id(url: str) -> str:
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    return match.group(1) if match else "unknown"

def get_video_metadata(url: str):
    video_id = get_video_id(url)
    
    # Strategy 1: oEmbed (Most resilient to IP blocks)
    try:
        oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
        response = requests.get(oembed_url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                "video_id": video_id,
                "title": data.get("title", "YouTube Lecture"),
                "duration": 0, # oEmbed doesn't provide duration
                "author": data.get("author_name", "Unknown"),
                "thumbnail": data.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"),
                "chapters": []
            }
    except Exception as e:
        print(f"oEmbed failed: {e}")

    # Strategy 2: yt-dlp (Fallback, likely to be blocked but has chapters)
    try:
        ydl_opts = {
            "quiet": True,
            "skip_download": True,
            "nocheckcertificate": True,
            "noplaylist": True,       
            "extract_flat": False,    
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
        chapters = []
        if info.get("chapters"):
            for ch in info["chapters"]:
                chapters.append({
                    "title": ch.get("title", "Chapter"),
                    "start": ch.get("start_time", 0),
                    "end": ch.get("end_time", 0)
                })

        return {
            "video_id": info.get("id"),
            "title": info.get("title", "Untitled Video"),
            "duration": info.get("duration", 0),
            "author": info.get("uploader", "Unknown"),
            "thumbnail": info.get("thumbnail", ""),
            "chapters": chapters
        }
    except Exception as e:
        print(f"yt-dlp metadata failed: {e}")
        
    # Final Fallback
    return {
        "video_id": video_id,
        "title": "YouTube Lecture",
        "duration": 0,
        "author": "Unknown",
        "thumbnail": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
        "chapters": []
    }

def get_captions_with_ytdlp(url: str):
    """
    Download English subtitles using yt-dlp.
    Converts YouTube JSON3 → transcript format.
    """

    file_id = f"subs_{uuid.uuid4()}"
    output_template = f"{file_id}"

    ydl_opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en", "en-US", "en-orig", "en-GB"],
        "subtitlesformat": "json3",
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        subtitle_files = glob.glob(f"{file_id}*.json3")
        if not subtitle_files:
            print("❌ No subtitles found")
            return None

        subtitle_file = subtitle_files[0]

        with open(subtitle_file, "r") as f:
            data = json.load(f)

        os.remove(subtitle_file)

        transcript = []

        for event in data.get("events", []):
            if "segs" not in event:
                continue

            text = "".join(seg.get("utf8", "") for seg in event["segs"])
            start = event.get("tStartMs", 0) / 1000
            duration = event.get("dDurationMs", 0) / 1000

            if text.strip():
                transcript.append({
                    "text": text.strip(),
                    "start": start,
                    "end": start + duration
                })

        if len(transcript) == 0:
            return None

        return transcript

    except Exception as e:
        print("⚠️ yt-dlp subtitle fetch failed:", e)
        return None

def generate_transcript(url: str):
    """
    High-level transcript generation:
    1. Try youtube-transcript-api (Fastest, most resilient)
    2. Try yt-dlp auto-subs
    """
    video_id = get_video_id(url)
    metadata = get_video_metadata(url)
    
    transcript = None
    source = None

    # 1. youtube-transcript-api
    try:
        print(f"Attempting youtube-transcript-api for {video_id}...")
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Prefer manually created, then auto-generated
        try:
            ts = transcript_list.find_manually_created_transcript()
        except:
            ts = transcript_list.find_generated_transcript(['en', 'hi', 'es', 'fr', 'de'])
            
        data = ts.fetch()
        
        # Format for our needs
        transcript = []
        for entry in data:
            transcript.append({
                "text": entry["text"],
                "start": entry["start"],
                "end": entry["start"] + entry["duration"]
            })
        source = "youtube_transcript_api"
        print(f"✅ Successfully fetched transcript via API ({len(transcript)} segments)")
            
    except Exception as e:
        print(f"youtube-transcript-api failed: {e}")

    # 2. yt-dlp fallback
    if not transcript:
        try:
            print(f"Falling back to yt-dlp for {video_id}...")
            transcript = get_captions_with_ytdlp(url)
            if transcript:
                source = "yt_dlp"
                print(f"✅ Successfully fetched transcript via yt-dlp ({len(transcript)} segments)")
        except Exception as e:
            print(f"yt-dlp caption fallback failed: {e}")

    # If all fails, raise a helpful error
    if not transcript:
        raise Exception("Could not extract any transcripts for this video. YouTube might be blocking the server or captions are disabled.")

    return {
        "metadata": metadata,
        "source": source,
        "transcript": transcript
    }
