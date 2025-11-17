import { addDays, startOfDay, subDays } from "date-fns";

import { createSupabaseServerClient } from "./supabase/clients";
import { createSupabaseServiceRoleClient } from "./supabase/clients";
import { ELEVENLABS_API_KEY } from "./elevenlabs/client";

export interface CallSession {
  id: string;
  started_at: string;
  duration_seconds: number;
  cost_credits: number;
  llm_cost_usd: number;
  was_successful: boolean;
  status: string;
  agent?: {
    id: string;
    name: string;
    role: string | null;
  } | null;
}

export interface CallMetricsSummary {
  totalCalls: number;
  averageDurationSeconds: number;
  totalDurationSeconds: number;
  totalCostCredits: number;
  averageCostCredits: number;
  totalLlmCostUsd: number;
  averageLlmCostUsdPerCall: number;
  averageLlmCostUsdPerMinute: number;
  successRate: number;
}

export interface TimelinePoint {
  date: string;
  callCount: number;
}

export interface AgentCallSummary {
  agentId: string;
  name: string;
  role: string | null;
  callCount: number;
  totalDurationSeconds: number;
  totalCostCredits: number;
}

export interface TenantDashboardData {
  summary: CallMetricsSummary;
  timeline: TimelinePoint[];
  topAgents: AgentCallSummary[];
  sessions: CallSession[];
  rangeStart: string;
  rangeEnd: string;
}

export interface DashboardRangeOptions {
  days?: number;
  endDate?: Date;
}

function calculateSummary(sessions: CallSession[]): CallMetricsSummary {
  if (sessions.length === 0) {
    return {
      totalCalls: 0,
      averageDurationSeconds: 0,
      totalDurationSeconds: 0,
      totalCostCredits: 0,
      averageCostCredits: 0,
      totalLlmCostUsd: 0,
      averageLlmCostUsdPerCall: 0,
      averageLlmCostUsdPerMinute: 0,
      successRate: 0,
    };
  }

  const totals = sessions.reduce(
    (acc, session) => {
      acc.totalDurationSeconds += session.duration_seconds;
      acc.totalCostCredits += Number(session.cost_credits ?? 0);
      acc.totalLlmCostUsd += Number(session.llm_cost_usd ?? 0);
      acc.successfulCalls += session.was_successful ? 1 : 0;
      return acc;
    },
    {
      totalDurationSeconds: 0,
      totalCostCredits: 0,
      totalLlmCostUsd: 0,
      successfulCalls: 0,
    }
  );

  const totalCalls = sessions.length;
  const averageDurationSeconds = totals.totalDurationSeconds / totalCalls;
  const averageCostCredits = totals.totalCostCredits / totalCalls;
  const averageLlmCostUsdPerCall = totals.totalLlmCostUsd / totalCalls;
  const totalDurationMinutes = totals.totalDurationSeconds / 60 || 1; // avoid division by zero
  const averageLlmCostUsdPerMinute = totals.totalLlmCostUsd / totalDurationMinutes;
  const successRate = totals.successfulCalls / totalCalls;

  return {
    totalCalls,
    averageDurationSeconds,
    totalDurationSeconds: totals.totalDurationSeconds,
    totalCostCredits: totals.totalCostCredits,
    averageCostCredits,
    totalLlmCostUsd: totals.totalLlmCostUsd,
    averageLlmCostUsdPerCall,
    averageLlmCostUsdPerMinute,
    successRate,
  };
}

function buildTimeline(sessions: CallSession[], rangeStart: Date, rangeEnd: Date): TimelinePoint[] {
  const days: Record<string, number> = {};
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);

  for (let day = start; day <= end; day = addDays(day, 1)) {
    days[day.toISOString().slice(0, 10)] = 0;
  }

  sessions.forEach((session) => {
    const date = session.started_at.slice(0, 10);
    if (date in days) {
      days[date] += 1;
    }
  });

  return Object.entries(days).map(([date, callCount]) => ({
    date,
    callCount,
  }));
}

function buildTopAgents(sessions: CallSession[]): AgentCallSummary[] {
  const summaries = new Map<string, AgentCallSummary>();

  sessions.forEach((session) => {
    const agentId = session.agent?.id ?? "unassigned";
    const existing = summaries.get(agentId) ?? {
      agentId,
      name: session.agent?.name ?? "Unassigned",
      role: session.agent?.role ?? null,
      callCount: 0,
      totalDurationSeconds: 0,
      totalCostCredits: 0,
    };

    existing.callCount += 1;
    existing.totalDurationSeconds += session.duration_seconds;
    existing.totalCostCredits += Number(session.cost_credits ?? 0);

    summaries.set(agentId, existing);
  });

  return Array.from(summaries.values()).sort((a, b) => b.callCount - a.callCount);
}

export async function getTenantDashboardData(
  tenantId: string,
  options: DashboardRangeOptions = {}
): Promise<TenantDashboardData> {
  const days = options.days ?? 30;
  const endDate = options.endDate ?? new Date();
  const startDate = subDays(endDate, days - 1);

  const supabase = createSupabaseServiceRoleClient();
  
  // Get all agents for this tenant
  const { data: agents } = await supabase
    .from("ai_agents")
    .select("id, name, role, elevenlabs_agent_id")
    .eq("tenant_id", tenantId)
    .not("elevenlabs_agent_id", "is", null);

  if (!agents || agents.length === 0) {
    // Return empty data if no agents
    const emptySummary = calculateSummary([]);
    return {
      summary: emptySummary,
      timeline: buildTimeline([], startDate, endDate),
      topAgents: [],
      sessions: [],
      rangeStart: startDate.toISOString(),
      rangeEnd: endDate.toISOString(),
    };
  }

  const agentIds = agents.map(a => a.elevenlabs_agent_id).filter(Boolean) as string[];
  const agentMap = new Map(agents.map(a => [a.elevenlabs_agent_id, a]));

  // Fetch conversations from ElevenLabs
  const startUnix = Math.floor(startDate.getTime() / 1000);
  const endUnix = Math.floor(addDays(endDate, 1).getTime() / 1000);

  let allConversations: any[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  // Fetch all conversations for all agents (paginate if needed)
  while (hasMore && allConversations.length < 1000) {
    const queryParams = new URLSearchParams();
    queryParams.append("page_size", "100");
    queryParams.append("call_start_after_unix", startUnix.toString());
    queryParams.append("call_start_before_unix", endUnix.toString());
    if (cursor) queryParams.append("cursor", cursor);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch conversations from ElevenLabs");
      break;
    }

    const data = await response.json();
    const conversations = data.conversations || [];
    
    // Filter to only include conversations from tenant's agents
    const tenantConversations = conversations.filter((conv: any) => 
      agentIds.includes(conv.agent_id)
    );
    
    allConversations = allConversations.concat(tenantConversations);
    cursor = data.next_cursor;
    hasMore = data.has_more && cursor !== null;
  }

  // Map ElevenLabs conversations to CallSession format
  const sessions: CallSession[] = allConversations.map((conv: any) => {
    const agent = agentMap.get(conv.agent_id);
    const startTime = new Date(conv.start_time_unix_secs * 1000);
    
    // Map call_successful: "success" -> true, "failure" -> false, "unknown" -> false
    const wasSuccessful = conv.call_successful === "success";
    
    // Map status
    let status = "completed";
    if (conv.status === "failed") status = "failed";
    else if (conv.status === "done") status = "completed";
    else if (conv.status === "in-progress" || conv.status === "processing") status = "in-progress";
    else if (conv.status === "initiated") status = "initiated";

    return {
      id: conv.conversation_id,
      started_at: startTime.toISOString(),
      duration_seconds: conv.call_duration_secs || 0,
      cost_credits: 0, // ElevenLabs doesn't provide cost in conversations API
      llm_cost_usd: 0, // ElevenLabs doesn't provide LLM cost in conversations API
      was_successful: wasSuccessful,
      status: status,
      agent: agent
      ? {
            id: agent.id,
            name: agent.name || conv.agent_name || "Unknown Agent",
            role: agent.role,
          }
        : {
            id: conv.agent_id,
            name: conv.agent_name || "Unknown Agent",
            role: null,
          },
    };
  });

  // Sort by start time
  sessions.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  const summary = calculateSummary(sessions);
  const timeline = buildTimeline(sessions, startDate, endDate);
  const topAgents = buildTopAgents(sessions).slice(0, 5);

  return {
    summary,
    timeline,
    topAgents,
    sessions,
    rangeStart: startDate.toISOString(),
    rangeEnd: endDate.toISOString(),
  };
}

