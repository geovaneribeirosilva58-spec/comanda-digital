'use client'

import { RefreshCw } from 'lucide-react'

export default function GlobalRefreshButton() {
  return (
    <button 
      onClick={() => window.location.reload()}
      className="fixed bottom-6 right-6 z-50 bg-amber-500 hover:bg-amber-600 text-slate-950 p-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center border-2 border-slate-900"
      aria-label="Atualizar Página"
      title="Atualizar Página"
    >
      <RefreshCw className="w-6 h-6" />
    </button>
  )
}
