"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Gauge, Send } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="panel w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <Gauge className="h-7 w-7 text-accent" />
          <h1 className="num text-2xl font-bold tracking-wider">
            OPERATION <span className="text-accent">LAMBO</span>
          </h1>
        </div>
        <p className="mb-6 text-sm text-white/55">
          The bank is the score. Every day you don&apos;t hit the goal, the
          target slips. $3M unlocks the trophy.
        </p>

        {sent ? (
          <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-accent">
            Check your email — a magic link is on the way.
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="field w-full"
            />
            <button type="submit" disabled={loading} className="btn-go w-full">
              <span className="inline-flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                {loading ? "Sending…" : "Send magic link"}
              </span>
            </button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
