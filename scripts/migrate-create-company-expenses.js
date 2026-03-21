const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

const sql = `
CREATE TABLE IF NOT EXISTS public.company_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (type IN ('EXPENSE', 'PROFIT_DISTRIBUTION')),
  expense_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.company_expenses
  FOR ALL USING (true) WITH CHECK (true);
`;

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
    if (res.statusCode === 201) { console.log('✅ Created company_expenses table'); }
    else { console.error('❌', res.statusCode, data); }
  });
});
req.write(body);
req.end();
