"use client";

import { useState } from "react";
import { AGENT_CONFIG } from "@/lib/config";

export default function ContactForm({
  listingAddress,
}: {
  listingAddress: string;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: `I'm interested in ${listingAddress}. Please send me more information.`,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          listingAddress,
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center">
        <div className="text-3xl mb-3">&#10003;</div>
        <h3 className="font-semibold text-lg text-slate-900 mb-1">
          Message Sent!
        </h3>
        <p className="text-sm text-slate-500">
          {AGENT_CONFIG.name} will get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
      <div className="text-center">
        <h3 className="font-semibold text-lg text-slate-900">
          Interested in this property?
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Contact {AGENT_CONFIG.name} for a showing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          required
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="email"
          required
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="tel"
          placeholder="Phone Number (optional)"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <textarea
          required
          rows={3}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? "Sending..." : "Request Info"}
        </button>
      </form>

      <div className="border-t border-slate-100 pt-4 text-center space-y-1">
        <p className="text-sm text-slate-500">Or call directly</p>
        <a
          href={`tel:${AGENT_CONFIG.phone.replace(/[^0-9+]/g, "")}`}
          className="block text-lg font-semibold text-blue-600 hover:text-blue-700"
        >
          {AGENT_CONFIG.phone}
        </a>
        <p className="text-xs text-slate-400">
          {AGENT_CONFIG.name} &middot; {AGENT_CONFIG.licenseNumber}
        </p>
      </div>
    </div>
  );
}
