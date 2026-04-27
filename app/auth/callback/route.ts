import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getDefaultTranslationId } from '@/lib/translationDefaults'

const SUPPORTED_LANGS = ["ko", "de", "en", "fr"] as const
type Lang = typeof SUPPORTED_LANGS[number]

function isLang(value: string | null): value is Lang {
  return !!value && (SUPPORTED_LANGS as readonly string[]).includes(value)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const selectedLang = searchParams.get('lang')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)

    if (isLang(selectedLang)) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("profiles")
          .update({
            preferred_language: selectedLang,
            preferred_translation: getDefaultTranslationId(selectedLang),
          })
          .eq("id", user.id)
      }
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
