"use client";
import { useEffect, useState } from "react";

export default function ProfileForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setName(data.name ?? "");
        setEmail(data.email ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ type: "ok", text: "Profile updated." });
    } else {
      setMsg({ type: "err", text: data.error ?? "Update failed" });
    }
    setSaving(false);
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <form onSubmit={save} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
        />
      </div>
      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-500"}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="bg-accent text-nav font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
