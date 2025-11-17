/**
 * Script to delete all tools from ElevenLabs
 * Run with: node scripts/delete-all-tools.mjs
 * 
 * Make sure ELEVENLABS_API_KEY is set in your environment or .env.local file
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env.local or .env file
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

/**
 * List all tools from ElevenLabs
 */
async function listAllTools() {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list tools: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    let tools = [];
    if (Array.isArray(data)) {
      tools = data;
    } else if (data.tools && Array.isArray(data.tools)) {
      tools = data.tools;
    } else if (data.data && Array.isArray(data.data)) {
      tools = data.data;
    }

    return tools;
  } catch (error) {
    console.error('Error listing tools:', error);
    throw error;
  }
}

/**
 * Delete a tool from ElevenLabs
 */
async function deleteTool(toolId) {
  try {
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
  } catch (error) {
    console.error(`Error deleting tool ${toolId}:`, error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Fetching all tools from ElevenLabs...');
  
  const tools = await listAllTools();
  console.log(`Found ${tools.length} tool(s) to delete\n`);

  if (tools.length === 0) {
    console.log('No tools to delete.');
    return;
  }

  // Display tools that will be deleted
  console.log('Tools to be deleted:');
  tools.forEach((tool, index) => {
    const toolName = tool.tool_config?.name || tool.name || tool.id;
    const toolId = tool.id || tool.tool_id;
    console.log(`  ${index + 1}. ${toolName} (${toolId})`);
  });
  console.log('');

  // Delete each tool
  let successCount = 0;
  let errorCount = 0;

  for (const tool of tools) {
    const toolId = tool.id || tool.tool_id;
    const toolName = tool.tool_config?.name || tool.name || toolId;
    
    try {
      console.log(`Deleting: ${toolName} (${toolId})...`);
      await deleteTool(toolId);
      console.log(`  ✓ Successfully deleted: ${toolName}`);
      successCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ✗ Failed to delete: ${toolName} - ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total tools: ${tools.length}`);
  console.log(`Successfully deleted: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

