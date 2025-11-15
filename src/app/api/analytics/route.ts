import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const period = searchParams.get('period') || '7d'; // '7d', '30d', '90d'

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculate date range
    const now = new Date();
    const daysAgo = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Get call sessions
    const { data: callSessions } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false });

    // Get analytics events
    const { data: events } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false });

    // Calculate metrics
    const totalCalls = callSessions?.length || 0;
    const successfulCalls = callSessions?.filter(c => c.was_successful).length || 0;
    const totalDuration = callSessions?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0;
    const avgCallDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    const totalCost = callSessions?.reduce((sum, c) => sum + Number(c.cost_credits || 0), 0) || 0;

    // Group calls by day for charts
    const callsByDay: Record<string, number> = {};
    const successfulCallsByDay: Record<string, number> = {};

    callSessions?.forEach(call => {
      const date = new Date(call.started_at).toISOString().split('T')[0];
      callsByDay[date] = (callsByDay[date] || 0) + 1;
      if (call.was_successful) {
        successfulCallsByDay[date] = (successfulCallsByDay[date] || 0) + 1;
      }
    });

    // Event counts by type
    const eventsByType: Record<string, number> = {};
    events?.forEach(event => {
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;
    });

    return NextResponse.json({
      summary: {
        totalCalls,
        successfulCalls,
        failedCalls: totalCalls - successfulCalls,
        successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0,
        totalDuration,
        avgCallDuration,
        totalCost: Number(totalCost.toFixed(2)),
        period
      },
      charts: {
        callsByDay,
        successfulCallsByDay,
        eventsByType
      },
      recentCalls: callSessions?.slice(0, 10) || [],
      recentEvents: events?.slice(0, 20) || []
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
