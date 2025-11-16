import { NextRequest, NextResponse } from 'next/server';
import { INTEGRATION_CONFIGS, initiateOAuthConnection, connectIntegrationWithApiKey } from '@/lib/composio';
import { getCurrentUser } from '@/lib/auth';
import { getTenantBySlug } from '@/lib/tenants';
import { saveIntegrationConnection } from '@/lib/integrations';

export async function POST(request: NextRequest) {
  try {
    const { integrationId, apiKey, slug } = await request.json();

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get tenant by slug
    if (!slug) {
      return NextResponse.json(
        { error: 'Tenant slug is required' },
        { status: 400 }
      );
    }

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Use user email as Composio user identifier
    const userEmail = user.email;

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

      // Save to database
      await saveIntegrationConnection(
        tenant.id,
        user.id,
        integrationId,
        result.connectionId,
        config.authConfigId,
        { api_key_set: true } // Don't store the actual API key, just flag that it's set
      );

      return NextResponse.json({
        success: true,
        connectionId: result.connectionId,
        status: result.status,
      });

    } else if (config.authType === 'oauth2') {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const callbackUrl = `${siteUrl}/integrations/callback/${integrationId}?slug=${slug}`;

      const result = await initiateOAuthConnection(
        userEmail,
        config.authConfigId,
        callbackUrl
      );

      // Save initial connection record (will be updated after OAuth completes)
      await saveIntegrationConnection(
        tenant.id,
        user.id,
        integrationId,
        result.connectionId,
        config.authConfigId,
        { oauth_initiated: true }
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
