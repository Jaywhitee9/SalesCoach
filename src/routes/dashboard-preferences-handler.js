const supabase = require('../lib/supabase');

const DEFAULT_LAYOUT_LG = [
  { i: 'kpis', x: 0, y: 0, w: 12, h: 3, minW: 6, minH: 2 },
  { i: 'ai-insights', x: 8, y: 3, w: 4, h: 5, minW: 3, minH: 3 },
  { i: 'goal-progress', x: 4, y: 3, w: 4, h: 5, minW: 3, minH: 3 },
  { i: 'live-activity', x: 0, y: 3, w: 4, h: 5, minW: 3, minH: 3 },
  { i: 'pipeline', x: 8, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'team-performance', x: 4, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'attention-queue', x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'top-deals', x: 6, y: 12, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'quality-trend', x: 0, y: 12, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'tasks', x: 8, y: 16, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'notifications', x: 4, y: 16, w: 4, h: 4, minW: 3, minH: 3 }
];

const COLS = { lg: 12, md: 10, sm: 6, xs: 2 };

function deriveBreakpoints(lg) {
  return {
    lg,
    md: lg.map(item => ({
      ...item,
      x: Math.min(item.x, COLS.md - Math.min(item.w, COLS.md)),
      w: Math.min(item.w, COLS.md),
    })),
    sm: lg.map(item => ({ ...item, x: 0, w: COLS.sm })),
    xs: lg.map(item => ({ ...item, x: 0, w: COLS.xs })),
  };
}

const DEFAULT_LAYOUTS = deriveBreakpoints(DEFAULT_LAYOUT_LG);
const DEFAULT_KPI_SELECTION = ['calls', 'conversions', 'avgDuration', 'aiScore'];

/**
 * @param {import('fastify').FastifyInstance} fastify 
 */
async function registerDashboardPreferencesRoutes(fastify) {

  // ── Legacy endpoints (backwards compat) ──

  fastify.get('/api/dashboard/preferences', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('profiles')
      .select('dashboard_preferences')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[DashboardPreferences] Load error:', error);
      return reply.code(500).send({ error: error.message });
    }
    return { success: true, preferences: data?.dashboard_preferences || null };
  });

  fastify.put('/api/dashboard/preferences', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
    const { preferences } = request.body;
    if (!preferences) return reply.code(400).send({ error: 'Missing preferences' });

    const { error } = await supabase
      .from('profiles')
      .update({ dashboard_preferences: preferences })
      .eq('id', userId);

    if (error) {
      console.error('[DashboardPreferences] Save error:', error);
      return reply.code(500).send({ error: error.message });
    }
    return { success: true };
  });

  fastify.delete('/api/dashboard/preferences', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const defaultPreferences = {
      layout: [],
      hidden_widgets: [],
      kpi_selection: DEFAULT_KPI_SELECTION,
      time_range_default: 'week'
    };

    const { error } = await supabase
      .from('profiles')
      .update({ dashboard_preferences: defaultPreferences })
      .eq('id', userId);

    if (error) {
      console.error('[DashboardPreferences] Reset error:', error);
      return reply.code(500).send({ error: error.message });
    }
    return { success: true };
  });

  // ── Grid Layout endpoints ──

  fastify.get('/api/dashboard/layout', async (request, reply) => {
    const userId = request.user?.id;
    const orgId = request.query.organizationId || request.user?.organization_id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[DashboardLayout] Load error:', error);
      return reply.code(500).send({ error: error.message });
    }

    if (!data) {
      return {
        success: true,
        layouts: DEFAULT_LAYOUTS,
        hidden_widgets: [],
        kpi_selection: DEFAULT_KPI_SELECTION,
        layout_version: 1,
        is_default: true
      };
    }

    let layouts = data.layouts;
    if (!layouts || !layouts.lg) {
      if (data.layout && Array.isArray(data.layout) && data.layout.length > 0) {
        layouts = deriveBreakpoints(data.layout);
      } else {
        layouts = DEFAULT_LAYOUTS;
      }
    }

    return {
      success: true,
      layouts,
      hidden_widgets: data.hidden_widgets || [],
      kpi_selection: data.kpi_selection || DEFAULT_KPI_SELECTION,
      layout_version: data.layout_version || 1,
      is_default: false
    };
  });

  fastify.put('/api/dashboard/layout', async (request, reply) => {
    const userId = request.user?.id;
    const orgId = request.body.organizationId || request.user?.organization_id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const { layouts, hidden_widgets, kpi_selection, layout_version } = request.body;

    const payload = {
      user_id: userId,
      organization_id: orgId,
      layouts: layouts || DEFAULT_LAYOUTS,
      hidden_widgets: hidden_widgets || [],
      kpi_selection: kpi_selection || DEFAULT_KPI_SELECTION,
      layout_version: layout_version || 1
    };

    const { error } = await supabase
      .from('dashboard_layouts')
      .upsert(payload, { onConflict: 'user_id,organization_id' });

    if (error) {
      console.error('[DashboardLayout] Save error:', error);
      return reply.code(500).send({ error: error.message });
    }

    return { success: true };
  });

  fastify.delete('/api/dashboard/layout', async (request, reply) => {
    const userId = request.user?.id;
    const orgId = request.query.organizationId || request.user?.organization_id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const { error } = await supabase
      .from('dashboard_layouts')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[DashboardLayout] Delete error:', error);
      return reply.code(500).send({ error: error.message });
    }

    return { success: true };
  });
}

module.exports = registerDashboardPreferencesRoutes;
