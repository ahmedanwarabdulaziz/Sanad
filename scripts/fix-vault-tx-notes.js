const https = require('https');
const TOKEN = 'sbp_2a35f4fc99c707562ad10883b3657b42704c8f0a';
const PROJECT_REF = 'vvqwizwncaattcsqnrdu';

// Fix vault transaction notes that still contain raw UUIDs for purchase orders
const sql = `
  UPDATE proj2_vault_transactions vt
  SET notes = CONCAT('دفعة لفاتورة ', po.code)
  FROM proj2_purchase_orders po
  WHERE vt.ref_type = 'purchase_order'
    AND vt.ref_id = po.id
    AND vt.notes LIKE '%' || po.id::text || '%';
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
      console.log('✅ Vault transaction notes back-filled with PO codes');
    } else {
      console.error('❌', res.statusCode, data);
    }
  });
});
req.write(body);
req.end();
