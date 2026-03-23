const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: itemRows } = await supabase.from('proj2_items').select('id, project_id, name').eq('name', 'لوت');
  
  if (!itemRows || itemRows.length === 0) {
    console.log('No lot items found');
    return;
  }

  for (const item of itemRows) {
    const { data: sales } = await supabase
      .from('proj2_sale_items')
      .select('quantity, unit_price, sale:proj2_sales!inner(project_id, sale_date)')
      .eq('item_id', item.id);
      
    console.log(`Project ${item.project_id}: sales count = ${sales?.length}`);
    if (sales?.length) console.log(JSON.stringify(sales[0]));
  }
}

check().catch(console.error);
