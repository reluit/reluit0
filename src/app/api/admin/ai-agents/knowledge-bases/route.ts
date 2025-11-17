import { NextRequest, NextResponse } from "next/server";
import { listKnowledgeBases, createKnowledgeBase } from "@/lib/elevenlabs/agents";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/admin/ai-agents/knowledge-bases
 * Get all available knowledge bases from ElevenLabs
 */
export async function GET() {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await listKnowledgeBases();

    return NextResponse.json({ knowledgeBases: result.knowledgeBases || [] });
  } catch (error) {
    console.error("Error fetching knowledge bases:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-agents/knowledge-bases
 * Create a new knowledge base
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const result = await createKnowledgeBase(name, description || "");

    return NextResponse.json({ knowledgeBaseId: result.knowledgeBaseId });
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
