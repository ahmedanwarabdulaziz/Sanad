import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setupRolesTable() {
  console.log('🔧 Setting up erp_users table...\n');

  // Create the table using Supabase's built-in SQL execution
  // We'll use the REST API to create the table structure
  
  // Step 1: Try to create a record to test if table exists
  const { error: testError } = await supabase
    .from('erp_users')
    .select('id')
    .limit(1);

  if (testError && testError.message.includes('does not exist')) {
    console.log('❌ Table "erp_users" does not exist yet.');
    console.log('');
    console.log('Please run the following SQL in your Supabase Dashboard → SQL Editor:');
    console.log('='.repeat(70));
    console.log(`
CREATE TABLE public.erp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auth_id),
  UNIQUE(email)
);

ALTER TABLE public.erp_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.erp_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own profile" ON public.erp_users
  FOR SELECT TO authenticated USING (auth.uid() = auth_id);

INSERT INTO public.erp_users (auth_id, email, name, role)
VALUES (
  '414ea74d-0a4a-43b8-8e66-fc16c086475d',
  'a@a.com',
  'Super Admin',
  'super_admin'
);
    `);
    console.log('='.repeat(70));
    console.log('\nAfter running the SQL, run this script again to verify.');
    return;
  }

  console.log('✅ Table "erp_users" exists!');

  // Check if super admin exists
  const { data: existing } = await supabase
    .from('erp_users')
    .select('*')
    .eq('email', 'a@a.com')
    .single();

  if (existing) {
    console.log(`✅ Super admin already exists: ${existing.email} (role: ${existing.role})`);
  } else {
    // Insert super admin
    const { data, error } = await supabase
      .from('erp_users')
      .insert({
        auth_id: '414ea74d-0a4a-43b8-8e66-fc16c086475d',
        email: 'a@a.com',
        name: 'Super Admin',
        role: 'super_admin',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to insert super admin:', error.message);
    } else {
      console.log(`✅ Super admin created: ${data.email} (role: ${data.role})`);
    }
  }
}

setupRolesTable().catch(console.error);
