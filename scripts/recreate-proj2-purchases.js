const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

// Drop dependent tables first, then recreate cleanly
const sql = `
  DROP TABLE IF EXISTS public.proj2_purchase_payments CASCADE;
  DROP TABLE IF EXISTS public.proj2_purchase_order_items CASCADE;
  DROP TABLE IF EXISTS public.proj2_purchase_orders CASCADE;

  CREATE TABLE public.proj2_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    code TEXT,
    supplier_id UUID REFERENCES public.proj2_suppliers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ordered',
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    notes TEXT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE public.proj2_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.proj2_purchase_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.proj2_items(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL
  );

  CREATE TABLE public.proj2_purchase_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.proj2_purchase_orders(id) ON DELETE CASCADE,
    vault_id UUID REFERENCES public.proj2_vaults(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

const body = JSON.stringify({ query: sql });
const req = https.request({
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Purchase orders tables recreated cleanly with code column');
    } else {
      console.error('❌', res.statusCode, data);
    }
  });
});
req.write(body);
req.end();
