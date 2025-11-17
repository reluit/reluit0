import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ELEVENLABS_API_KEY } from "@/lib/elevenlabs/client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { listKnowledgeBases, updateElevenLabsAgent } from "@/lib/elevenlabs/agents";

/**
 * POST /api/admin/ai-agents/knowledge-bases/documents/text
 * Add a text document to a knowledge base using ElevenLabs API and link to agent
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, name, agentId } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Call ElevenLabs API directly
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/knowledge-base/text",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          name: name || null,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: "Failed to add text document to knowledge base", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // If agentId is provided, ensure agent has knowledge base set
    if (agentId) {
      const supabase = createSupabaseServiceRoleClient();
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("knowledge_base_id, elevenlabs_agent_id")
        .eq("id", agentId)
        .single();

      if (agent && agent.elevenlabs_agent_id) {
        // Get first available knowledge base
        const kbResult = await listKnowledgeBases();
        if (kbResult.knowledgeBases && kbResult.knowledgeBases.length > 0) {
          const firstKB = kbResult.knowledgeBases[0];
          
          // Update agent in ElevenLabs to use this knowledge base
          if (!agent.knowledge_base_id || agent.knowledge_base_id !== firstKB.knowledgeBaseId) {
            await updateElevenLabsAgent(agent.elevenlabs_agent_id, {
              knowledgeBaseId: firstKB.knowledgeBaseId,
            });
            
            // Update database
            await supabase
              .from("ai_agents")
              .update({ knowledge_base_id: firstKB.knowledgeBaseId })
              .eq("id", agentId);
          }
        }
      }
    }

    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    console.error("Error adding text document:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

