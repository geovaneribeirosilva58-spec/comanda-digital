import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function run() {
  const { data, error } = await supabase.from('table_calls').select('id').limit(1)
  console.log('SELECT result:', { data, error })

  const { data: insertData, error: insertError } = await supabase.from('table_calls').insert({
    table_id: 'c9f0003f-763f-42e5-ad82-446714a93863', // a random UUID, it might fail FK check but we'll see the error code
    status: 'pendente'
  }).select()
  console.log('INSERT result:', { insertData, insertError })
}
run()
