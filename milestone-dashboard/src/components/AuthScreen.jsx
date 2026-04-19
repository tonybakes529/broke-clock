import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (err) {
      setStatus('error')
      setError(err.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card card-glow w-full max-w-md p-8 md:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold via-gold-soft to-gold-deep shadow-gold" />
          <div>
            <h1 className="font-display text-2xl tracking-tight">Milestone Dashboard</h1>
            <p className="text-xs text-zinc-500 -mt-0.5">Sign in to sync across devices</p>
          </div>
        </div>

        {status === 'sent' ? (
          <div className="text-center py-6">
            <div className="font-display text-xl text-emerald-400 mb-2">Check your inbox</div>
            <p className="text-sm text-zinc-400">
              We sent a magic link to <span className="text-zinc-200">{email}</span>.
              Open it on this device to sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus('idle')
                setError('')
              }}
              className="btn-ghost mt-6"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                className="field mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="btn-primary w-full"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && (
              <div className="text-sm text-red-400">{error}</div>
            )}
            <p className="text-xs text-zinc-500 text-center pt-2">
              No password. We email you a one-time link.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
