/**
 * Force remove tools by explicitly clearing and updating agent
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const envFile of envFiles) {
    try {
      const envPath = join(__dirname, '..', envFile);
      const envContent = readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    } catch (error) {}
  }
}

loadEnv();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_0501ka7dedycf07bnww46twsyjh1';
const TOOLS_TO_REMOVE = [
  'tool_4201ka80vssdeb0t3c5e3yr2gqka', // Get_user - currently in use
];

async function getAgent(agentId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
  });
  if (!response.ok) throw new Error(`Failed to get agent: ${response.status}`);
  return await response.json();
}

async function updateAgent(agentId, updateData) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update: ${response.status} ${errorText}`);
  }
  return await response.json();
}

async function deleteTool(toolId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
    method: 'DELETE',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete: ${response.status} ${errorText}`);
  }
  return true;
}

async function main() {
  console.log('Getting agent details...');
  const agent = await getAgent(AGENT_ID);
  console.log('Full agent response:', JSON.stringify(agent, null, 2));
  
  // Handle both camelCase and snake_case API responses
  const conversationConfig = agent.conversationConfig || agent.conversation_config || {};
  const agentConfig = conversationConfig.agent || {};
  const promptConfig = agentConfig.prompt || {};
  
  // Tools can be in prompt.tools (full tool objects) or prompt.tool_ids (just IDs)
  const currentToolIds = promptConfig.tool_ids || [];
  const currentTools = promptConfig.tools || [];
  const toolIdsFromObjects = currentTools.map(t => t.toolId || t.tool_id || t.id || t).filter(Boolean);
  const allToolIds = [...new Set([...currentToolIds, ...toolIdsFromObjects])];
  
  console.log(`\nCurrent tool IDs: ${allToolIds.length > 0 ? allToolIds.join(', ') : '(none)'}`);
  
  // Remove the tools we want to delete
  const newToolIds = allToolIds.filter(id => !TOOLS_TO_REMOVE.includes(id));
  console.log(`New tool IDs (after removal): ${newToolIds.length > 0 ? newToolIds.join(', ') : '(none)'}`);
  
  // Update agent with cleared tools - use tool_ids (not tools) to avoid conflict
  console.log('\nUpdating agent with cleared tools...');
  const ttsConfig = conversationConfig.tts || {};
  
  // Preserve all other config - use snake_case for API
  // Only update tool_ids, not tools array
  await updateAgent(AGENT_ID, {
    conversation_config: {
      agent: {
        ...agentConfig,
        prompt: {
          ...promptConfig,
          tool_ids: [], // Clear tool_ids
          tools: [], // Also clear tools array
        },
      },
      tts: ttsConfig,
    },
  });
  console.log('✓ Agent updated with empty tools array');
  
  // Wait a moment for the update to propagate
  console.log('\nWaiting 2 seconds for update to propagate...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Now try to delete the tools
  console.log('\nAttempting to delete tools...');
  for (const toolId of TOOLS_TO_REMOVE) {
    try {
      console.log(`Deleting ${toolId}...`);
      await deleteTool(toolId);
      console.log(`  ✓ Deleted ${toolId}`);
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error);

