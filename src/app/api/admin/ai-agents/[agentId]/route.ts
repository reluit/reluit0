import { NextRequest, NextResponse } from "next/server";
import {
  getElevenLabsAgent,
  updateElevenLabsAgent,
  deleteElevenLabsAgent,
} from "@/lib/elevenlabs/agents";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/admin/ai-agents/[agentId]
 * Get details of a specific AI agent
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    // Fetch from our database with tenant info
    const supabase = createSupabaseServiceRoleClient();
    const { data: dbAgent, error: dbError } = await supabase
      .from("ai_agents")
      .select(`
        *,
        tenants(
          id,
          name,
          slug
        )
      `)
      .eq("id", agentId)
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      console.error("Agent ID searched:", agentId);
      return NextResponse.json({ 
        error: "Agent not found",
        details: dbError.message 
      }, { status: 404 });
    }

    if (!dbAgent) {
      console.error("No agent found for ID:", agentId);
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Fetch from ElevenLabs if agent ID exists
    let elevenLabsAgent = null;
    if (dbAgent.elevenlabs_agent_id) {
    try {
      elevenLabsAgent = await getElevenLabsAgent(dbAgent.elevenlabs_agent_id);
    } catch (error) {
      console.error("ElevenLabs error:", error);
        // Don't fail if ElevenLabs fetch fails, just log it
      }
    }

    return NextResponse.json({
      agent: dbAgent,
      elevenLabsAgent,
    });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ai-agents/[agentId]
 * Update an AI agent
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;
    const body = await req.json();
    const {
      name,
      prompt,
      firstMessage,
      voiceId,
      modelId,
      language,
      status,
      knowledgeBaseId,
    } = body;

    const supabase = createSupabaseServiceRoleClient();

    // Fetch current agent
    const { data: currentAgent, error: fetchError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (fetchError || !currentAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Update in ElevenLabs if agent ID exists
    if (currentAgent.elevenlabs_agent_id && (prompt || firstMessage || voiceId || modelId || name || language || knowledgeBaseId)) {
      try {
      await updateElevenLabsAgent(currentAgent.elevenlabs_agent_id, {
        name,
        prompt,
        firstMessage,
        voiceId,
        modelId,
          language,
          knowledgeBaseId,
      });
      } catch (error) {
        console.error("Error updating ElevenLabs agent:", error);
        // Continue with database update even if ElevenLabs fails
      }
    }

    // Update in our database
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name) updateData.name = name;
    if (prompt) updateData.system_prompt = prompt;
    if (firstMessage) updateData.first_message = firstMessage;
    if (voiceId) updateData.voice_profile_id = voiceId;
    if (modelId) updateData.model_id = modelId;
    if (language) updateData.language = language;
    if (status) updateData.status = status;
    if (knowledgeBaseId !== undefined) updateData.knowledge_base_id = knowledgeBaseId || null;

    const { data: updatedAgent, error: dbError } = await supabase
      .from("ai_agents")
      .update(updateData)
      .eq("id", agentId)
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to update agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent: updatedAgent });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ai-agents/[agentId]
 * Delete an AI agent
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;

    const supabase = createSupabaseServiceRoleClient();

    // Fetch agent to get ElevenLabs ID
    const { data: agent, error: fetchError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Delete from ElevenLabs if agent ID exists
    if (agent.elevenlabs_agent_id) {
    try {
      await deleteElevenLabsAgent(agent.elevenlabs_agent_id);
    } catch (error) {
      console.error("ElevenLabs deletion error:", error);
        // Continue with database deletion even if ElevenLabs fails
      }
    }

    // Delete from our database
    const { error: dbError } = await supabase
      .from("ai_agents")
      .delete()
      .eq("id", agentId);

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to delete agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
