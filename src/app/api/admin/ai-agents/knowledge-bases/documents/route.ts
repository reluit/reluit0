import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ELEVENLABS_API_KEY } from "@/lib/elevenlabs/client";

/**
 * GET /api/admin/ai-agents/knowledge-bases/documents
 * List all knowledge base documents from ElevenLabs
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const pageSize = searchParams.get("page_size") || "100";
    const search = searchParams.get("search") || null;
    const cursor = searchParams.get("cursor") || null;

    // Build query string
    const queryParams = new URLSearchParams();
    if (pageSize) queryParams.append("page_size", pageSize);
    if (search) queryParams.append("search", search);
    if (cursor) queryParams.append("cursor", cursor);

    // Call ElevenLabs API directly
    const url = `https://api.elevenlabs.io/v1/convai/knowledge-base${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    
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
        { error: "Failed to fetch knowledge base documents", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ 
      documents: data.documents || [],
      nextCursor: data.next_cursor || null,
      hasMore: data.has_more || false,
    });
  } catch (error) {
    console.error("Error fetching knowledge base documents:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

