const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

const body = JSON.stringify({
  query: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='proj2_purchase_orders' ORDER BY ordinal_position;"
});
const req = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/' + PROJECT_REF + '/database/query',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d));
});
req.write(body); req.end();
