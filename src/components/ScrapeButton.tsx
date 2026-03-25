"use client";

import { useState } from "react";

export default function ScrapeButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleScrape() {
    setLoading(true);
    setResult("Updating listings... this may take a few minutes.");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`${data.totalListings} listings updated.`);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult("Failed to update listings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleScrape}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        {loading ? "Updating..." : "Update Listings"}
      </button>
      {result && (
        <p className="text-sm text-slate-600">{result}</p>
      )}
    </div>
  );
}
