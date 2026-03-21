const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

const sql = "ALTER TABLE public.treasury_transactions DROP CONSTRAINT IF EXISTS treasury_transactions_transaction_type_check; ALTER TABLE public.treasury_transactions ADD CONSTRAINT treasury_transactions_transaction_type_check CHECK (transaction_type IN ('DEPOSIT','TRANSFER','WITHDRAWAL','EXPENSE'));";

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
    if (res.statusCode === 201) { console.log('✅ Updated constraint'); }
    else { console.error('❌', res.statusCode, data); }
  });
});
req.write(body);
req.end();
