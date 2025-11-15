import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        *,
        tenant_domains(*),
        agents(*),
        tenant_integrations(*),
        voice_profiles(*)
      `)
      .eq('slug', slug)
      .single();

    if (tenantError) {
      console.error('Tenant fetch error:', tenantError);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get analytics summary
    const { data: analytics } = await supabase
      .from('analytics_events')
      .select('event_type, timestamp, event_data')
      .eq('tenant_id', tenant.id)
      .order('timestamp', { ascending: false })
      .limit(100);

    return NextResponse.json({
      tenant,
      analytics: analytics || []
    });

  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
