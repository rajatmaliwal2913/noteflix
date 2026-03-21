const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
  
  // If it's a localhost, keep the protocol as is
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    return url;
  }

  // Otherwise, remove any accidental http:// and force https://
  const cleanUrl = url.replace(/^http:\/\//, "").replace(/^https:\/\//, "");
  return `https://${cleanUrl}`;
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
