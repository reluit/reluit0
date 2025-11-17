import { NextRequest, NextResponse } from "next/server";
import { createElevenLabsAgent, listElevenLabsAgents } from "@/lib/elevenlabs/agents";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";
import { getCurrentUser } from "@/lib/auth";
import { getVoiceById } from "@/lib/elevenlabs/voices";
import { syncComposioToolsToElevenLabs } from "@/lib/elevenlabs/tools";

/**
 * GET /api/admin/ai-agents
 * List all AI agents (both from ElevenLabs and local database)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Fetch agents from our database
    const { data: dbAgents, error: dbError } = await supabase
      .from("ai_agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch agents from database" },
        { status: 500 }
      );
    }

    // Fetch agents from ElevenLabs
    const elevenLabsAgents = await listElevenLabsAgents({ pageSize: 100 });

    return NextResponse.json({
      agents: dbAgents || [],
      elevenLabsAgents: elevenLabsAgents || [],
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-agents
 * Create a new AI agent
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      tenantId,
      name,
      prompt,
      firstMessage,
      voiceId,
      language = "en",
      modelId = "eleven_turbo_v2",
      knowledgeBaseId,
    } = body;

    console.log("Creating agent with data:", { tenantId, name, voiceId, language, modelId });

    // Validate required fields
    if (!tenantId || !name || !prompt || !firstMessage || !voiceId) {
      console.error("Missing required fields:", { tenantId, name, prompt, firstMessage, voiceId });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate model for English language
    if (language === "en" && !["eleven_turbo_v2", "eleven_flash_v2"].includes(modelId)) {
      console.error("Invalid model for English:", modelId);
      return NextResponse.json(
        { error: "English agents must use 'eleven_turbo_v2' or 'eleven_flash_v2' model" },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const supabase = createSupabaseServiceRoleClient();
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error("Tenant not found:", tenantId, tenantError);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    console.log("Tenant verified:", tenant.name);

    // Verify voice exists in ElevenLabs
    console.log("Checking voice:", voiceId);
    const voice = await getVoiceById(voiceId);
    if (!voice) {
      console.error("Voice not found:", voiceId);
      return NextResponse.json({ error: "Voice not found" }, { status: 404 });
    }

    console.log("Voice verified:", voice.name);

    // Sync Composio tools first (before creating agent so we can include them)
    let toolIds: string[] = [];
    try {
      // Get tenant owner/user to fetch their connected apps
      const { data: tenantUsers } = await supabase
        .from("tenant_users")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .limit(1);

      if (tenantUsers && tenantUsers.length > 0) {
        const userId = tenantUsers[0].user_id;
        console.log("Syncing Composio tools for user:", userId);
        
        const syncResult = await syncComposioToolsToElevenLabs(tenantId, userId);
        toolIds = syncResult.toolIds;
        
        if (toolIds.length > 0) {
          console.log(`Successfully created ${toolIds.length} tools in ElevenLabs`);
        }
        
        if (syncResult.errors.length > 0) {
          console.warn("Some tools failed to sync:", syncResult.errors);
        }
      }
    } catch (toolError) {
      // Don't fail agent creation if tool syncing fails
      console.error("Error syncing Composio tools:", toolError);
    }

    // Create agent in ElevenLabs
    console.log("Creating agent in ElevenLabs...");
    let elevenLabsAgentId;
    try {
      const result = await createElevenLabsAgent({
        name,
        tenantId,
        agent: {
          prompt,
          firstMessage,
          language,
          knowledgeBaseId,
          toolIds: toolIds.length > 0 ? toolIds : undefined,
        },
        tts: {
          voiceId,
          modelId,
        },
      });
      elevenLabsAgentId = result.agentId;
      console.log("ElevenLabs agent created:", elevenLabsAgentId);
    } catch (elevenError) {
      console.error("ElevenLabs API error:", elevenError);
      return NextResponse.json(
        { error: `Failed to create agent in ElevenLabs: ${elevenError instanceof Error ? elevenError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Save agent to our database
    console.log("Saving to database...");
    const { data: dbAgent, error: dbError } = await supabase
      .from("ai_agents")
      .insert({
        tenant_id: tenantId,
        name,
        agent_type: "voice",
        elevenlabs_agent_id: elevenLabsAgentId,
        voice_profile_id: voiceId,
        system_prompt: prompt,
        first_message: firstMessage,
        language,
        model_id: modelId,
        knowledge_base_id: knowledgeBaseId || null,
        status: "active",
        metadata: {
          elevenlabs_model_id: modelId,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: `Failed to save agent to database: ${dbError.message}` },
        { status: 500 }
      );
    }

    console.log("Agent created successfully:", dbAgent.id);

    // Store tool IDs in metadata if we created any
    if (toolIds.length > 0) {
      await supabase
        .from("ai_agents")
        .update({
          metadata: {
            ...dbAgent.metadata,
            composio_tool_ids: toolIds,
          },
        })
        .eq("id", dbAgent.id);
    }

    return NextResponse.json({
      agent: dbAgent,
      elevenLabsAgentId,
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
