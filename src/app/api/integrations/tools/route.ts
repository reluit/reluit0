import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getComposioClient } from '@/lib/composio';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const toolkit = searchParams.get('toolkit');

    if (!toolkit) {
      return NextResponse.json(
        { error: 'Toolkit name is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Use user email as Composio user identifier
    const userId = user.email;

    // Get tools from Composio
    const composio = getComposioClient();
    const toolkitUpper = toolkit.toUpperCase();

    console.log(`[Tools API] Fetching tools for toolkit: ${toolkitUpper}, userId: ${userId}`);
    console.log(`[Tools API] Composio API Key configured: ${!!process.env.NEXT_PUBLIC_COMPOSIO_API_KEY || !!process.env.COMPOSIO_API_KEY}`);

    try {
      // Use the correct Composio API format: composio.tools.get(userId, { toolkits: [...] })
      const tools = await composio.tools.get(userId, {
        toolkits: [toolkitUpper]
      });

      console.log(`[Tools API] Successfully fetched tools. Response type: ${typeof tools}, Is array: ${Array.isArray(tools)}`);
      if (tools && typeof tools === 'object') {
        console.log(`[Tools API] Response keys: ${Object.keys(tools).join(', ')}`);
      }
      if (Array.isArray(tools)) {
        console.log(`[Tools API] Tools count: ${tools.length}`);
      }

      // Handle different response formats
      let toolsArray: any[] = [];

      if (Array.isArray(tools)) {
        toolsArray = tools;
        console.log(`[Tools API] Tools is already an array with ${toolsArray.length} items`);
      } else if (tools && typeof tools === 'object') {
        // Check for common response wrapper formats
        if (Array.isArray((tools as any).data)) {
          toolsArray = (tools as any).data;
          console.log(`[Tools API] Found tools in .data property: ${toolsArray.length} items`);
        } else if (Array.isArray((tools as any).tools)) {
          toolsArray = (tools as any).tools;
          console.log(`[Tools API] Found tools in .tools property: ${toolsArray.length} items`);
        } else if (Array.isArray((tools as any).results)) {
          toolsArray = (tools as any).results;
          console.log(`[Tools API] Found tools in .results property: ${toolsArray.length} items`);
        } else if (Array.isArray((tools as any).items)) {
          toolsArray = (tools as any).items;
          console.log(`[Tools API] Found tools in .items property: ${toolsArray.length} items`);
        } else {
          // Try to find any array property in the response
          const arrayProps = Object.keys(tools).filter(key => Array.isArray((tools as any)[key]));
          if (arrayProps.length > 0) {
            toolsArray = (tools as any)[arrayProps[0]];
            console.log(`[Tools API] Found tools in .${arrayProps[0]} property: ${toolsArray.length} items`);
          } else {
            // If it's an object but not an array, convert to single-item array
            toolsArray = [tools];
            console.log(`[Tools API] Converted single tool object to array`);
          }
        }
      }

      console.log(`[Tools API] Final processed tools array length: ${toolsArray.length}`);
      if (toolsArray.length > 0) {
        console.log(`[Tools API] First tool sample:`, JSON.stringify(toolsArray[0], null, 2));
        
        // Transform tools to extract function.name if needed and filter deprecated
        const transformedTools = toolsArray
          .map((tool: any) => {
            // Handle OpenAI function calling format: { type: "function", function: { name, description, parameters } }
            if (tool.type === 'function' && tool.function) {
              return {
                ...tool,
                name: tool.function.name || tool.name,
                description: tool.function.description || tool.description,
                parameters: tool.function.parameters || tool.parameters,
              };
            }
            return tool;
          })
          .filter((tool: any) => {
            // Filter out deprecated tools
            const description = (tool.description || '').toLowerCase();
            return !description.includes('deprecated');
          });
        
        return NextResponse.json({
          success: true,
          tools: transformedTools,
        });
      } else {
        console.warn(`[Tools API] No tools found for toolkit: ${toolkitUpper}`);
        return NextResponse.json({
          success: true,
          tools: [],
        });
      }

    } catch (composioError: any) {
      console.error('[Tools API] Composio API error:', composioError);
      console.error('[Tools API] Error message:', composioError?.message);
      console.error('[Tools API] Error stack:', composioError?.stack);
      console.error('[Tools API] Full error:', JSON.stringify(composioError, null, 2));
      
      // Return error details for debugging
      return NextResponse.json({
        success: false,
        tools: [],
        error: composioError?.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? composioError?.stack : undefined,
        warning: 'Could not fetch tools from Composio. Please check the server logs for details.',
      }, { status: 200 }); // Return 200 so UI can display the error message
    }

  } catch (error: any) {
    console.error('Failed to fetch tools:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tools', tools: [] },
      { status: 200 } // Return 200 with empty tools instead of 500
    );
  }
}



