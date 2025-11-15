import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');

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

    // Get agents with related data
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        *,
        voice_profiles(*),
        call_sessions(count, duration_seconds, was_successful)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Agents fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }

    // Process agents to add computed stats
    const agentsWithStats = agents?.map(agent => {
      const sessions = agent.call_sessions || [];
      const totalSessions = sessions.length;
      const successfulSessions = sessions.filter((s: any) => s.was_successful).length;
      const avgDuration = totalSessions > 0
        ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0) / totalSessions)
        : 0;

      return {
        ...agent,
        stats: {
          totalSessions,
          successfulSessions,
          successRate: totalSessions > 0 ? Math.round((successfulSessions / totalSessions) * 100) : 0,
          avgDuration
        },
        call_sessions: undefined // Remove raw sessions from response
      };
    }) || [];

    return NextResponse.json({
      agents: agentsWithStats
    });

  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenant_id, name, role, metadata } = body;

    if (!tenant_id || !name) {
      return NextResponse.json(
        { error: 'tenant_id and name are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('agents')
      .insert({
        tenant_id,
        name,
        role,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Agent creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    // Log analytics event
    await supabase
      .from('analytics_events')
      .insert({
        tenant_id,
        event_type: 'agent_created',
        event_data: { agent_id: data.id, agent_name: name }
      });

    return NextResponse.json({ agent: data }, { status: 201 });

  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
