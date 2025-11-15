import { NextRequest, NextResponse } from 'next/server';
import { INTEGRATION_CONFIGS, initiateOAuthConnection, connectIntegrationWithApiKey } from '@/lib/composio';

export async function POST(request: NextRequest) {
  try {
    const { integrationId, apiKey } = await request.json();

    // TODO: In production, get user email from Supabase auth
    // const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    // const authHeader = request.headers.get('authorization');
    // const token = authHeader.replace('Bearer ', '');
    // const { data: { user } } = await supabase.auth.getUser(token);
    // const userEmail = user.email;

    // For now: Use a mock user ID for testing
    const userEmail = `test-user-${Date.now()}@example.com`;

    // Get integration config
    const config = INTEGRATION_CONFIGS[integrationId];
    if (!config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    if (!config.authConfigId) {
      return NextResponse.json({
        error: `Integration ${integrationId} not configured. Set NEXT_PUBLIC_${integrationId.toUpperCase()}_AUTH_CONFIG_ID in .env`
      }, { status: 500 });
    }

    // Connect based on auth type
    if (config.authType === 'api_key') {
      if (!apiKey) {
        return NextResponse.json({ error: 'API key required' }, { status: 400 });
      }

      const result = await connectIntegrationWithApiKey(
        userEmail,
        config.authConfigId,
        apiKey
      );

      return NextResponse.json({
        success: true,
        connectionId: result.connectionId,
        status: result.status,
      });

    } else if (config.authType === 'oauth2') {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const callbackUrl = `${siteUrl}/dashboard/integrations?connected=${integrationId}`;

      const result = await initiateOAuthConnection(
        userEmail,
        config.authConfigId,
        callbackUrl
      );

      return NextResponse.json({
        success: true,
        redirectUrl: result.redirectUrl,
        connectionId: result.connectionId,
      });
    }

    return NextResponse.json({ error: 'Invalid auth type' }, { status: 400 });

  } catch (error: any) {
    console.error('Connection error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to connect integration'
    }, { status: 500 });
  }
}
