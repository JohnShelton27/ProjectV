"use client";

import { useState } from "react";

export default function ShareButtons({
  slug,
  address,
  price,
}: {
  slug: string;
  address: string;
  price: string;
}) {
  const [copied, setCopied] = useState(false);

  const text = `Check out this property: ${address} - ${price}`;
  const encodedText = encodeURIComponent(text);

  function getUrl() {
    return typeof window !== "undefined" ? window.location.href : "";
  }

  function copyLink() {
    navigator.clipboard.writeText(getUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Use onClick handlers instead of href to avoid hydration mismatch
  function openShare(urlTemplate: string) {
    const pageUrl = getUrl();
    const finalUrl = urlTemplate
      .replace("{url}", encodeURIComponent(pageUrl))
      .replace("{text}", encodedText);
    window.open(finalUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500 mr-1">Share:</span>

      {/* Facebook */}
      <button
        onClick={() => openShare("https://www.facebook.com/sharer/sharer.php?u={url}")}
        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-colors"
        title="Share on Facebook"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>

      {/* X/Twitter */}
      <button
        onClick={() => openShare("https://twitter.com/intent/tweet?url={url}&text={text}")}
        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
        title="Share on X"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* Email */}
      <button
        onClick={() => {
          const pageUrl = getUrl();
          window.location.href = `mailto:?subject=${encodeURIComponent(`Property: ${address} - ${price}`)}&body=${encodedText}%0A%0A${encodeURIComponent(pageUrl)}`;
        }}
        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-green-100 text-slate-500 hover:text-green-600 flex items-center justify-center transition-colors"
        title="Share via Email"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </button>

      {/* Copy Link */}
      <button
        onClick={copyLink}
        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-500 hover:text-purple-600 flex items-center justify-center transition-colors"
        title="Copy Link"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.058a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.25 8.81" />
          </svg>
        )}
      </button>
    </div>
  );
}
