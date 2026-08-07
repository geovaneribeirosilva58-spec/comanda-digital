import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearSales() {
  console.log('Apagando vendas...')
  
  // Deletar todas as comandas. Os order_items serão deletados automaticamente por causa do ON DELETE CASCADE.
  // neq uuid invalido é um truque para deletar todos
  const { error } = await supabase
    .from('orders')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) {
    console.error('Erro ao deletar comandas:', error)
  } else {
    console.log('Comandas zeradas com sucesso!')
    
    // Agora precisamos atualizar as mesas para o status 'livre' para que fiquem livres na tela
    const { error: tableError } = await supabase
      .from('tables')
      .update({ status: 'livre' })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (tableError) {
      console.error('Erro ao liberar mesas:', tableError)
    } else {
      console.log('Mesas liberadas com sucesso!')
    }
  }
}

clearSales()
