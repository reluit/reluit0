import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { syncComposioToolsToElevenLabs } from "@/lib/elevenlabs/tools";

/**
 * POST /api/cron/sync-tools
 * Scheduled cron job to sync Composio tools to ElevenLabs for all active tenants
 * 
 * This endpoint is called by Vercel Cron Jobs daily at 2 AM UTC
 * 
 * Security: Verify the request is from Vercel Cron by checking the Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting scheduled tool sync for all tenants...");

    const supabase = createSupabaseServiceRoleClient();

    // Get all tenants with active integrations
    const { data: integrations, error: intError } = await supabase
      .from("tenant_integrations")
      .select(`
        tenant_id,
        user_id,
        integration_type,
        connection_id,
        is_connected,
        tenants!inner(
          id,
          name,
          slug
        )
      `)
      .eq("is_connected", true)
      .not("connection_id", "is", null);

    if (intError) {
      console.error("[Cron] Error fetching integrations:", intError);
      return NextResponse.json(
        { error: "Failed to fetch integrations", details: intError.message },
        { status: 500 }
      );
    }

    if (!integrations || integrations.length === 0) {
      console.log("[Cron] No active integrations found");
      return NextResponse.json({
        success: true,
        message: "No active integrations to sync",
        synced: 0,
        errors: [],
      });
    }

    // Group integrations by tenant_id and user_id
    const tenantUserMap = new Map<string, { tenantId: string; userId: string; integrations: any[] }>();
    
    for (const integration of integrations) {
      const key = `${integration.tenant_id}-${integration.user_id}`;
      if (!tenantUserMap.has(key)) {
        tenantUserMap.set(key, {
          tenantId: integration.tenant_id,
          userId: integration.user_id,
          integrations: [],
        });
      }
      tenantUserMap.get(key)!.integrations.push(integration);
    }

    console.log(`[Cron] Found ${tenantUserMap.size} unique tenant-user combinations to sync`);

    const results: Array<{
      tenantId: string;
      tenantName: string;
      userId: string;
      toolIds: string[];
      errors: string[];
    }> = [];

    // Sync tools for each tenant-user combination
    for (const [key, { tenantId, userId, integrations }] of tenantUserMap) {
      const tenant = integrations[0].tenants;
      const tenantName = tenant?.name || "Unknown";
      
      console.log(`[Cron] Syncing tools for tenant: ${tenantName} (${tenantId}), user: ${userId}`);
      
      try {
        const { toolIds, errors } = await syncComposioToolsToElevenLabs(tenantId, userId);
        
        results.push({
          tenantId,
          tenantName,
          userId,
          toolIds,
          errors,
        });

        if (errors.length > 0) {
          console.warn(`[Cron] Tenant ${tenantName} had ${errors.length} error(s):`, errors);
        } else {
          console.log(`[Cron] Successfully synced ${toolIds.length} tool(s) for tenant ${tenantName}`);
        }
      } catch (error: any) {
        console.error(`[Cron] Error syncing tools for tenant ${tenantName}:`, error);
        results.push({
          tenantId,
          tenantName,
          userId,
          toolIds: [],
          errors: [error.message || "Unknown error"],
        });
      }
    }

    const totalTools = results.reduce((sum, r) => sum + r.toolIds.length, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`[Cron] Sync complete. Synced ${totalTools} tool(s) across ${results.length} tenant(s) with ${totalErrors} error(s)`);

    return NextResponse.json({
      success: true,
      message: `Synced tools for ${results.length} tenant(s)`,
      synced: totalTools,
      errors: totalErrors,
      results,
    });
  } catch (error: any) {
    console.error("[Cron] Fatal error in tool sync:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

