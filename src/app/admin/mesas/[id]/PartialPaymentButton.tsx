'use client'

import { Button } from '@/components/ui/button'
import { Banknote } from 'lucide-react'
import { addPartialPaymentServer } from '@/app/garcom/actions'

export default function PartialPaymentButton({ orderId, remainingTotal, tableId }: { orderId: string, remainingTotal: number, tableId: string }) {
  const handlePayment = async () => {
    const amountStr = prompt(`QUAL O VALOR DO PAGAMENTO PARCIAL?\n\nFalta receber: R$ ${remainingTotal.toFixed(2)}\n\nDigite o valor usando ponto (ex: 50.00):`)
    if (!amountStr) return
    const amount = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      alert("Valor inválido!")
      return
    }

    try {
      await addPartialPaymentServer(orderId, amount, tableId)
    } catch (error: any) {
      alert(error.message || 'Erro ao processar pagamento.')
    }
  }

  return (
    <Button 
      onClick={handlePayment}
      variant="secondary"
      size="sm"
      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold"
    >
      <Banknote className="w-4 h-4 mr-2" />
      Receber Parcial
    </Button>
  )
}
