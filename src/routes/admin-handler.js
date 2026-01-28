/**
 * Admin API Routes - Secure Super Admin Endpoints
 * All routes require platform_admin role verification
 */

const DBService = require('../services/db-service');
const { createClient } = require('@supabase/supabase-js');

// Create admin Supabase client with service role
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

/**
 * Middleware: Require Platform Admin
 * Verifies the requesting user has platform_admin or super_admin role
 */
async function requirePlatformAdmin(request, reply) {
    try {
        // Get auth token from header
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token and get user
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
        }

        // Check user role from profiles
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return reply.code(403).send({ error: 'Forbidden: User profile not found' });
        }

        if (!['platform_admin', 'super_admin'].includes(profile.role)) {
            return reply.code(403).send({ error: 'Forbidden: Platform admin access required' });
        }

        // Attach user to request for downstream use
        request.adminUser = { id: user.id, role: profile.role };

    } catch (err) {
        console.error('[Admin Auth Error]:', err.message);
        return reply.code(500).send({ error: 'Authentication error' });
    }
}

/**
 * Register Admin API Routes
 * @param {import('fastify').FastifyInstance} fastify
 */
async function registerAdminRoutes(fastify) {

    // ==========================================
    // ORGANIZATIONS
    // ==========================================

    // GET /api/admin/organizations - Get all organizations with stats
    fastify.get('/api/admin/organizations', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            // Fetch organizations directly to ensure we get center_type
            // RPC 'admin_get_organizations_with_stats' might be outdated
            const { data, error } = await supabaseAdmin
                .from('organizations')
                .select(`
                    id, 
                    name, 
                    created_at, 
                    plan, 
                    status, 
                    center_type,
                    user_count:profiles!organization_id(count),
                    lead_count:leads!organization_id(count)
                `)
                .order('created_at', { ascending: false });

            // Map counts to flat structure if needed, but the frontend likely expects them flat.
            // If the frontend expects 'user_count' and 'lead_count' as top-level props, 
            // we might need to map them. The RPC likely returned them flat.
            // Let's map them to be safe.
            const flatData = data ? data.map(org => ({
                ...org,
                user_count: org.user_count?.[0]?.count || 0,
                lead_count: org.lead_count?.[0]?.count || 0
            })) : [];

            if (error) throw error;
            return { success: true, organizations: flatData };
        } catch (err) {
            console.error('[Admin API] Get Organizations Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // POST /api/admin/organizations - Create new organization
    fastify.post('/api/admin/organizations', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const { name, plan = 'free', center_type = 'sales' } = request.body;
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return reply.code(400).send({ error: 'Organization name is required' });
            }

            // Validate center_type
            if (!['sales', 'support'].includes(center_type)) {
                return reply.code(400).send({ error: 'center_type must be sales or support' });
            }

            // Validate plan
            if (!['free', 'pro', 'enterprise'].includes(plan)) {
                return reply.code(400).send({ error: 'plan must be free, pro, or enterprise' });
            }

            // Insert organization directly (works with or without center_type column)
            const { data, error } = await supabaseAdmin
                .from('organizations')
                .insert({
                    name: name.trim(),
                    plan: plan,
                    center_type: center_type
                })
                .select('id')
                .single();

            if (error) throw error;
            return { success: true, organizationId: data.id };
        } catch (err) {
            console.error('[Admin API] Create Organization Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // PATCH /api/admin/organizations/:id/plan - Update organization plan
    fastify.patch('/api/admin/organizations/:id/plan', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { plan } = request.body;

            if (!plan || !['free', 'pro', 'enterprise'].includes(plan)) {
                return reply.code(400).send({ error: 'Invalid plan. Must be free, pro, or enterprise' });
            }

            const { data, error } = await supabaseAdmin.rpc('admin_update_organization_plan', {
                p_org_id: id,
                p_plan: plan
            });

            if (error) throw error;
            return { success: true, updated: data };
        } catch (err) {
            console.error('[Admin API] Update Plan Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // DELETE /api/admin/organizations/:orgId - Delete organization (cascade)
    fastify.delete('/api/admin/organizations/:orgId', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const { orgId } = request.params;
            const { confirmation } = request.body || {};

            // Require typed confirmation for safety
            if (confirmation !== 'DELETE') {
                return reply.code(400).send({
                    error: 'Confirmation required. Send { confirmation: "DELETE" } in body.'
                });
            }

            const { data, error } = await supabaseAdmin.rpc('admin_delete_organization', {
                p_org_id: orgId
            });

            if (error) throw error;
            return { success: true, ...data };
        } catch (err) {
            console.error('[Admin API] Delete Organization Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ==========================================
    // USERS
    // ==========================================

    // GET /api/admin/organizations/:orgId/users - Get users in organization
    fastify.get('/api/admin/organizations/:orgId/users', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const { orgId } = request.params;

            const { data, error } = await supabaseAdmin.rpc('admin_get_organization_users', {
                p_org_id: orgId
            });

            if (error) throw error;
            return { success: true, users: data || [] };
        } catch (err) {
            console.error('[Admin API] Get Org Users Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // DELETE /api/admin/users/:userId - Delete user with lead action
    fastify.delete('/api/admin/users/:userId', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const { leadAction, reassignTo, confirmation } = request.body || {};

            // Require typed confirmation for safety
            if (confirmation !== 'DELETE') {
                return reply.code(400).send({
                    error: 'Confirmation required. Send { confirmation: "DELETE", leadAction: "unassign|reassign|delete" } in body.'
                });
            }

            if (!['reassign', 'unassign', 'delete'].includes(leadAction)) {
                return reply.code(400).send({
                    error: 'leadAction must be one of: reassign, unassign, delete'
                });
            }

            const { data, error } = await supabaseAdmin.rpc('admin_delete_user', {
                p_user_id: userId,
                p_lead_action: leadAction,
                p_reassign_to: reassignTo || null
            });

            if (error) throw error;
            return { success: true, ...data };
        } catch (err) {
            console.error('[Admin API] Delete User Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ==========================================
    // INTEGRITY & VERIFICATION
    // ==========================================

    // GET /api/admin/verify-isolation - Get isolation integrity report
    fastify.get('/api/admin/verify-isolation', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const { data, error } = await supabaseAdmin.rpc('admin_verify_isolation');

            if (error) throw error;
            return { success: true, report: data };
        } catch (err) {
            console.error('[Admin API] Isolation Report Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ==========================================
    // AUDIT LOG
    // ==========================================

    // GET /api/admin/audit-log - Get recent admin actions
    fastify.get('/api/admin/audit-log', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const limit = parseInt(request.query.limit) || 50;

            const { data, error } = await supabaseAdmin.rpc('admin_get_audit_log', {
                p_limit: Math.min(limit, 200) // Cap at 200
            });

            if (error) throw error;
            return { success: true, logs: data || [] };
        } catch (err) {
            console.error('[Admin API] Audit Log Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ==========================================
    // INVITATIONS
    // ==========================================

    // POST /api/admin/invitations - Create and send invitation
    fastify.post('/api/admin/invitations', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const { email, organizationId, role = 'rep' } = request.body;

            if (!email || !organizationId) {
                return reply.code(400).send({ error: 'Email and organizationId are required' });
            }

            // Validate role
            if (!['rep', 'manager'].includes(role)) {
                return reply.code(400).send({ error: 'Role must be rep or manager' });
            }

            // Check if email already exists in profiles
            const { data: existingUser } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                return reply.code(400).send({ error: 'User with this email already exists' });
            }

            // Check for pending invitation
            const { data: existingInvite } = await supabaseAdmin
                .from('invitations')
                .select('id')
                .eq('email', email)
                .eq('organization_id', organizationId)
                .is('accepted_at', null)
                .gte('expires_at', new Date().toISOString())
                .single();

            if (existingInvite) {
                return reply.code(400).send({ error: 'Pending invitation already exists for this email' });
            }

            // Generate unique token
            const crypto = require('crypto');
            const token = crypto.randomBytes(32).toString('hex');

            // Create invitation
            const { data: invitation, error } = await supabaseAdmin
                .from('invitations')
                .insert({
                    email: email.toLowerCase().trim(),
                    organization_id: organizationId,
                    role: role,
                    token: token,
                    invited_by: request.adminUser.id,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                })
                .select()
                .single();

            if (error) throw error;

            // TODO: Send email with invitation link
            // For now, return the token (in production, send via email)
            // Use RENDER_EXTERNAL_URL if available (automatic in Render), otherwise configured FRONTEND_URL, or localhost
            const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
            const inviteLink = `${baseUrl}/invite/${token}`;

            return {
                success: true,
                invitation: {
                    id: invitation.id,
                    email: invitation.email,
                    role: invitation.role,
                    expiresAt: invitation.expires_at,
                    inviteLink: inviteLink // Only return in dev, remove in production
                }
            };
        } catch (err) {
            console.error('[Admin API] Create Invitation Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // GET /api/admin/organizations/:orgId/invitations - List org invitations
    fastify.get('/api/admin/organizations/:orgId/invitations', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const { orgId } = request.params;

            const { data, error } = await supabaseAdmin
                .from('invitations')
                .select(`
                    id,
                    email,
                    role,
                    created_at,
                    expires_at,
                    accepted_at,
                    invited_by,
                    inviter:invited_by(full_name),
                    organization:organization_id(center_type)
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, invitations: data || [] };
        } catch (err) {
            console.error('[Admin API] List Invitations Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // DELETE /api/admin/invitations/:invitationId - Cancel invitation
    fastify.delete('/api/admin/invitations/:invitationId', {
        preHandler: requirePlatformAdmin
    }, async (request, reply) => {
        try {
            const { invitationId } = request.params;

            const { error } = await supabaseAdmin
                .from('invitations')
                .delete()
                .eq('id', invitationId);

            if (error) throw error;
            return { success: true, message: 'Invitation cancelled' };
        } catch (err) {
            console.error('[Admin API] Delete Invitation Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ==========================================
    // PUBLIC INVITATION ROUTES (No auth required)
    // ==========================================

    // GET /api/invitations/:token - Validate invitation token (public)
    fastify.get('/api/invitations/:token', async (request, reply) => {
        try {
            const { token } = request.params;

            const { data, error } = await supabaseAdmin
                .from('invitations')
                .select(`
                    id,
                    email,
                    role,
                    expires_at,
                    accepted_at,
                    organization:organization_id(name)
                `)
                .eq('token', token)
                .single();

            if (error || !data) {
                return reply.code(404).send({ error: 'Invalid or expired invitation' });
            }

            if (data.accepted_at) {
                return reply.code(400).send({ error: 'Invitation already accepted' });
            }

            if (new Date(data.expires_at) < new Date()) {
                return reply.code(400).send({ error: 'Invitation has expired' });
            }

            return {
                success: true,
                invitation: {
                    email: data.email,
                    role: data.role,
                    organizationName: data.organization?.name,
                    expiresAt: data.expires_at
                }
            };
        } catch (err) {
            console.error('[API] Validate Invitation Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // POST /api/invitations/:token/accept - Accept invitation and create user
    fastify.post('/api/invitations/:token/accept', async (request, reply) => {
        try {
            const { token } = request.params;
            const { password, fullName } = request.body;

            if (!password || password.length < 6) {
                return reply.code(400).send({ error: 'Password must be at least 6 characters' });
            }

            if (!fullName || fullName.trim().length < 2) {
                return reply.code(400).send({ error: 'Full name is required' });
            }

            // Get invitation
            const { data: invitation, error: inviteError } = await supabaseAdmin
                .from('invitations')
                .select('*')
                .eq('token', token)
                .is('accepted_at', null)
                .single();

            if (inviteError || !invitation) {
                return reply.code(404).send({ error: 'Invalid or expired invitation' });
            }

            if (new Date(invitation.expires_at) < new Date()) {
                return reply.code(400).send({ error: 'Invitation has expired' });
            }

            // Create auth user
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: invitation.email,
                password: password,
                email_confirm: true // Auto-confirm since they have invite link
            });

            if (authError) throw authError;

            // Update profile with organization
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                    full_name: fullName.trim(),
                    organization_id: invitation.organization_id,
                    role: invitation.role,
                    email: invitation.email
                })
                .eq('id', authData.user.id);

            if (profileError) {
                // Rollback: delete the auth user
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                throw profileError;
            }

            // Mark invitation as accepted
            await supabaseAdmin
                .from('invitations')
                .update({ accepted_at: new Date().toISOString() })
                .eq('id', invitation.id);

            return {
                success: true,
                message: 'Account created successfully',
                userId: authData.user.id
            };
        } catch (err) {
            console.error('[API] Accept Invitation Error:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

}

module.exports = registerAdminRoutes;
