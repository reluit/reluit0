import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedTenants() {
  console.log('🌱 Seeding tenants...\n');

  const tenants = [
    {
      name: 'Partnership',
      slug: 'partnership',
      branding: {
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        logo: '/logo.png'
      },
      metadata: {
        plan: 'enterprise',
        features: ['voice', 'analytics', 'integrations']
      }
    },
    {
      name: 'Tenant 1',
      slug: 'tenant1',
      branding: {
        primaryColor: '#3b82f6',
        secondaryColor: '#ffffff',
        logo: '/logo.png'
      },
      metadata: {
        plan: 'professional',
        features: ['voice', 'analytics']
      }
    },
    {
      name: 'Tenant 2',
      slug: 'tenant2',
      branding: {
        primaryColor: '#10b981',
        secondaryColor: '#ffffff',
        logo: '/logo.png'
      },
      metadata: {
        plan: 'professional',
        features: ['voice', 'analytics', 'integrations']
      }
    }
  ];

  for (const tenant of tenants) {
    console.log(`Creating tenant: ${tenant.name} (${tenant.slug})`);

    const { data, error } = await supabase
      .from('tenants')
      .insert(tenant)
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating tenant ${tenant.slug}:`, error.message);
      continue;
    }

    console.log(`✅ Created tenant: ${tenant.slug} (${data.id})`);

    // Create subdomain entry
    const { error: domainError } = await supabase
      .from('tenant_domains')
      .insert({
        tenant_id: data.id,
        domain: `${tenant.slug}.reluit.com`,
        subdomain: tenant.slug,
        type: 'subdomain',
        is_primary: true,
        connected: true
      });

    if (domainError) {
      console.error(`❌ Error creating domain for ${tenant.slug}:`, domainError.message);
    } else {
      console.log(`✅ Created domain: ${tenant.slug}.reluit.com`);
    }

    console.log('');
  }

  console.log('✨ Seeding complete!');
}

seedTenants().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
