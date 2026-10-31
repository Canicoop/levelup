import { describe, expect, it } from 'vitest'
import { getSupabaseConfig } from '@/lib/supabase-config'

const url = 'https://valor-secreto.supabase.co'
const key = 'chave-super-secreta'

function errorMessage(run: () => unknown) {
  try {
    run()
  } catch (error) {
    return (error as Error).message
  }
  throw new Error('Expected getSupabaseConfig to throw')
}

describe('getSupabaseConfig', () => {
  it('returns the URL and key when both are set', () => {
    expect(getSupabaseConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key })).toEqual({ url, key })
  })

  it.each([
    ['both are missing', {}, 'VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY'],
    ['both are empty', { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' }, 'VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY'],
    ['only the key is missing', { VITE_SUPABASE_URL: url }, 'VITE_SUPABASE_PUBLISHABLE_KEY'],
    ['only the key is empty', { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: '' }, 'VITE_SUPABASE_PUBLISHABLE_KEY'],
    ['only the URL is missing', { VITE_SUPABASE_PUBLISHABLE_KEY: key }, 'VITE_SUPABASE_URL'],
  ])('names exactly what is missing when %s', (_label, env, missing) => {
    expect(errorMessage(() => getSupabaseConfig(env))).toBe(
      `Missing Supabase configuration: ${missing}. Copy .env.example to .env.local, fill it in and restart the dev server.`,
    )
  })

  it('never includes the values in the error message', () => {
    const withoutKey = errorMessage(() => getSupabaseConfig({ VITE_SUPABASE_URL: url }))
    const withoutUrl = errorMessage(() => getSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: key }))

    for (const message of [withoutKey, withoutUrl]) {
      expect(message).not.toContain(url)
      expect(message).not.toContain('valor-secreto')
      expect(message).not.toContain(key)
    }
  })
})
