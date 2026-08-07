import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-8 shadow-xl border border-slate-800">
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-black">
            <img src="/logo.jpg?v=2" alt="Guela Seca" className="w-full h-full object-cover" />
          </div>
        </div>
        <h1 className="mb-8 text-center text-2xl font-bold text-amber-500">Comanda Guela Seca</h1>
        <form className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              E-mail
            </label>
            <Input id="email" name="email" type="email" required className="mt-1.5" placeholder="seu@email.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Senha
            </label>
            <Input id="password" name="password" type="password" required className="mt-1.5" placeholder="******" />
          </div>
          
          <div className="flex items-center space-x-2 mt-2">
            <input 
              type="checkbox" 
              id="rememberMe" 
              name="rememberMe" 
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-950" 
            />
            <label htmlFor="rememberMe" className="text-sm font-medium text-slate-300 cursor-pointer">
              Lembrar deste computador
            </label>
          </div>

          <Button formAction={login} className="w-full mt-4 text-slate-950 font-bold text-base h-12" type="submit">
            Entrar no Sistema
          </Button>
        </form>
      </div>
    </div>
  )
}
