"""
NoteFlix Transcript Service

Pipeline:
1) Fetch video metadata
2) Try YouTube captions (fast path)
3) Fallback to Whisper transcription
4) Normalize output format
"""

import os
import uuid
import yt_dlp
import whisper
from youtube_transcript_api import YouTubeTranscriptApi

# Lazy-loaded whisper model (loads only if needed)
WHISPER_MODEL = None


# ---------------------------------------------------
# VIDEO METADATA
# ---------------------------------------------------

def get_video_metadata(url: str):
    ydl_opts = {
        "quiet": True,
        "skip_download": True
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    return {
        "video_id": info["id"],
        "title": info["title"],
        "duration": info["duration"],
        "author": info.get("uploader"),
        "thumbnail": info.get("thumbnail"),
    }


# ---------------------------------------------------
# YOUTUBE CAPTIONS (FAST PATH)
# ---------------------------------------------------

def get_youtube_captions(video_id: str):
    """
    Robust caption fetching:
    1) Manual English captions
    2) Auto English captions
    3) Any English-like captions (en-US, en-GB etc)
    """

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # 1️⃣ Manual English captions
        try:
            transcript = transcript_list.find_manually_created_transcript(['en'])
            return transcript.fetch()
        except:
            pass

        # 2️⃣ Auto-generated English captions
        try:
            transcript = transcript_list.find_generated_transcript(['en'])
            return transcript.fetch()
        except:
            pass

        # 3️⃣ Any English-like captions
        for transcript in transcript_list:
            if 'en' in transcript.language_code:
                return transcript.fetch()

        return None

    except Exception as e:
        print("⚠️ Caption fetch failed:", e)
        return None


# ---------------------------------------------------
# WHISPER FALLBACK
# ---------------------------------------------------

def load_whisper_model():
    global WHISPER_MODEL
    if WHISPER_MODEL is None:
        print("🔊 Loading Whisper model...")
        WHISPER_MODEL = whisper.load_model("base")
    return WHISPER_MODEL


def download_youtube_audio(url: str):
    """
    Downloads audio using yt_dlp → returns mp3 file path
    """

    file_id = str(uuid.uuid4())
    output_template = f"{file_id}.%(ext)s"

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "quiet": True,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    return f"{file_id}.mp3"


def whisper_transcribe(audio_path: str):
    model = load_whisper_model()
    result = model.transcribe(audio_path)
    return result["segments"]


# ---------------------------------------------------
# NORMALIZATION
# ---------------------------------------------------

def normalize_captions(captions):
    return [
        {
            "text": c["text"].strip(),
            "start": c["start"],
            "end": c["start"] + c.get("duration", 0)
        }
        for c in captions
    ]


def normalize_whisper(segments):
    return [
        {
            "text": seg["text"].strip(),
            "start": seg["start"],
            "end": seg["end"]
        }
        for seg in segments
    ]


# ---------------------------------------------------
# MAIN PIPELINE ⭐
# ---------------------------------------------------

def generate_transcript(url: str):
    """
    Main orchestrator:
    Captions → Whisper fallback → unified output
    """

    metadata = get_video_metadata(url)
    video_id = metadata["video_id"]

    print("📺 Processing video:", metadata["title"])

    # 1️⃣ Try captions (fast path)
    captions = get_youtube_captions(video_id)

    if captions:
        print("⚡ Using YouTube captions")
        transcript = normalize_captions(captions)
        source = "youtube_captions"

    else:
        print("🤖 Falling back to Whisper transcription")
        audio_file = download_youtube_audio(url)
        segments = whisper_transcribe(audio_file)
        transcript = normalize_whisper(segments)
        source = "whisper"

        # cleanup temp file
        if os.path.exists(audio_file):
            os.remove(audio_file)

    return {
        "metadata": metadata,
        "source": source,
        "transcript": transcript
    }
