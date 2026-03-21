const https = require('https');

const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

const sql = `
  CREATE TABLE IF NOT EXISTS public.proj2_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.proj2_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.proj2_categories(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
  res.on('data', (c) => data += c);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) { 
        console.log('✅ Created proj2_categories and proj2_items tables successfully'); 
    } else { 
        console.error('❌', res.statusCode, data); 
    }
  });
});
req.write(body);
req.end();
