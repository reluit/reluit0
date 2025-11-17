import { NextRequest, NextResponse } from "next/server";
import { getComposioClient } from "@/lib/composio";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";

/**
 * POST /api/composio/execute
 * Proxy endpoint to execute Composio tools from ElevenLabs agents
 * 
 * Note: This endpoint is called by ElevenLabs, not by the user's browser,
 * so we authenticate by looking up the connectionId to verify it belongs to a valid tenant
 * 
 * IMPORTANT: This route handles both /api/composio/execute and /api/composio/execute/
 * to prevent 307 redirects that break ElevenLabs webhook calls
 */
export async function POST(req: NextRequest) {
  // IMPORTANT: This endpoint must NOT redirect (307) as ElevenLabs webhooks
  // may not properly follow redirects with POST bodies. Ensure the URL
  // is called exactly as configured: /api/composio/execute (no trailing slash)
  
  // Log request details to help debug 307 redirects
  const url = req.nextUrl;
  console.log('[Composio Execute] Request received:', {
    pathname: url.pathname,
    method: req.method,
    host: req.headers.get('host'),
    protocol: url.protocol,
    hasBody: !!req.body,
  });
  
  try {
    const body = await req.json();
    const { connectionId, toolName, parameters } = body;

    if (!connectionId || !toolName) {
      return NextResponse.json(
        { error: "connectionId and toolName are required" },
        { status: 400 }
      );
    }

    // Verify connection exists and get tenant info
    const supabase = createSupabaseServiceRoleClient();
    const { data: integration, error: intError } = await supabase
      .from("tenant_integrations")
      .select("tenant_id, user_id, integration_type, is_connected")
      .eq("connection_id", connectionId)
      .eq("is_connected", true)
      .maybeSingle();

    if (intError || !integration) {
      console.error("Invalid or not found connection:", connectionId, intError);
      return NextResponse.json(
        { error: "Invalid connection or connection not found" },
        { status: 404 }
      );
    }

    // Get user email for Composio execution
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("email")
      .eq("user_id", integration.user_id)
      .eq("tenant_id", integration.tenant_id)
      .maybeSingle();

    const userEmail = tenantUser?.email || integration.user_id;

    const composio = getComposioClient();

    // Execute the tool using Composio SDK
    try {
      // Ensure parameters is always an object (never undefined or null)
      const safeParameters = (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) 
        ? parameters 
        : {};
      
      console.log('Executing tool:', { connectionId, toolName, userEmail, parameters: safeParameters });
      
      // Use Composio's tools.execute API
      // Format: tools.execute(toolSlug, ToolExecuteParams)
      // ToolExecuteParams includes:
      // - connectedAccountId (the connection ID)
      // - arguments (the tool parameters)
      // - userId (optional, for no-auth apps)
      // - dangerouslySkipVersionCheck (skip version validation for "latest")
      const result = await composio.tools.execute(toolName, {
        connectedAccountId: connectionId,
        arguments: safeParameters, // Use 'arguments' not 'parameters'
        userId: userEmail, // Optional but recommended
        dangerouslySkipVersionCheck: true, // Allow execution without specifying version
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (execError: any) {
      console.error("Composio execution error:", execError);
      return NextResponse.json(
        {
          success: false,
          error: execError.message || "Failed to execute tool",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in Composio execute endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

