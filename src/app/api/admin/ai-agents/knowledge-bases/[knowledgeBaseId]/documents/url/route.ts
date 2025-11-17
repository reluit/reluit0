import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ELEVENLABS_API_KEY } from "@/lib/elevenlabs/client";

/**
 * POST /api/admin/ai-agents/knowledge-bases/[knowledgeBaseId]/documents/url
 * Add a URL document to a knowledge base using ElevenLabs API
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ knowledgeBaseId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { knowledgeBaseId } = await params;
    const body = await req.json();
    const { url, name } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Call ElevenLabs API directly
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/knowledge-base/url",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          name: name || null,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: "Failed to add URL to knowledge base", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    console.error("Error adding URL document:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

