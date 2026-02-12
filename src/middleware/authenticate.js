const supabase = require('../lib/supabase');

/**
 * Authenticate request using Supabase Auth
 * Sets request.user with { id, email, organization_id, role, ... }
 */
async function authenticate(request, reply) {
    try {
        // 1. Skip public routes (optional: can be handled by caller)
        const publicRoutes = ['/api/system/health', '/api/stripe/webhook', '/voice', '/ws'];
        if (publicRoutes.some(route => request.url.startsWith(route))) {
            return;
        }

        // 2. Extract Token
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Only enforce constraints on specific routes, or let route handlers decide?
            // For now, let's just return if no token, route handlers check request.user
            return;
        }

        const token = authHeader.split(' ')[1];

        // 3. Verify Token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            // Token invalid
            // reply.code(401).send({ error: 'Invalid token' });
            return;
        }

        // 4. Fetch Profile (Organization & Role)
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role, full_name, twilio_phone_number')
            .eq('id', user.id)
            .single();

        // 5. Set User on Request
        request.user = {
            id: user.id,
            email: user.email,
            organization_id: profile?.organization_id,
            role: profile?.role,
            full_name: profile?.full_name,
            twilio_phone_number: profile?.twilio_phone_number
        };

        // console.log(`[Auth] Authenticated user: ${user.email} (${profile?.role})`);

    } catch (err) {
        console.error('[Auth] Middleware error:', err);
        // Don't crash, just don't authenticate
    }
}

module.exports = authenticate;
