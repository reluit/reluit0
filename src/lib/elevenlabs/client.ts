import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getRequiredServerEnv } from "../env";

// Initialize ElevenLabs client with API key from environment
const ELEVENLABS_API_KEY = getRequiredServerEnv("ELEVENLABS_API_KEY");

export const elevenlabsClient = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// Export the client for use in other modules
export { ELEVENLABS_API_KEY };
