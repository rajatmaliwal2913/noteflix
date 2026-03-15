# NoteFlix 🎓

Turn any YouTube lecture into beautiful, structured, visual study notes. NoteFlix uses AI to extract transcripts, identify key visual frames, and generate comprehensive notes, quizzes, and flashcards.

---

## 🚀 Features

- **AI-Generated Notes**: Automatically structured notes from any YouTube video.
- **Visual Intelligence**: Captures key frames and diagrams directly from the video.
- **Interactive Study Tools**: Generate quizzes, flashcards, and interview questions instantly.
- **Global AI Chat**: Ask questions across all your processed lectures.
- **Flexible Export**: Download your notes as PDFs.
- **Library Management**: Keep track of all your processed lectures in a clean dashboard.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: FastAPI (Python), Groq (LLM), OpenAI-Whisper (Transcripting), ChromaDB (Vector DB).
- **Authentication/Database**: Supabase.
- **Deployment**: Hybrid (Vercel + Railway/Render).

---

## 💻 Local Setup

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **FFmpeg**: Required for video/audio processing.
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`
- **Supabase Account**: A project with a `lectures` and `bookmarks` table.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/noteflix.git
cd noteflix
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -e ../ai_pipeline
```
Create a `.env` file in the `backend/` directory:
```env
GROQ_API_KEY=your_groq_api_key
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## 🏃‍♂️ Running the App

### Option 1: Manual (Recommended for Development)

**Start Backend:**
```bash
cd backend
# Make sure venv is active
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Start Frontend:**
```bash
cd frontend
npm run dev
```

### Option 2: Docker
```bash
docker-compose up --build
```
*Note: Docker setup requires sufficient memory to run Whisper and Torch.*

---

## 🌐 Deployment (Hybrid Approach)

NoteFlix uses a hybrid deployment model because the backend requires persistent computing and larger memory than standard serverless functions allow.

### 1. Backend (Railway / Render)
Deploy using the root `Dockerfile`. 
- **Platform**: Railway is recommended.
- **Variables**: Set `GROQ_API_KEY`.
- **Port**: 8000.

### 2. Frontend (Vercel)
- **Root Directory**: `frontend`
- **Variables**: 
  - `NEXT_PUBLIC_API_URL`: Your deployed backend URL.
  - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Key.

---

## 📄 License
MIT License. Created with ❤️ for students everywhere.
