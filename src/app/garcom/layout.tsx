import { LogOut, Beer } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CallListener } from '@/components/CallListener'

export default async function GarcomLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="bg-slate-900 text-amber-500 p-4 flex justify-between items-center shadow-md border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Beer className="w-6 h-6" />
          <span className="font-bold text-lg">Guela Seca</span>
        </div>
        <form action={signOut}>
          <Button variant="ghost" size="icon" className="text-amber-500 hover:bg-slate-800 hover:text-amber-400">
            <LogOut className="w-5 h-5" />
          </Button>
        </form>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 max-w-lg w-full mx-auto">
        {children}
      </main>
      
      <CallListener />
    </div>
  )
}
