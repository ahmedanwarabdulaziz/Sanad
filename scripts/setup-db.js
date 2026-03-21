// Create Sanad Zayed project module tables via Supabase Management API
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`✅ ${label}`);
          resolve(data);
        } else {
          console.error(`❌ ${label}: ${res.statusCode} - ${data}`);
          reject(new Error(data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  // 1. Enhance projects table (drop old erp_projects, create new projects)
  await execSQL(`
    DROP TABLE IF EXISTS public.user_project_access CASCADE;
    DROP TABLE IF EXISTS public.erp_projects CASCADE;
  `, 'Dropped old erp_projects');

  await execSQL(`
    CREATE TABLE public.projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      location TEXT DEFAULT '',
      project_type TEXT NOT NULL DEFAULT 'custom',
      status TEXT NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'ACTIVE', 'COMPLETED')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sr_projects" ON public.projects FOR ALL TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY "auth_read_projects" ON public.projects FOR SELECT TO authenticated USING (true);
  `, 'Created projects table');

  // 2. Recreate user_project_access with new FK
  await execSQL(`
    CREATE TABLE public.user_project_access (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.erp_users(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, project_id)
    );
    ALTER TABLE public.user_project_access ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sr_proj_access" ON public.user_project_access FOR ALL TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY "auth_read_proj_access" ON public.user_project_access FOR SELECT TO authenticated USING (auth.uid() IN (SELECT auth_id FROM public.erp_users WHERE id = user_id));
  `, 'Created user_project_access');

  // 3. Project stages
  await execSQL(`
    CREATE TABLE public.project_stages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      stage_name TEXT NOT NULL,
      unit_type TEXT NOT NULL DEFAULT 'LAND_METER' CHECK (unit_type IN ('LAND_METER', 'APARTMENT_METER')),
      base_unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sr_stages" ON public.project_stages FOR ALL TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY "auth_read_stages" ON public.project_stages FOR SELECT TO authenticated USING (true);
  `, 'Created project_stages table');

  // 4. Investors table (separate from system users)
  await execSQL(`
    CREATE TABLE public.investors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      national_id TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sr_investors" ON public.investors FOR ALL TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY "auth_read_investors" ON public.investors FOR SELECT TO authenticated USING (true);
  `, 'Created investors table');

  // 5. Investor contracts
  await execSQL(`
    CREATE TABLE public.investor_contracts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE RESTRICT,
      stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE RESTRICT,
      unit_quantity DECIMAL(15,2) NOT NULL DEFAULT 0,
      unit_price_at_contract DECIMAL(15,2) NOT NULL DEFAULT 0,
      management_fee_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
      total_contract_value DECIMAL(15,2) GENERATED ALWAYS AS (
        unit_quantity * unit_price_at_contract * (1 + management_fee_pct / 100)
      ) STORED,
      contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SETTLED', 'CANCELLED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE public.investor_contracts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "sr_contracts" ON public.investor_contracts FOR ALL TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY "auth_read_contracts" ON public.investor_contracts FOR SELECT TO authenticated USING (true);
  `, 'Created investor_contracts table');

  // 6. Seed "Sanad Zayed" project
  await execSQL(`
    INSERT INTO public.projects (name, slug, description, location, status)
    VALUES ('سند زايد', 'sanad-zayed', 'مشروع سند زايد الاستثماري', 'زايد - الجيزة', 'ACTIVE')
    ON CONFLICT (slug) DO NOTHING;
  `, 'Seeded Sanad Zayed project');

  // Verify
  const result = await execSQL(`SELECT name, slug, status FROM public.projects;`, 'Verify projects');
  console.log('\n📋 Projects:', result);

  console.log('\n🎉 All tables created successfully!');
}

run().catch(console.error);
