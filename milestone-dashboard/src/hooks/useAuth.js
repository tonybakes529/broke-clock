import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) return
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return {
    session,
    user: session?.user ?? null,
    loading,
    signOut: async () => {
      if (!supabaseConfigured) return
      await supabase.auth.signOut()
    },
  }
}
