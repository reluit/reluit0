-- Migration: Create ai_agents table
-- This table stores AI agents created via ElevenLabs for each tenant

CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  agent_type TEXT DEFAULT 'voice' CHECK (agent_type IN ('voice', 'chat', 'hybrid')),
  elevenlabs_agent_id TEXT UNIQUE NOT NULL,
  voice_profile_id TEXT,
  system_prompt TEXT,
  first_message TEXT,
  language TEXT DEFAULT 'en',
  model_id TEXT,
  knowledge_base_id TEXT,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'testing')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_agents_tenant_id ON public.ai_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON public.ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_elevenlabs_id ON public.ai_agents(elevenlabs_agent_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to access all records
CREATE POLICY "Service role can manage ai_agents"
  ON public.ai_agents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to read records
CREATE POLICY "Authenticated users can read ai_agents"
  ON public.ai_agents
  FOR SELECT
  TO authenticated
  USING (true);

-- Optional: Add agent_configs table for storing agent-specific configurations
CREATE TABLE IF NOT EXISTS public.agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, config_key)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_agent_configs_agent_id ON public.agent_configs(agent_id);

-- Enable RLS
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage agent_configs"
  ON public.agent_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read agent_configs"
  ON public.agent_configs
  FOR SELECT
  TO authenticated
  USING (true);
