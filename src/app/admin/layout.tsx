import Link from 'next/link'
import { LayoutDashboard, Users, Grid2X2, Package, LogOut, Beer, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:block flex-shrink-0">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-500 shrink-0 bg-black">
              <img src="/logo.jpg?v=2" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold text-amber-500">Guela Seca</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <Link href="/admin/dashboard" className="flex items-center px-4 py-3 text-slate-300 rounded-md hover:bg-slate-800 hover:text-amber-500">
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </Link>
            <Link href="/admin/mesas" className="flex items-center px-4 py-3 text-slate-300 rounded-md hover:bg-slate-800 hover:text-amber-500">
              <Grid2X2 className="w-5 h-5 mr-3" />
              Mesas
            </Link>
            <Link href="/admin/produtos" className="flex items-center px-4 py-3 text-slate-300 rounded-md hover:bg-slate-800 hover:text-amber-500">
              <Package className="w-5 h-5 mr-3" />
              Produtos
            </Link>
            <Link href="/admin/usuarios" className="flex items-center px-4 py-3 text-slate-300 rounded-md hover:bg-slate-800 hover:text-amber-500">
              <Users className="w-5 h-5 mr-3" />
              Garçons
            </Link>
            <Link href="/admin/relatorios" className="flex items-center px-4 py-3 text-slate-300 rounded-md hover:bg-slate-800 hover:text-amber-500">
              <BarChart3 className="w-5 h-5 mr-3" />
              Relatórios
            </Link>
          </nav>
          <div className="p-4 border-t border-slate-800">
            <form action={signOut}>
              <Button variant="ghost" className="w-full flex justify-start text-slate-400 hover:text-amber-500 hover:bg-slate-800">
                <LogOut className="w-5 h-5 mr-3" />
                Sair
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
