import { elevenlabsClient } from "./client";

export interface Voice {
  voiceId: string;
  name: string;
  category?: string;
  description?: string;
  previewUrl?: string;
  settings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
}

/**
 * Get all available voices from ElevenLabs
 */
export async function getAvailableVoices(): Promise<Voice[]> {
  const voicesResult = await elevenlabsClient.voices.search();

  // Handle both array and object responses
  const voices = Array.isArray(voicesResult) ? voicesResult : (voicesResult as any).voices || [];

  return voices.map((voice: any) => ({
    voiceId: voice.voiceId || voice.voice_id,
    name: voice.name,
    category: voice.category,
    description: voice.description,
    previewUrl: voice.previewUrl,
    settings: voice.settings,
  }));
}

/**
 * Get a specific voice by ID
 */
export async function getVoiceById(voiceId: string): Promise<Voice | null> {
  const voices = await getAvailableVoices();
  return voices.find((v) => v.voiceId === voiceId) || null;
}
