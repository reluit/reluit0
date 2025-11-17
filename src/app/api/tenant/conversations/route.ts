import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ELEVENLABS_API_KEY } from "@/lib/elevenlabs/client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";

/**
 * GET /api/tenant/conversations
 * Get conversations from ElevenLabs for the current tenant's agents
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // Get tenant for current user
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get all agents for this tenant
    const { data: agents } = await supabase
      .from("ai_agents")
      .select("elevenlabs_agent_id")
      .eq("tenant_id", tenantUser.tenant_id)
      .not("elevenlabs_agent_id", "is", null);

    if (!agents || agents.length === 0) {
      return NextResponse.json({ conversations: [], hasMore: false });
    }

    const agentIds = agents.map(a => a.elevenlabs_agent_id).filter(Boolean) as string[];

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const pageSize = searchParams.get("page_size") || "30";
    const cursor = searchParams.get("cursor") || null;
    const agentId = searchParams.get("agent_id") || null;
    const callSuccessful = searchParams.get("call_successful") || null;
    const callStartBefore = searchParams.get("call_start_before_unix") || null;
    const callStartAfter = searchParams.get("call_start_after_unix") || null;
    const callDurationMin = searchParams.get("call_duration_min_secs") || null;
    const callDurationMax = searchParams.get("call_duration_max_secs") || null;
    const search = searchParams.get("search") || null;

    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append("page_size", pageSize);
    
    // If specific agent requested, use it; otherwise fetch for all tenant agents
    if (agentId && agentIds.includes(agentId)) {
      queryParams.append("agent_id", agentId);
    }
    
    if (cursor) queryParams.append("cursor", cursor);
    if (callSuccessful) queryParams.append("call_successful", callSuccessful);
    if (callStartBefore) queryParams.append("call_start_before_unix", callStartBefore);
    if (callStartAfter) queryParams.append("call_start_after_unix", callStartAfter);
    if (callDurationMin) queryParams.append("call_duration_min_secs", callDurationMin);
    if (callDurationMax) queryParams.append("call_duration_max_secs", callDurationMax);
    if (search) queryParams.append("search", search);

    // Fetch conversations from ElevenLabs
    // Note: We'll need to make multiple requests if no specific agent is requested
    // For now, let's fetch for the first agent or all if we can filter by multiple
    const url = `https://api.elevenlabs.io/v1/convai/conversations?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch conversations", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Filter conversations to only include those from tenant's agents
    const filteredConversations = data.conversations?.filter((conv: any) => 
      agentIds.includes(conv.agent_id)
    ) || [];

    return NextResponse.json({
      conversations: filteredConversations,
      nextCursor: data.next_cursor || null,
      hasMore: data.has_more || false,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

