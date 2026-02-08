"use client";

import { useEffect, useState } from "react";

export default function NotesPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("noteflix_data");
    if (saved) setData(JSON.parse(saved));
  }, []);

  if (!data) return <div className="p-10">No data found</div>;

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{data.metadata.title}</h1>

      {data.notes.map((section: any, idx: number) => (
        <div key={idx} className="mb-10">
          <h2 className="text-2xl font-semibold">{section.title}</h2>
          <p className="text-gray-500 mb-3">{section.summary}</p>

          <ul className="list-disc ml-6">
            {section.notes.bullet_notes.map((b: string, i: number) => (
              <li key={i}>{b}</li>
            ))}
          </ul>

          <p className="mt-3">{section.notes.explanation}</p>
        </div>
      ))}
    </div>
  );
}
