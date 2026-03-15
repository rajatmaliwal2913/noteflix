const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // Default to https for production if protocol is missing
  return `https://${url}`;
};

export const API_URL = getBaseUrl();
const BACKEND_URL = API_URL;

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
