const API_BASE = "http://127.0.0.1:8000";

export async function processVideo(url: string) {
  const res = await fetch(`${API_BASE}/process-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return res.json();
}

export async function askQuestion(question: string) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  return res.json();
}