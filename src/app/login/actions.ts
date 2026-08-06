'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Para um MVP, redirecionamos para login com erro na URL, ou poderia usar useActionState.
    // Usaremos redirect simples por agora.
    redirect('/login?error=Credenciais invÃ¡lidas')
  }

  revalidatePath('/', 'layout')
  redirect('/') // Middleware cuidarÃ¡ do roteamento baseado no perfil
}
