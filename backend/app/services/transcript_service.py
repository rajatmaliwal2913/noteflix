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

# Lazy-loaded Whisper model
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

    # Extract chapters if available
    chapters = []
    if "chapters" in info and info["chapters"]:
        for ch in info["chapters"]:
            chapters.append({
                "title": ch["title"],
                "start": ch["start_time"],
                "end": ch["end_time"]
            })

    return {
        "video_id": info["id"],
        "title": info["title"],
        "duration": info["duration"],
        "author": info.get("uploader"),
        "thumbnail": info.get("thumbnail"),
        "chapters": chapters   # ⭐ NEW FIELD
    }



# ---------------------------------------------------
# SUBTITLES USING yt-dlp (PRIMARY METHOD)
# ---------------------------------------------------

def get_captions_with_ytdlp(url: str):
    """
    Download English subtitles using yt-dlp.
    Converts YouTube JSON3 subtitles → transcript format.
    """

    file_id = f"subs_{uuid.uuid4()}"
    output_template = f"{file_id}"

    ydl_opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en"],
        "subtitlesformat": "json3",
        "outtmpl": output_template,
        "quiet": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        subtitle_files = glob.glob(f"{file_id}*.json3")
        if not subtitle_files:
            return None

        subtitle_file = subtitle_files[0]

        with open(subtitle_file, "r") as f:
            data = json.load(f)

        # delete subtitle file after reading
        os.remove(subtitle_file)

        transcript = []

        for event in data.get("events", []):
            if "segs" not in event:
                continue

            text = "".join(seg.get("utf8", "") for seg in event["segs"])
            start = event.get("tStartMs", 0) / 1000
            duration = event.get("dDurationMs", 0) / 1000

            transcript.append({
                "text": text.strip(),
                "start": start,
                "end": start + duration
            })

        return transcript if len(transcript) > 0 else None

    except Exception as e:
        print("⚠️ yt-dlp subtitle fetch failed:", e)
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
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    # cleanup non-mp3 leftovers
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


# ---------------------------------------------------
# MAIN PIPELINE ⭐
# ---------------------------------------------------

def generate_transcript(url: str):
    """
    FINAL ORCHESTRATOR
    yt-dlp subtitles → Whisper fallback
    """

    metadata = get_video_metadata(url)

    print("📺 Processing video:", metadata["title"])

    # 1️⃣ Try subtitles (fast path)
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

        # delete temp audio file
        if os.path.exists(audio_file):
            os.remove(audio_file)

    return {
        "metadata": metadata,
        "source": source,
        "transcript": transcript
    }
