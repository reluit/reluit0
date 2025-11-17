import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running AI Agents table migration...\n');

  try {
    // Check if table already exists
    const { data: tableCheck, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'ai_agents')
      .eq('table_schema', 'public');

    if (checkError) {
      console.error('❌ Error checking table:', checkError.message);
      return;
    }

    if (tableCheck && tableCheck.length > 0) {
      console.log('⚠️  ai_agents table already exists. Skipping migration.\n');
      return;
    }

    // Create the table using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
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

        CREATE INDEX IF NOT EXISTS idx_ai_agents_tenant_id ON public.ai_agents(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON public.ai_agents(status);
        CREATE INDEX IF NOT EXISTS idx_ai_agents_elevenlabs_id ON public.ai_agents(elevenlabs_agent_id);

        ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Service role can manage ai_agents"
          ON public.ai_agents
          FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);

        CREATE POLICY "Authenticated users can read ai_agents"
          ON public.ai_agents
          FOR SELECT
          TO authenticated
          USING (true);

        CREATE TABLE IF NOT EXISTS public.agent_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
          config_key TEXT NOT NULL,
          config_value JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(agent_id, config_key)
        );

        CREATE INDEX IF NOT EXISTS idx_agent_configs_agent_id ON public.agent_configs(agent_id);

        ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;

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
      `,
    });

    if (error) {
      console.error('❌ Migration failed:', error.message);
    } else {
      console.log('✅ Migration completed successfully!\n');
      console.log('Created tables:');
      console.log('  - ai_agents');
      console.log('  - agent_configs');
      console.log('\n✨ You can now create AI agents from the admin dashboard.');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration().catch((error) => {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
});
