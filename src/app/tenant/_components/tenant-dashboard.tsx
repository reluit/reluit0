"use client";

import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { ArrowUpRight, Wallet, Waves } from "lucide-react";

import { formatCredits, formatDateLabel, formatDateTime, formatDuration, formatPercent, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TenantDashboardData } from "@/lib/analytics";
import type { TenantWithDomains } from "@/lib/tenants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TenantDashboardProps {
  tenant: TenantWithDomains;
  data: TenantDashboardData;
  currentDomain?: string;
}

function SummaryMetric({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
        {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

const timelineColors = {
  fill: "#a5b4fc",
  stroke: "#6366f1",
};

const statusColors: Record<string, string> = {
  completed: "text-emerald-600 bg-emerald-100",
  failed: "text-rose-600 bg-rose-100",
  cancelled: "text-slate-500 bg-slate-100",
};

export function TenantDashboard({ tenant, data, currentDomain }: TenantDashboardProps) {
  const primaryDomain = tenant.domains.find((domain) => domain.is_primary)?.domain ?? currentDomain ?? tenant.domains[0]?.domain;

  const timelineData = useMemo(
    () =>
      data.timeline.map((point) => ({
        name: formatDateLabel(point.date),
        calls: point.callCount,
      })),
    [data.timeline]
  );

  const recentSessions = useMemo(() => data.sessions.slice(-6).reverse(), [data.sessions]);

  const summaryItems = [
    {
      label: "Number of calls",
      value: data.summary.totalCalls.toString(),
      icon: <Waves className="h-4 w-4 text-slate-400" />,
    },
    {
      label: "Average duration",
      value: formatDuration(data.summary.averageDurationSeconds),
      helper: `${formatDuration(data.summary.totalDurationSeconds)} total`,
    },
    {
      label: "Total cost",
      value: formatCredits(data.summary.totalCostCredits),
      helper: `${formatCredits(data.summary.averageCostCredits)} per call`,
      icon: <Wallet className="h-4 w-4 text-slate-400" />,
    },
    {
      label: "LLM spend",
      value: formatUsd(data.summary.totalLlmCostUsd),
      helper: `${formatUsd(data.summary.averageLlmCostUsdPerCall)} per call`,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="mb-2 bg-slate-900 text-white hover:bg-slate-900">
              reluit × {tenant.name}
            </Badge>
            <h1 className="text-3xl font-semibold text-slate-900">
              {tenant.name} dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Monitoring customer conversations, agent performance, and voice assistant costs in real time.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-1">
                Active domain: {primaryDomain}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1">
                Range: Last 30 days
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-slate-600">
              Export data
            </Button>
            <Button className="gap-1">
              View call log
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <SummaryMetric key={item.label} {...item} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">Call volume</CardTitle>
                <CardDescription>Daily calls over the selected timeframe</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={timelineColors.stroke} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={timelineColors.stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      borderColor: "#e2e8f0",
                    }}
                    formatter={(value: number) => [`${value} calls`, "Calls"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke={timelineColors.stroke}
                    strokeWidth={2}
                    fill="url(#fillCalls)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Overall success rate</CardTitle>
              <CardDescription>
                Percentage of calls completed with the desired outcome.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-slate-900">
                  {formatPercent(data.summary.successRate)}
                </span>
                <Badge variant="success">Goal: 92%</Badge>
              </div>
              <Progress value={Math.round(data.summary.successRate * 100)} />
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">
                  {data.summary.totalCalls - Math.round(data.summary.totalCalls * data.summary.successRate)} calls need follow-up
                </p>
                <p className="mt-1">
                  Keep iterating on your prompts and CRM automations to boost completion rate.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Most active agents</CardTitle>
              <CardDescription>Call distribution by voice agent and total airtime</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Talk time</TableHead>
                    <TableHead className="hidden sm:table-cell">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topAgents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        No calls recorded in this timeframe.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.topAgents.map((agent) => (
                      <TableRow key={agent.agentId}>
                        <TableCell className="font-medium text-slate-900">{agent.name}</TableCell>
                        <TableCell className="hidden text-xs text-slate-500 md:table-cell">
                          {agent.role ?? "—"}
                        </TableCell>
                        <TableCell>{agent.callCount}</TableCell>
                        <TableCell>{formatDuration(agent.totalDurationSeconds)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{formatCredits(agent.totalCostCredits)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Recent calls</CardTitle>
              <CardDescription>Latest conversations routed through your agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentSessions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No calls in this period.
                </div>
              ) : (
                recentSessions.map((session) => (
                  <div key={session.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">
                        {session.agent?.name ?? "Unassigned agent"}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          statusColors[session.status] ?? "bg-slate-100 text-slate-500"
                        )}
                      >
                        {session.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{formatDateTime(session.started_at)}</span>
                      <span>Duration {formatDuration(session.duration_seconds)}</span>
                      <span>Cost {formatCredits(session.cost_credits)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

