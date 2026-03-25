"use client";

import { useState } from "react";

export default function ScrapeButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleScrape() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResult(`Found ${data.totalListings} listings. Refresh to see them.`);
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
    <div className="flex items-center gap-4">
      <button
        onClick={handleScrape}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        {loading ? "Scraping..." : "Scrape Listings"}
      </button>
      {result && (
        <p className="text-sm text-slate-600">{result}</p>
      )}
    </div>
  );
}
