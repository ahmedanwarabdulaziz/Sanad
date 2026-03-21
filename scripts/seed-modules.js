// Seed default ERP modules via Supabase Management API
const https = require('https');

const sql = `INSERT INTO public.erp_modules (name, slug, icon, sort_order) VALUES 
  ('المبيعات', 'sales', 'PointOfSaleOutlined', 1),
  ('المشتريات', 'purchases', 'ShoppingCartOutlined', 2),
  ('المخزن', 'warehouse', 'WarehouseOutlined', 3),
  ('المحاسبة', 'accounting', 'AccountBalanceOutlined', 4),
  ('الموارد البشرية', 'hr', 'GroupsOutlined', 5)
ON CONFLICT (slug) DO NOTHING;`;

const body = JSON.stringify({ query: sql });

const options = {
  hostname: 'api.supabase.com',
  path: '/v1/projects/vvqwizwncaattcsqnrdu/database/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a',
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(data);
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
