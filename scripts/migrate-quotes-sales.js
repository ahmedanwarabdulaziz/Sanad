const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

const sql = `
  CREATE TABLE IF NOT EXISTS public.proj2_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name TEXT NOT NULL,
    phones TEXT[] DEFAULT '{}',
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.proj2_price_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    code TEXT NOT NULL,
    customer_id UUID REFERENCES public.proj2_customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    status TEXT NOT NULL DEFAULT 'draft',
    total_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.proj2_price_quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.proj2_price_quotes(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.proj2_items(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL
  );

  CREATE TABLE IF NOT EXISTS public.proj2_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    code TEXT NOT NULL,
    customer_id UUID REFERENCES public.proj2_customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    quote_id UUID REFERENCES public.proj2_price_quotes(id) ON DELETE SET NULL,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.proj2_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.proj2_sales(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.proj2_items(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL
  );

  CREATE TABLE IF NOT EXISTS public.proj2_sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.proj2_sales(id) ON DELETE CASCADE,
    vault_id UUID REFERENCES public.proj2_vaults(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE public.proj2_expenses ADD COLUMN IF NOT EXISTS sale_order_ids UUID[] DEFAULT '{}';
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
      console.log('✅ Quotes & Sales tables created, sale_order_ids column added');
    } else {
      console.error('❌', res.statusCode, data);
    }
  });
});
req.write(body);
req.end();
