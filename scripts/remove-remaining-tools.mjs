/**
 * Script to remove remaining tools from agents and delete them
 * Run with: node scripts/remove-remaining-tools.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
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
    } catch (error) {
      // File doesn't exist, continue
    }
  }
}

loadEnv();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

// Tools that are still in use and need to be removed
const TOOLS_TO_REMOVE = [
  'tool_5801ka7xgyy6fe99f2ydyjvk2ad1', // List_events
  'tool_8301ka7xgyh9fj6samzgqrtbkcbs', // Get_user
];

/**
 * List all agents
 */
async function listAllAgents() {
  const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list agents: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  let agents = [];
  if (Array.isArray(data)) {
    agents = data;
  } else if (data.agents && Array.isArray(data.agents)) {
    agents = data.agents;
  } else if (data.data && Array.isArray(data.data)) {
    agents = data.data;
  }

  return agents;
}

/**
 * Get agent details
 */
async function getAgent(agentId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get agent: ${response.status} ${errorText}`);
  }

  return await response.json();
}

/**
 * Update agent to remove specific tools
 */
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
    throw new Error(`Failed to update agent: ${response.status} ${errorText}`);
  }

  return await response.json();
}

/**
 * Delete a tool
 */
async function deleteTool(toolId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
    method: 'DELETE',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete tool ${toolId}: ${response.status} ${errorText}`);
  }

  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('Fetching all agents...');
  const agents = await listAllAgents();
  console.log(`Found ${agents.length} agent(s)\n`);

  // Find agents that use the tools we want to remove
  const agentsToUpdate = [];
  
  for (const agent of agents) {
    const agentId = agent.agentId || agent.id || agent.agent_id;
    const agentName = agent.name || agentId;
    
    if (!agentId) {
      console.log(`Skipping agent - no ID found:`, JSON.stringify(agent, null, 2));
      continue;
    }
    
    console.log(`Checking agent: ${agentName} (${agentId})...`);
    
    try {
      const agentDetails = await getAgent(agentId);
      const tools = agentDetails.conversationConfig?.agent?.tools || [];
      const toolIds = tools.map(t => t.toolId || t.id || t).filter(Boolean);
      
      // Check if this agent uses any of the tools we want to remove
      const toolsToRemove = toolIds.filter(id => TOOLS_TO_REMOVE.includes(id));
      
      if (toolsToRemove.length > 0) {
        console.log(`  Agent uses ${toolsToRemove.length} tool(s) that need to be removed: ${toolsToRemove.join(', ')}`);
        agentsToUpdate.push({
          agentId,
          agentName,
          currentToolIds: toolIds,
          toolsToRemove,
        });
      } else {
        console.log(`  Agent doesn't use any tools to remove`);
      }
    } catch (error) {
      console.error(`  Error checking agent: ${error.message}`);
    }
  }

  console.log(`\nFound ${agentsToUpdate.length} agent(s) that need to be updated\n`);

  // Remove tools from agents
  for (const agentInfo of agentsToUpdate) {
    const { agentId, agentName, currentToolIds, toolsToRemove } = agentInfo;
    const newToolIds = currentToolIds.filter(id => !toolsToRemove.includes(id));
    
    console.log(`Removing tools from agent: ${agentName} (${agentId})`);
    console.log(`  Removing: ${toolsToRemove.join(', ')}`);
    console.log(`  Remaining tools: ${newToolIds.length}`);
    
    try {
      // Get current agent config to preserve other settings
      const agentDetails = await getAgent(agentId);
      const currentConfig = agentDetails.conversationConfig || {};
      
      await updateAgent(agentId, {
        conversationConfig: {
          ...currentConfig,
          agent: {
            ...currentConfig.agent,
            tools: newToolIds.length > 0 ? newToolIds.map(id => ({ toolId: id })) : [],
          },
        },
      });
      console.log(`  ✓ Successfully updated agent\n`);
    } catch (error) {
      console.error(`  ✗ Failed to update agent: ${error.message}\n`);
    }
  }

  // Now delete the tools
  console.log('\nDeleting tools...\n');
  for (const toolId of TOOLS_TO_REMOVE) {
    try {
      console.log(`Deleting tool: ${toolId}...`);
      await deleteTool(toolId);
      console.log(`  ✓ Successfully deleted\n`);
    } catch (error) {
      console.error(`  ✗ Failed to delete: ${error.message}\n`);
    }
  }

  console.log('Done!');
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

