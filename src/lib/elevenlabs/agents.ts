import { elevenlabsClient } from "./client";

export interface CreateAgentParams {
  name: string;
  tenantId: string;
  agent: {
    prompt: string;
    firstMessage: string;
    language: string;
    knowledgeBaseId?: string;
    toolIds?: string[];
  };
  tts: {
    voiceId: string;
    modelId?: string;
  };
}

export interface Agent {
  agentId: string;
  name?: string;
  conversationConfig?: {
    agent?: {
      prompt?: {
        prompt: string;
      };
      firstMessage?: string;
      language?: string;
      knowledgeBase?: {
        knowledgeBaseId: string;
      };
    };
    tts?: {
      voiceId: string;
      modelId?: string;
    };
  };
}

export interface ListAgentsParams {
  pageSize?: number;
}

/**
 * Create a new conversational AI agent with ElevenLabs
 */
export async function createElevenLabsAgent(
  params: CreateAgentParams
): Promise<{ agentId: string }> {
  const agentConfig: any = {
    name: params.name,
    conversationConfig: {
      agent: {
        prompt: {
          prompt: params.agent.prompt,
        },
        firstMessage: params.agent.firstMessage,
        language: params.agent.language,
        ...(params.agent.knowledgeBaseId && {
          knowledgeBase: {
            knowledgeBaseId: params.agent.knowledgeBaseId,
          },
        }),
        ...(params.agent.toolIds && params.agent.toolIds.length > 0 && {
          tools: params.agent.toolIds.map(toolId => ({ toolId })),
        }),
      },
      tts: {
        voiceId: params.tts.voiceId,
        // For English agents, use turbo_v2 or flash_v2 (without the _5 suffix)
        // Map any v2_5 versions to v2, or use the provided modelId directly
        modelId: (params.tts.modelId 
          ? params.tts.modelId.replace("_v2_5", "_v2")
          : "eleven_turbo_v2") as any,
      },
    },
  };

  const agent = await elevenlabsClient.conversationalAi.agents.create(agentConfig);

  return { agentId: agent.agentId };
}

/**
 * List all agents from ElevenLabs
 */
export async function listElevenLabsAgents(
  params?: ListAgentsParams
): Promise<{ agents: { name: string; agentId: string }[] }> {
  return await elevenlabsClient.conversationalAi.agents.list({
    pageSize: params?.pageSize || 20,
  });
}

/**
 * Get details of a specific agent
 */
export async function getElevenLabsAgent(
  agentId: string
): Promise<Agent> {
  const agent = await elevenlabsClient.conversationalAi.agents.get(agentId);
  return agent as unknown as Agent;
}

/**
 * Update an existing agent
 */
export async function updateElevenLabsAgent(
  agentId: string,
  updates: {
    name?: string;
    prompt?: string;
    firstMessage?: string;
    voiceId?: string;
    modelId?: string;
    language?: string;
    knowledgeBaseId?: string;
    toolIds?: string[];
  }
): Promise<{ success: boolean }> {
  const updateData: any = {};

  if (updates.name) {
    updateData.name = updates.name;
  }

  if (
    updates.prompt ||
    updates.firstMessage ||
    updates.language ||
    updates.knowledgeBaseId ||
    updates.toolIds
  ) {
    updateData.conversationConfig = {
      agent: {},
    };

    if (updates.prompt) {
      updateData.conversationConfig.agent.prompt = {
        prompt: updates.prompt,
      };
    }

    if (updates.firstMessage) {
      updateData.conversationConfig.agent.firstMessage = updates.firstMessage;
    }

    if (updates.language) {
      updateData.conversationConfig.agent.language = updates.language;
    }

    if (updates.knowledgeBaseId) {
      updateData.conversationConfig.agent.knowledgeBase = {
        knowledgeBaseId: updates.knowledgeBaseId,
      };
    }

    if (updates.toolIds && updates.toolIds.length > 0) {
      updateData.conversationConfig.agent.tools = updates.toolIds.map(toolId => ({ toolId }));
    }
  }

  if (updates.voiceId || updates.modelId) {
    updateData.conversationConfig = updateData.conversationConfig || {
      agent: {},
    };
    updateData.conversationConfig.tts = {};

    if (updates.voiceId) {
      updateData.conversationConfig.tts.voiceId = updates.voiceId;
    }

    if (updates.modelId) {
      updateData.conversationConfig.tts.modelId = updates.modelId as any;
    }
  }

  await elevenlabsClient.conversationalAi.agents.update(agentId, updateData);

  return { success: true };
}

/**
 * Delete an agent
 */
export async function deleteElevenLabsAgent(
  agentId: string
): Promise<{ success: boolean }> {
  await elevenlabsClient.conversationalAi.agents.delete(agentId);
  return { success: true };
}

/**
 * Create a knowledge base for an agent
 */
export async function createKnowledgeBase(
  name: string,
  description: string
): Promise<{ knowledgeBaseId: string }> {
  const kb = await (elevenlabsClient as any).conversationalAi.knowledgeBase.create({
    name,
    description,
  });

  return { knowledgeBaseId: kb.knowledgeBaseId };
}

/**
 * Add a document to a knowledge base
 */
export async function addKnowledgeBaseDocument(
  knowledgeBaseId: string,
  params: {
    name: string;
    type: "text" | "file";
    content?: string;
    file?: NodeJS.ReadableStream;
  }
): Promise<{ documentId: string }> {
  const doc = await (elevenlabsClient as any).conversationalAi.knowledgeBase.documents.add(
    knowledgeBaseId,
    params
  );

  return { documentId: doc.documentId };
}

/**
 * List documents in a knowledge base
 */
export async function listKnowledgeBaseDocuments(
  knowledgeBaseId: string
): Promise<any[]> {
  const docs = await (elevenlabsClient as any).conversationalAi.knowledgeBase.documents.list(
    knowledgeBaseId
  );

  return docs;
}

/**
 * List all knowledge bases
 */
export async function listKnowledgeBases(): Promise<{ knowledgeBases: { knowledgeBaseId: string; name: string; description?: string }[] }> {
  const result = await (elevenlabsClient as any).conversationalAi.knowledgeBase.list();
  return result;
}
