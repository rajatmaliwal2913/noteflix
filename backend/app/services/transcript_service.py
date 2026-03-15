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
import yt_dlp
import whisper

WHISPER_MODEL = None

def get_video_metadata(url: str):
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

def load_whisper_model():
    global WHISPER_MODEL
    if WHISPER_MODEL is None:
        print("🔊 Loading Whisper model (first time only)...")
        WHISPER_MODEL = whisper.load_model("base")
    return WHISPER_MODEL

def download_youtube_audio(url: str):
    """
    Download audio → convert to mp3 → cleanup leftovers
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
        "keepvideo": False,
        "nocheckcertificate": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    for file in glob.glob(f"{file_id}.*"):
        if not file.endswith(".mp3"):
            try:
                os.remove(file)
            except:
                pass

    return f"{file_id}.mp3"

def whisper_transcribe(audio_path: str):
    model = load_whisper_model()
    result = model.transcribe(audio_path)
    return result["segments"]

def normalize_whisper(segments):
    return [
        {
            "text": seg["text"].strip(),
            "start": seg["start"],
            "end": seg["end"]
        }
        for seg in segments
    ]

def generate_transcript(url: str):
    """
    yt-dlp subtitles → Whisper fallback
    """

    metadata = get_video_metadata(url)
    print("📺 Processing video:", metadata["title"])

    captions = get_captions_with_ytdlp(url)

    if captions:
        print("⚡ Using YouTube subtitles")
        transcript = captions
        source = "youtube_subtitles"

    else:
        print("🤖 Subtitles not found → Using Whisper")
        audio_file = download_youtube_audio(url)
        segments = whisper_transcribe(audio_file)
        transcript = normalize_whisper(segments)
        source = "whisper"

        if os.path.exists(audio_file):
            os.remove(audio_file)

    print(f"✅ Transcript segments: {len(transcript)}")

    return {
        "metadata": metadata,
        "source": source,
        "transcript": transcript
    }
