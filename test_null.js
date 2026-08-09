require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: order, error: err1 } = await supabase.from('orders').select('id, table_id').limit(1).single();
  if (err1) { console.error('fetch err', err1); return; }
  
  const { data: updateData, error: err2 } = await supabase.from('orders').update({ table_id: null }).eq('id', order.id).select();
  if (err2) { 
    console.error('update err:', err2.message); 
    return; 
  }
  console.log('SUCCESS: table_id can be null');

  // Restore
  await supabase.from('orders').update({ table_id: order.table_id }).eq('id', order.id);
}
run();
