"use client";

import { useState } from "react";

const SOURCES = [
  { id: "zillow", label: "Zillow" },
  { id: "realtor", label: "Realtor.com" },
  { id: "redfin", label: "Redfin" },
  { id: "trulia", label: "Trulia" },
];

export default function ScrapeButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(["zillow", "realtor", "redfin", "trulia"]);

  function toggleSource(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleScrape() {
    if (selected.length === 0) {
      setResult("Select at least one source.");
      return;
    }

    setLoading(true);
    setResult(`Scraping from ${selected.join(", ")}... this may take a few minutes.`);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: selected }),
      });
      const data = await res.json();
      if (data.success) {
        const details = data.results
          .map(
            (r: { source: string; found: number; errors: string[] }) =>
              `${r.source}: ${r.found} found${r.errors.length > 0 ? ` (${r.errors.length} errors)` : ""}`
          )
          .join(" | ");
        setResult(`${data.totalListings} total listings saved. ${details}`);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult("Failed to connect to scrape API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((source) => (
          <button
            key={source.id}
            onClick={() => toggleSource(source.id)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selected.includes(source.id)
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            } disabled:opacity-50`}
          >
            {source.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={handleScrape}
          disabled={loading || selected.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Scraping..." : "Scrape Listings"}
        </button>
      </div>
      {result && (
        <p className="text-sm text-slate-600">{result}</p>
      )}
    </div>
  );
}
