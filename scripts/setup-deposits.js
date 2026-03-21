const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

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
  // 1. Financial accounts (treasury)
  await execSQL(`
    CREATE TABLE IF NOT EXISTS public.financial_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'BANK' CHECK (account_type IN ('BANK', 'SAFE_CASH', 'PETTY_CASH')),
      custodian_id UUID REFERENCES public.erp_users(id) ON DELETE SET NULL,
      current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sr_fa" ON public.financial_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY "auth_read_fa" ON public.financial_accounts FOR SELECT TO authenticated USING (true);
  `, 'Created financial_accounts');

  // 2. Investor deposits
  await execSQL(`
    CREATE TABLE IF NOT EXISTS public.investor_deposits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE RESTRICT,
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
      amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
      financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
      deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE public.investor_deposits ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sr_deposits" ON public.investor_deposits FOR ALL TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY "auth_read_deposits" ON public.investor_deposits FOR SELECT TO authenticated USING (true);
  `, 'Created investor_deposits');

  // 3. Seed treasury accounts
  await execSQL(`
    INSERT INTO public.financial_accounts (account_name, account_type) VALUES
      ('CIB Bank', 'BANK'),
      ('QNB Bank', 'BANK')
    ON CONFLICT DO NOTHING;
  `, 'Seeded treasury accounts');

  console.log('\\n🎉 Done!');
}

run().catch(console.error);
