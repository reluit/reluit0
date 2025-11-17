import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ELEVENLABS_API_KEY } from "@/lib/elevenlabs/client";

/**
 * POST /api/admin/ai-agents/knowledge-bases/[knowledgeBaseId]/documents/file
 * Add a file document to a knowledge base using ElevenLabs API
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
    const formData = await req.formData();
    
    const file = formData.get("file") as File;
    const name = formData.get("name") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Create FormData for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append("file", file);
    if (name) {
      elevenLabsFormData.append("name", name);
    }

    // Call ElevenLabs API directly
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/knowledge-base/file",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: elevenLabsFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: "Failed to upload file to knowledge base", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    console.error("Error uploading file document:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

