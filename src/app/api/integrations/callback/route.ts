import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTenantBySlug } from '@/lib/tenants';
import { getIntegrationByConnectionId, saveIntegrationConnection } from '@/lib/integrations';
import { getConnectedAccount } from '@/lib/composio';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/clients';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // Composio may return connectionId in different param names
    const connectionId = searchParams.get('connectionId') || searchParams.get('connection_id') || searchParams.get('id');
    const slug = searchParams.get('slug') || searchParams.get('state');
    const integrationId = searchParams.get('integrationId') || searchParams.get('integration_id');

    // If connectionId not in URL, try to get from database using slug and integrationId
    let finalConnectionId = connectionId;
    
    if (!finalConnectionId && slug && integrationId) {
      // Try to find the most recent connection for this tenant/integration
      const tenant = await getTenantBySlug(slug);
      if (tenant) {
        const user = await getCurrentUser();
        if (user) {
          const supabase = createSupabaseServiceRoleClient();
          const { data } = await supabase
            .from("tenant_integrations")
            .select("connection_id, is_connected")
            .eq("tenant_id", tenant.id)
            .eq("user_id", user.id)
            .eq("integration_type", integrationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (data?.connection_id) {
            finalConnectionId = data.connection_id;
            // If already connected in database, just return success
            if (data.is_connected) {
              return NextResponse.json({
                success: true,
                connectionId: finalConnectionId,
                status: 'ACTIVE',
                message: 'Connection already established',
              });
            }
          }
        }
      }
    }

    if (!finalConnectionId || !slug || !integrationId) {
      return NextResponse.json(
        { error: 'Missing required parameters. Please try connecting again.' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get tenant by slug
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get connection details from Composio
    let connection;
    try {
      connection = await getConnectedAccount(finalConnectionId);
    } catch (error: any) {
      console.error('Error fetching connection from Composio:', error);
      // If we can't fetch from Composio, check if it's already saved in database
      const existingIntegration = await getIntegrationByConnectionId(finalConnectionId);
      if (existingIntegration && existingIntegration.is_connected) {
        // Connection already exists and is marked as connected in database
        return NextResponse.json({
          success: true,
          connectionId: finalConnectionId,
          status: 'ACTIVE',
          message: 'Connection already established',
        });
      }
      throw new Error('Failed to verify connection with Composio');
    }
    
    // Accept ACTIVE, INITIATED, or any status that indicates the connection was attempted
    // The connection might be in various states during OAuth flow
    const invalidStatuses = ['FAILED', 'EXPIRED', 'INACTIVE'];
    if (!connection || invalidStatuses.includes(connection.status || '')) {
      return NextResponse.json(
        { error: `Connection not completed. Status: ${connection?.status || 'unknown'}` },
        { status: 400 }
      );
    }

    // Update or create integration record
    await saveIntegrationConnection(
      tenant.id,
      user.id,
      integrationId,
      finalConnectionId,
      undefined, // authConfigId will be preserved from initial record
      {
        oauth_completed: true,
        connected_at: new Date().toISOString(),
        connection_status: connection.status || 'ACTIVE',
      }
    );

    return NextResponse.json({
      success: true,
      connectionId: finalConnectionId,
      status: connection.status,
    });

  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete connection' },
      { status: 500 }
    );
  }
}

