import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { syncComposioToolsToElevenLabs, getElevenLabsTool } from "@/lib/elevenlabs/tools";
import { updateElevenLabsAgent } from "@/lib/elevenlabs/agents";

/**
 * GET /api/tenant/agent/tools
 * Get tools for the current tenant's agent
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseServiceRoleClient();
    
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get the first agent for this tenant
    const { data: agents } = await supabase
      .from("ai_agents")
      .select("id, elevenlabs_agent_id, metadata")
      .eq("tenant_id", tenantUser.tenant_id)
      .not("elevenlabs_agent_id", "is", null)
      .limit(1);

    if (!agents || agents.length === 0 || !agents[0].elevenlabs_agent_id) {
      return NextResponse.json({ error: "No agent found for tenant" }, { status: 404 });
    }

    const agent = agents[0];
    const toolIds = (agent.metadata as any)?.composio_tool_ids || [];

    // Fetch tool details from ElevenLabs
    const toolsWithDetails = await Promise.all(
      toolIds.map(async (toolId: string) => {
        const toolDetails = await getElevenLabsTool(toolId);
        return toolDetails || { id: toolId, name: `Tool ${toolId.slice(0, 8)}...`, description: "" };
      })
    );

    return NextResponse.json({
      tools: toolsWithDetails,
      toolIds,
      agentId: agent.elevenlabs_agent_id,
    });
  } catch (error) {
    console.error("Error fetching agent tools:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/agent/tools
 * Manually sync Composio tools and update the agent
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseServiceRoleClient();
    
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get the first agent for this tenant
    const { data: agents } = await supabase
      .from("ai_agents")
      .select("id, elevenlabs_agent_id, metadata")
      .eq("tenant_id", tenantUser.tenant_id)
      .not("elevenlabs_agent_id", "is", null)
      .limit(1);

    if (!agents || agents.length === 0 || !agents[0].elevenlabs_agent_id) {
      return NextResponse.json({ error: "No agent found for tenant" }, { status: 404 });
    }

    const agent = agents[0];
    const elevenLabsAgentId = agents[0].elevenlabs_agent_id;

    // Sync Composio tools
    const { toolIds, errors } = await syncComposioToolsToElevenLabs(
      tenantUser.tenant_id,
      user.id
    );

    if (toolIds.length > 0) {
      // Update agent in ElevenLabs to include tools
      try {
        await updateElevenLabsAgent(elevenLabsAgentId, {
          toolIds: toolIds,
        });
      } catch (updateError) {
        console.warn("Could not update agent with tools:", updateError);
      }

      // Update agent metadata with new tool IDs
      await supabase
        .from("ai_agents")
        .update({
          metadata: {
            ...((agent.metadata as any) || {}),
            composio_tool_ids: toolIds,
          },
        })
        .eq("id", agent.id);
    }

    return NextResponse.json({
      success: toolIds.length > 0 || errors.length === 0,
      toolIds,
      errors: errors.length > 0 ? errors : undefined,
      message: toolIds.length > 0 
        ? `Successfully synced ${toolIds.length} tool(s)`
        : errors.length > 0
        ? `Failed to sync tools: ${errors.join('; ')}`
        : "No tools found to sync. Make sure you have connected integrations with available tools.",
    });
  } catch (error) {
    console.error("Error syncing tools:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

