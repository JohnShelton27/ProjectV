"use client";

import { useState, useEffect } from "react";

const FIELDS = [
  { key: "site_name", label: "Site Name", placeholder: "Ventura County Real Estate" },
  { key: "site_description", label: "Site Description", placeholder: "Browse real estate listings in..." },
  { key: "agent_name", label: "Agent Name", placeholder: "John Smith" },
  { key: "agent_title", label: "Title", placeholder: "Licensed Real Estate Agent" },
  { key: "agent_brokerage", label: "Brokerage", placeholder: "Keller Williams Realty" },
  { key: "agent_phone", label: "Phone", placeholder: "(805) 555-0100" },
  { key: "agent_email", label: "Email", placeholder: "john@example.com" },
  { key: "agent_license", label: "License Number", placeholder: "DRE# 01234567" },
];

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings-load")
      .then((r) => r.json())
      .then((data) => {
        setValues(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setMessage("Settings saved!");
      } else {
        setMessage("Failed to save settings.");
      }
    } catch {
      setMessage("Failed to save settings.");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 max-w-2xl">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Branding</h2>
          <div className="space-y-4">
            {FIELDS.filter((f) => f.key.startsWith("site_")).map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={values[field.key] || ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>

        <hr className="border-slate-200" />

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Agent Info</h2>
          <div className="space-y-4">
            {FIELDS.filter((f) => f.key.startsWith("agent_")).map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={values[field.key] || ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {message && (
            <span className={`text-sm ${message.includes("!") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
