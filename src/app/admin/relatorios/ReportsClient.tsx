'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

export default function ReportsClient({ data }: { data: any[] }) {
  const [period, setPeriod] = useState<'diario' | 'semanal' | 'mensal' | 'anual'>('diario')

  // Evitar hidration mismatch pegando o ano atual no mount ou usando o fallback padrao do browser
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  // Processar dados para Gráficos de Evolução no Tempo
  const timeData = useMemo(() => {
    const grouped: Record<string, number> = {}

    data.forEach(order => {
      if (!order.closed_at) return
      
      const date = new Date(order.closed_at)
      let key = ''

      if (period === 'diario') {
        key = date.toLocaleDateString('pt-BR')
      } else if (period === 'semanal') {
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date.setDate(diff))
        key = `Sem. de ${monday.toLocaleDateString('pt-BR').slice(0, 5)}`
      } else if (period === 'mensal') {
        key = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
      } else if (period === 'anual') {
        key = String(date.getFullYear())
      }

      grouped[key] = (grouped[key] || 0) + Number(order.total)
    })

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      total: value
    }))
  }, [data, period])

  // Processar dados para Vendas por Garçom
  const waiterData = useMemo(() => {
    const grouped: Record<string, number> = {}
    
    data.forEach(order => {
      const waiterName = order.profiles?.name || 'Administrador'
      grouped[waiterName] = (grouped[waiterName] || 0) + Number(order.total)
    })

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  // 1. Top 10 Produtos do Mês Atual
  const top10Month = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const productSales: Record<string, number> = {}

    data.forEach(order => {
      if (!order.closed_at) return
      const orderDate = new Date(order.closed_at)
      if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
        order.order_items?.forEach((item: any) => {
          if (item.status !== 'cancelado') {
            const productName = item.products?.name || 'Produto Desconhecido'
            productSales[productName] = (productSales[productName] || 0) + (item.quantity * item.unit_price)
          }
        })
      }
    })

    return Object.entries(productSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [data])

  // Anos disponíveis para o filtro Anual
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    years.add(new Date().getFullYear()) // Sempre ter o ano atual
    data.forEach(order => {
      if (order.closed_at) {
        years.add(new Date(order.closed_at).getFullYear())
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [data])

  // 2. Top 5 Produtos por Ano selecionado
  const top5Year = useMemo(() => {
    const productSales: Record<string, number> = {}

    data.forEach(order => {
      if (!order.closed_at) return
      const orderDate = new Date(order.closed_at)
      if (orderDate.getFullYear() === selectedYear) {
        order.order_items?.forEach((item: any) => {
          if (item.status !== 'cancelado') {
            const productName = item.products?.name || 'Produto Desconhecido'
            productSales[productName] = (productSales[productName] || 0) + (item.quantity * item.unit_price)
          }
        })
      }
    })

    return Object.entries(productSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [data, selectedYear])


  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
  const TOP_COLORS = ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#78350f', '#10b981', '#059669', '#047857', '#3b82f6', '#1d4ed8']

  const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`
  const mesAtualNome = new Date().toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <div className="space-y-8 pb-10">
      
      {/* Seção de Evolução de Vendas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-200">Evolução de Vendas</h2>
            <p className="text-slate-400 text-sm">Acompanhe o faturamento da empresa ao longo do tempo.</p>
          </div>
          <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800 overflow-x-auto">
            {(['diario', 'semanal', 'mensal', 'anual'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                  period === p 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-amber-500 hover:bg-slate-900'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[400px] w-full">
          {timeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8' }}
                  tickMargin={10}
                />
                <YAxis 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={(value) => `R$ ${value}`}
                  width={80}
                />
                <Tooltip
                  cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#cbd5e1' }}
                  formatter={(value: any) => [formatBRL(Number(value)), 'Faturamento']}
                  labelStyle={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#f59e0b" 
                  strokeWidth={4} 
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 6 }} 
                  activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 font-medium border-2 border-dashed border-slate-800 rounded-xl">
              Nenhuma venda registrada para mostrar no gráfico.
            </div>
          )}
        </div>
      </div>

      {/* Seção de TOP Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Top 10 do Mês */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-200 mb-1">Top 10 Produtos do Mês</h2>
            <p className="text-slate-400 text-sm">Os campeões de faturamento em {mesAtualNome}.</p>
          </div>
          
          <div className="h-[350px]">
            {top10Month.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Month} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fill: '#e2e8f0', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#cbd5e1' }}
                    formatter={(value: any) => [formatBRL(Number(value)), 'Total Vendido']}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {top10Month.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TOP_COLORS[index % TOP_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl">
                Nenhum produto vendido este mês.
              </div>
            )}
          </div>
        </div>

        {/* Top 5 do Ano */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-200 mb-1">Top 5 Produtos do Ano</h2>
              <p className="text-slate-400 text-sm">Os produtos mais rentáveis do ano.</p>
            </div>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className="h-[350px]">
            {top5Year.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5Year} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fill: '#e2e8f0', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#cbd5e1' }}
                    formatter={(value: any) => [formatBRL(Number(value)), 'Total Vendido']}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {top5Year.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl">
                Nenhum produto vendido em {selectedYear}.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Seção de Vendas por Garçom (Mantida da versão anterior) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gráfico de Barras */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-slate-200 mb-1">Vendas por Atendente</h2>
          <p className="text-slate-400 text-sm mb-6">Total arrecadado por cada membro da equipe.</p>
          
          <div className="h-[300px]">
            {waiterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waiterData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} tick={{ fill: '#e2e8f0', fontSize: 13 }} />
                  <Tooltip 
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#cbd5e1' }}
                    formatter={(value: any) => [formatBRL(Number(value)), 'Faturamento']}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {waiterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl">
                Sem dados suficientes.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Pizza */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <h2 className="text-xl font-bold text-slate-200 mb-1">Participação nas Vendas</h2>
          <p className="text-slate-400 text-sm mb-6">Porcentagem de faturamento da equipe.</p>
          
          <div className="h-[300px] flex-1">
            {waiterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={waiterData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    fill="#f59e0b"
                  >
                    {waiterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#cbd5e1' }}
                    formatter={(value: any) => [formatBRL(Number(value)), 'Faturamento']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl">
                Sem dados suficientes.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
