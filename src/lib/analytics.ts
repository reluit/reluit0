import { addDays, startOfDay, subDays } from "date-fns";

import { createSupabaseServerClient } from "./supabase/clients";

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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("call_sessions")
    .select(
      "id, started_at, duration_seconds, cost_credits, llm_cost_usd, was_successful, status, agent:agents(id, name, role)"
    )
    .eq("tenant_id", tenantId)
    .gte("started_at", startDate.toISOString())
    .lte("started_at", addDays(endDate, 1).toISOString())
    .order("started_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load call sessions: ${error.message}`);
  }

  const sessions: CallSession[] = (data ?? []).map((session: any) => ({
    id: session.id,
    started_at: session.started_at,
    duration_seconds: session.duration_seconds ?? 0,
    cost_credits: Number(session.cost_credits ?? 0),
    llm_cost_usd: Number(session.llm_cost_usd ?? 0),
    was_successful: Boolean(session.was_successful),
    status: session.status ?? "completed",
    agent: session.agent
      ? {
          id: session.agent.id,
          name: session.agent.name,
          role: session.agent.role,
        }
      : null,
  }));

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

