import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { getElevenLabsAgent } from "@/lib/elevenlabs/agents";
import { ELEVENLABS_API_KEY } from "@/lib/elevenlabs/client";

/**
 * GET /api/tenant/agent
 * Get the current tenant's agent data
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

    // Get the first agent for this tenant
    const { data: agent } = await supabase
      .from("ai_agents")
      .select("id, name, elevenlabs_agent_id, language")
      .eq("tenant_id", tenantUser.tenant_id)
      .not("elevenlabs_agent_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (!agent || !agent.elevenlabs_agent_id) {
      return NextResponse.json({ error: "No agent found for tenant" }, { status: 404 });
    }

    // Fetch agent data from ElevenLabs
    try {
      const elevenLabsAgent = await getElevenLabsAgent(agent.elevenlabs_agent_id);
      
      if (!elevenLabsAgent.conversationConfig) {
        return NextResponse.json(
          { error: "Agent configuration not found" },
          { status: 404 }
        );
      }
      
      const config = elevenLabsAgent.conversationConfig;
      
      // Get voice name from voice ID
      let voiceName = "Unknown Voice";
      try {
        if (config.tts?.voiceId) {
          const voicesResponse = await fetch(
            `https://api.elevenlabs.io/v1/voices/${config.tts.voiceId}`,
            {
              headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
              },
            }
          );
          if (voicesResponse.ok) {
            const voiceData = await voicesResponse.json();
            voiceName = voiceData.name || voiceName;
          }
        }
      } catch (error) {
        console.error("Error fetching voice:", error);
      }

      return NextResponse.json({
        agent: {
          id: agent.id,
          name: agent.name,
          language: agent.language || config.agent?.language || "en",
          prompt: config.agent?.prompt?.prompt || "",
          firstMessage: config.agent?.firstMessage || "",
          voiceId: config.tts?.voiceId || "",
          voiceName: voiceName,
        },
      });
    } catch (error) {
      console.error("Error fetching ElevenLabs agent:", error);
      return NextResponse.json(
        { error: "Failed to fetch agent data from ElevenLabs" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching tenant agent:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

