import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ELEVENLABS_API_KEY } from "@/lib/elevenlabs/client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";

/**
 * GET /api/tenant/conversations/[conversationId]
 * Get detailed conversation data including audio URL and transcript from ElevenLabs
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
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
      return NextResponse.json({ error: "No agents found for tenant" }, { status: 404 });
    }

    const agentIds = agents.map(a => a.elevenlabs_agent_id).filter(Boolean) as string[];

    // Get full conversation details from ElevenLabs
    const convResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!convResponse.ok) {
      const errorText = await convResponse.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch conversation", details: errorText },
        { status: convResponse.status }
      );
    }

    const conversation = await convResponse.json();

    // Verify conversation belongs to tenant's agent
    if (!agentIds.includes(conversation.agent_id)) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Return proxy endpoint for audio (handles authentication server-side)
    const audioUrl = `/api/tenant/conversations/${conversationId}/audio`;

    // Parse transcript into messages
    const messages = (conversation.transcript || []).map((item: any, index: number) => {
      const timeInCall = item.time_in_call_secs || 0;
      const minutes = Math.floor(timeInCall / 60);
      const seconds = timeInCall % 60;
      const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Get message text from either message or multivoice_message
      let messageText = item.message || "";
      if (!messageText && item.multivoice_message?.parts) {
        messageText = item.multivoice_message.parts
          .map((part: any) => part.text)
          .join(" ");
      }

      return {
        id: `msg-${index}`,
        speaker: item.role === "agent" ? "ai" : "user",
        text: messageText || "",
        timestamp: timestamp,
        timeInCallSecs: timeInCall,
        toolCalls: item.tool_calls || [],
        toolResults: item.tool_results || [],
        interrupted: item.interrupted || false,
        feedback: item.feedback || null,
      };
    });

    return NextResponse.json({
      conversation: {
        id: conversation.conversation_id,
        agentId: conversation.agent_id,
        startTime: conversation.metadata?.start_time_unix_secs,
        duration: conversation.metadata?.call_duration_secs || 0,
        status: conversation.status,
        callSuccessful: conversation.analysis?.call_successful,
        transcriptSummary: conversation.analysis?.transcript_summary,
        callSummaryTitle: conversation.analysis?.call_summary_title,
        rating: conversation.metadata?.feedback?.rating,
        direction: conversation.metadata?.phone_call?.direction,
        cost: conversation.metadata?.cost,
        charging: conversation.metadata?.charging,
        hasAudio: conversation.has_audio,
        hasUserAudio: conversation.has_user_audio,
        hasResponseAudio: conversation.has_response_audio,
      },
      messages,
      audioUrl,
    });
  } catch (error) {
    console.error("Error fetching conversation details:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

