const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

const sql = `
ALTER TABLE public.project_stages ADD COLUMN IF NOT EXISTS total_area DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.project_stages ADD COLUMN IF NOT EXISTS management_percentage DECIMAL(5,2) DEFAULT 0;
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
    if (res.statusCode === 201) { console.log('✅ Added total_area and management_percentage columns'); }
    else { console.error('❌', res.statusCode, data); }
  });
});
req.write(body);
req.end();
