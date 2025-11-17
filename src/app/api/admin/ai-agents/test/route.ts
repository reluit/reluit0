import { NextResponse } from "next/server";
import { elevenlabsClient, ELEVENLABS_API_KEY } from "@/lib/elevenlabs/client";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    // Verify admin authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if API key is set
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        {
          error: "ELEVENLABS_API_KEY not configured",
          hasApiKey: false,
        },
        { status: 400 }
      );
    }

    // Try to list voices as a test
    try {
      const voices = await elevenlabsClient.voices.search();
      return NextResponse.json({
        success: true,
        hasApiKey: true,
        voicesCount: Array.isArray(voices) ? voices.length : (voices as any).voices?.length || 0,
        message: "API key is valid and working",
      });
    } catch (apiError) {
      console.error("ElevenLabs API error:", apiError);
      return NextResponse.json({
        error: "API key may be invalid or insufficient permissions",
        hasApiKey: true,
        details: apiError instanceof Error ? apiError.message : "Unknown error",
      },
      { status: 400 });
    }
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
