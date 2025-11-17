import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ELEVENLABS_API_KEY } from "@/lib/elevenlabs/client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";

/**
 * GET /api/tenant/conversations/[conversationId]/audio
 * Proxy audio from ElevenLabs with authentication
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

    // Verify conversation belongs to tenant and check if it has audio
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
      return NextResponse.json({ error: "Failed to verify conversation" }, { status: convResponse.status });
    }

    const conversation = await convResponse.json();

    // Verify conversation belongs to tenant's agent
    if (!agentIds.includes(conversation.agent_id)) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check if conversation has audio
    if (!conversation.has_audio) {
      return NextResponse.json({ error: "No audio available for this conversation" }, { status: 404 });
    }

    // Fetch audio from ElevenLabs API directly
    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        // Don't follow redirects automatically - we'll handle them
        redirect: "manual",
      }
    );

    // Handle redirects (3xx status codes)
    if (audioResponse.status >= 300 && audioResponse.status < 400) {
      const redirectUrl = audioResponse.headers.get("location");
      if (redirectUrl) {
        // Follow the redirect and stream directly
        const redirectResponse = await fetch(redirectUrl, {
          method: "GET",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
        });

        if (!redirectResponse.ok) {
          const errorText = await redirectResponse.text();
          console.error("ElevenLabs audio redirect error:", errorText);
          return NextResponse.json(
            { error: "Failed to fetch audio from redirect URL", details: errorText },
            { status: redirectResponse.status }
          );
        }

        // Stream the response body directly without buffering
        const contentType = redirectResponse.headers.get("content-type") || "audio/mpeg";
        const contentLength = redirectResponse.headers.get("content-length");
        
        return new NextResponse(redirectResponse.body, {
          headers: {
            "Content-Type": contentType,
            ...(contentLength && { "Content-Length": contentLength }),
            "Cache-Control": "public, max-age=3600",
            "Accept-Ranges": "bytes",
          },
        });
      }
    }

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error("ElevenLabs audio API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch audio", details: errorText },
        { status: audioResponse.status }
      );
    }

    // Stream the response body directly without buffering to avoid truncation
    const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";
    const contentLength = audioResponse.headers.get("content-length");
    
    return new NextResponse(audioResponse.body, {
      headers: {
        "Content-Type": contentType,
        ...(contentLength && { "Content-Length": contentLength }),
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Error fetching conversation audio:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

