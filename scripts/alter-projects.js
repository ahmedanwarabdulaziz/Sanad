const https = require('https');
const body = JSON.stringify({
  query: "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS land_area DECIMAL(15,2) DEFAULT 0; ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;"
});
const req = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/vvqwizwncaattcsqnrdu/database/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a',
  },
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('Status:', res.statusCode));
});
req.write(body);
req.end();
