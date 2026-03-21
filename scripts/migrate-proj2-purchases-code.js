const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

const sql = `
  -- Add code column if not exists
  ALTER TABLE public.proj2_purchase_orders
    ADD COLUMN IF NOT EXISTS code TEXT;

  -- Back-fill NULL codes for any existing rows
  UPDATE public.proj2_purchase_orders po
  SET code = 'PO-' || LPAD(
    (SELECT COUNT(*) FROM public.proj2_purchase_orders po2
     WHERE po2.project_id = po.project_id AND po2.created_at <= po.created_at)::text,
    3, '0'
  )
  WHERE code IS NULL;
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
      console.log('✅ code column ensured and back-filled');
    } else {
      console.error('❌', res.statusCode, data);
    }
  });
});
req.write(body); req.end();
