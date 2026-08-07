import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            const rememberMe = cookieStore.get('remember_me')?.value === 'true'
            cookiesToSet.forEach(({ name, value, options }) => {
              if (!rememberMe && value !== '') {
                // If the user did not check 'remember me', make it a session cookie
                delete options.maxAge
                delete options.expires
              }
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Pode ser ignorado caso chamado a partir de um Server Component
          }
        },
      },
    }
  )
}
