const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

const sql = `
  -- Expense category groups (predefined names per project)
  CREATE TABLE IF NOT EXISTS public.proj2_expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name TEXT NOT NULL,
    expense_type TEXT NOT NULL DEFAULT 'general', -- 'purchase' | 'sale' | 'general'
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Individual expense records
  CREATE TABLE IF NOT EXISTS public.proj2_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    code TEXT,
    category_id UUID REFERENCES public.proj2_expense_categories(id) ON DELETE SET NULL,
    expense_type TEXT NOT NULL DEFAULT 'general', -- 'purchase' | 'sale' | 'general'
    purchase_order_id UUID REFERENCES public.proj2_purchase_orders(id) ON DELETE SET NULL,
    description TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'future', -- 'immediate' | 'advance' | 'future'
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    vault_id UUID REFERENCES public.proj2_vaults(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
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
      console.log('✅ proj2_expense_categories and proj2_expenses tables created');
    } else {
      console.error('❌', res.statusCode, data);
    }
  });
});
req.write(body);
req.end();
