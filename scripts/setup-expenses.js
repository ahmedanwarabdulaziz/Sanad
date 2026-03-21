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
  await execSQL(`
    CREATE TABLE IF NOT EXISTS public.project_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
      expense_name TEXT NOT NULL,
      pricing_type TEXT NOT NULL DEFAULT 'SHARED' CHECK (pricing_type IN ('DUAL','SHARED')),
      company_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      investor_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID','PARTIAL','FUTURE')),
      paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      financial_account_id UUID REFERENCES public.financial_accounts(id),
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      due_date DATE,
      notes TEXT DEFAULT '',
      attachments JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sr_expenses" ON public.project_expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY "auth_read_expenses" ON public.project_expenses FOR SELECT TO authenticated USING (true);
  `, 'Created project_expenses');

  console.log('\\nDone!');
}

run().catch(console.error);
