const https = require('https');
require('dotenv').config({ path: '.env.local' });
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || '';

function execSQL(sql, label) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode === 201) { console.log('✅', label); resolve(data); }
        else { console.error('❌', label, res.statusCode, data); reject(new Error(data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  await execSQL(`
    CREATE TABLE IF NOT EXISTS public.treasury_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'TRANSFER', 'WITHDRAWAL')),
      from_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
      to_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
      amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
      description TEXT DEFAULT '',
      reference_type TEXT DEFAULT NULL,
      reference_id UUID DEFAULT NULL,
      transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sr_tt" ON public.treasury_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY "auth_read_tt" ON public.treasury_transactions FOR SELECT TO authenticated USING (true);
  `, 'Created treasury_transactions');

  console.log('\\nDone!');
}

run().catch(console.error);
