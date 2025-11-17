import { NextResponse } from "next/server";
import { getAvailableVoices } from "@/lib/elevenlabs/voices";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/admin/ai-agents/voices
 * Get all available voices from ElevenLabs
 */
export async function GET() {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const voices = await getAvailableVoices();

    return NextResponse.json({ voices });
  } catch (error) {
    console.error("Error fetching voices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
