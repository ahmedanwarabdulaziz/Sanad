const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

// Check if table exists and show all orders with their codes
const body = JSON.stringify({
  query: "SELECT id, code, status, total_amount, created_at FROM proj2_purchase_orders ORDER BY created_at DESC LIMIT 10;"
});
const req = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/' + PROJECT_REF + '/database/query',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try { console.log(JSON.stringify(JSON.parse(d), null, 2)); } catch { console.log(d); }
  });
});
req.write(body); req.end();
