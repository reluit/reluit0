import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const agentId = searchParams.get('agent_id');

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

    let query = supabase
      .from('evaluations')
      .select('*')
      .eq('tenant_id', tenantId);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data: evaluations, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Evaluations fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch evaluations' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const completedEvals = evaluations?.filter(e => e.status === 'completed') || [];
    const avgOverallScore = completedEvals.length > 0
      ? completedEvals.reduce((sum, e) => sum + Number(e.overall_score || 0), 0) / completedEvals.length
      : 0;

    return NextResponse.json({
      evaluations: evaluations || [],
      summary: {
        total: evaluations?.length || 0,
        completed: completedEvals.length,
        avgOverallScore: Math.round(avgOverallScore * 10) / 10
      }
    });

  } catch (error) {
    console.error('Error fetching evaluations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenant_id, agent_id, evaluator_name, criteria, scores, feedback, overall_score, status } = body;

    if (!tenant_id || !evaluator_name || !criteria || !scores) {
      return NextResponse.json(
        { error: 'tenant_id, evaluator_name, criteria, and scores are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('evaluations')
      .insert({
        tenant_id,
        agent_id,
        evaluator_name,
        criteria,
        scores,
        feedback,
        overall_score,
        status: status || 'draft'
      })
      .select()
      .single();

    if (error) {
      console.error('Evaluation creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create evaluation' },
        { status: 500 }
      );
    }

    // Log analytics event
    await supabase
      .from('analytics_events')
      .insert({
        tenant_id,
        event_type: 'evaluation_created',
        event_data: { evaluation_id: data.id, agent_id }
      });

    return NextResponse.json({ evaluation: data }, { status: 201 });

  } catch (error) {
    console.error('Error creating evaluation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
