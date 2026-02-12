const BACKEND_URL = "http://127.0.0.1:8000";

export async function processVideo(url: string, options: any) {
  const response = await fetch(`${BACKEND_URL}/process-video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: url,
      options: options,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(text);
    throw new Error("Processing failed");
  }

  return response.json();
}
