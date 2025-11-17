import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listKnowledgeBaseDocuments, addKnowledgeBaseDocument } from "@/lib/elevenlabs/agents";

/**
 * GET /api/admin/ai-agents/knowledge-bases/[knowledgeBaseId]/documents
 * List all documents in a knowledge base
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ knowledgeBaseId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { knowledgeBaseId } = await params;
    const documents = await listKnowledgeBaseDocuments(knowledgeBaseId);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-agents/knowledge-bases/[knowledgeBaseId]/documents
 * Add a document (file or URL) to a knowledge base
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
    
    const type = formData.get("type") as string;
    const name = formData.get("name") as string;

    if (type === "url") {
      const url = formData.get("url") as string;
      if (!url || !name) {
        return NextResponse.json(
          { error: "URL and name are required" },
          { status: 400 }
        );
      }

      // For URLs, we need to fetch the content first or pass the URL
      // Based on ElevenLabs API, URLs might need to be handled differently
      // For now, we'll pass the URL as content with type "text"
      const result = await addKnowledgeBaseDocument(knowledgeBaseId, {
        name,
        type: "text",
        content: url,
      });

      return NextResponse.json({ success: true, documentId: result.documentId });
    } else if (type === "file") {
      const file = formData.get("file") as File;
      if (!file || !name) {
        return NextResponse.json(
          { error: "File and name are required" },
          { status: 400 }
        );
      }

      // Convert File to ReadableStream
      // The file.stream() returns a ReadableStream, but we need to ensure it's compatible
      const fileBuffer = await file.arrayBuffer();
      const { Readable } = await import("stream");
      const fileStream = Readable.from(Buffer.from(fileBuffer));

      const result = await addKnowledgeBaseDocument(knowledgeBaseId, {
        name,
        type: "file",
        file: fileStream,
      });

      return NextResponse.json({ success: true, documentId: result.documentId });
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'url' or 'file'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error adding document:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

