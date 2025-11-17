# ElevenLabs AI Agents Integration

This document describes the integration of ElevenLabs conversational AI agents into the Reluit admin dashboard.

## Overview

The admin dashboard now supports creating and managing AI agents powered by ElevenLabs. These agents can be assigned to tenants and configured with custom prompts, voices, and behaviors.

## Features

- ✅ Create conversational AI agents via ElevenLabs API
- ✅ Manage agents from the admin dashboard
- ✅ Assign agents to specific tenants
- ✅ Configure voice, language, and model settings
- ✅ Update agent behavior and system prompts
- ✅ Delete agents when no longer needed

## Setup

### 1. Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

You can get your API key from the [ElevenLabs Dashboard](https://elevenlabs.io/app/speech-synthesis/voice-lab).

### 2. Database Migration

Run the migration to create the necessary database tables:

```bash
# Using the TypeScript migration script
npx tsx scripts/migrate-ai-agents.ts

# Or manually via Supabase SQL editor
# Copy the contents of scripts/create-ai-agents-table.sql and run it in Supabase
```

### 3. Verify Installation

The `@elevenlabs/elevenlabs-js` package is already installed as a dependency.

## Usage

### Creating an AI Agent

1. Navigate to the admin dashboard: `/admin`
2. Click on the **AI Agents** icon in the left sidebar
3. Click **Create Agent** button
4. Fill in the agent configuration:
   - **Tenant**: Select which tenant this agent belongs to
   - **Agent Name**: Give your agent a descriptive name
   - **System Prompt**: Define the agent's behavior and personality
   - **First Message**: Set the initial greeting
   - **Voice**: Choose from available ElevenLabs voices
   - **Language**: Select the primary language
   - **Model**: Choose the TTS model (Turbo, Flash, or Multilingual)
5. Click **Create Agent**

### Managing Agents

From the AI Agents page, you can:

- **View all agents**: See a list of all created agents with their status
- **Edit agents**: Click "Manage" to update agent configuration
- **Delete agents**: Use the delete button to remove agents
- **Filter by status**: Agents can be active, inactive, or in testing

### API Endpoints

#### List all agents

```http
GET /api/admin/ai-agents
```

Response:
```json
{
  "agents": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Customer Support Agent",
      "agent_type": "voice",
      "elevenlabs_agent_id": "string",
      "voice_profile_id": "string",
      "system_prompt": "string",
      "first_message": "string",
      "language": "en",
      "status": "active",
      "created_at": "2025-11-16T...",
      ...
    }
  ],
  "elevenLabsAgents": [...]
}
```

#### Create a new agent

```http
POST /api/admin/ai-agents
Content-Type: application/json

{
  "tenantId": "uuid",
  "name": "Customer Support Agent",
  "prompt": "You are a helpful customer support agent...",
  "firstMessage": "Hello! How can I help you today?",
  "voiceId": "voice_id_here",
  "language": "en",
  "modelId": "eleven_turbo_v2_5"
}
```

#### Get agent details

```http
GET /api/admin/ai-agents/{agentId}
```

#### Update agent

```http
PATCH /api/admin/ai-agents/{agentId}
Content-Type: application/json

{
  "name": "Updated Name",
  "prompt": "Updated system prompt",
  "firstMessage": "New greeting",
  "voiceId": "new_voice_id",
  "status": "active"
}
```

#### Delete agent

```http
DELETE /api/admin/ai-agents/{agentId}
```

#### Get available voices

```http
GET /api/admin/ai-agents/voices
```

## Architecture

### Database Schema

#### `ai_agents` table

Stores AI agents with the following key fields:

- `id`: Unique identifier
- `tenant_id`: Reference to the owning tenant
- `name`: Human-readable name
- `agent_type`: Type of agent (voice, chat, hybrid)
- `elevenlabs_agent_id`: ID from ElevenLabs API
- `voice_profile_id`: Voice ID from ElevenLabs
- `system_prompt`: Agent behavior configuration
- `first_message`: Initial greeting
- `language`: Primary language code
- `status`: Current status (active, inactive, testing)
- `metadata`: Additional configuration as JSON

#### `agent_configs` table

Stores additional configuration for agents:

- `id`: Unique identifier
- `agent_id`: Reference to the agent
- `config_key`: Configuration key
- `config_value`: Configuration value (JSON)

### File Structure

```
src/lib/elevenlabs/
├── client.ts       # ElevenLabs client initialization
├── agents.ts       # Agent management utilities
└── voices.ts       # Voice listing utilities

src/app/api/admin/ai-agents/
├── route.ts                    # List/create agents
├── [agentId]/
│   └── route.ts               # Get/update/delete agent
└── voices/
    └── route.ts               # List available voices

src/app/admin/ai-agents/
├── page.tsx                   # List all agents
├── [agentId]/
│   └── page.tsx              # Manage specific agent
└── new/
    └── page.tsx              # Create new agent
```

## Available Voices

The integration fetches all available voices from your ElevenLabs account, including:

- Pre-built voices
- Custom cloned voices
- Professional voice clones

## Models

You can choose from several TTS models:

- **eleven_turbo_v2_5**: Fast generation, good quality
- **eleven_flash_v2_5**: Ultra-low latency, best for real-time
- **eleven_multilingual_v2**: Highest quality, supports 29+ languages

## Knowledge Bases

Agents can be associated with knowledge bases to provide more contextual responses. This can be configured by adding a `knowledgeBaseId` when creating an agent.

## Best Practices

1. **Test agents thoroughly**: Use the testing status before deploying to production
2. **Keep prompts concise**: Long prompts can affect performance
3. **Choose appropriate voices**: Match the voice to your brand and use case
4. **Monitor usage**: Track agent performance and usage metrics
5. **Regular updates**: Update agent prompts and configuration based on feedback

## Troubleshooting

### Common Issues

**"Voice not found" error**
- Verify the voice ID is correct
- Ensure your ElevenLabs API key has access to the voice

**"Failed to save agent to database"**
- Check database connectivity
- Verify the tenant ID exists

**ElevenLabs API errors**
- Verify your API key is correct
- Check your ElevenLabs subscription status
- Ensure you have sufficient credits

### Debugging

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=elevenlabs:* npm run dev
```

## Security Considerations

- The ElevenLabs API key should be kept secure and never exposed to the client
- All API routes are protected and require admin authentication
- RLS policies are in place to protect data at the database level
- Agent metadata should not contain sensitive information

## Limitations

- Requires a valid ElevenLabs Pro subscription for conversational AI agents
- Agent creation is limited by your ElevenLabs account quotas
- Real-time conversations require WebSocket/WebRTC implementation (not included in this integration)

## Support

For issues related to:
- **ElevenLabs API**: Contact ElevenLabs support
- **This integration**: Create an issue in the repository
- **Database**: Check Supabase documentation

## License

MIT License - see LICENSE file for details
