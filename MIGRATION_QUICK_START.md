# Migration Quick Start Guide

**For: Sales Coach Database Migrations 53 & 54**
**Created: 2026-02-16**

---

## TL;DR - What You Need to Know

- Migration 53: Performance indexes (SAFE, apply now)
- Migration 54: RLS security (TEST FIRST, then apply)
- Current state: RLS is DISABLED (security risk)
- Test script: `scripts/test_rls_policies.js`

---

## Prerequisites

### 1. Check Environment Variables

```bash
# Server must use SERVICE ROLE, not ANON KEY
echo $SUPABASE_SERVICE_ROLE_KEY  # Should be set
echo $VITE_SUPABASE_URL          # Should be your project URL
```

If not set:
```bash
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # From Supabase dashboard
```

### 2. Verify Database Connection

```bash
# Test connection
psql "$SUPABASE_DB_URL" -c "SELECT version();"

# Check current migration version
psql "$SUPABASE_DB_URL" -c "SELECT MAX(version) FROM supabase_migrations.schema_migrations;"
```

### 3. Backup Database (IMPORTANT!)

```bash
# Supabase CLI (recommended)
supabase db dump -f backup_$(date +%Y%m%d).sql

# Or via pg_dump
pg_dump "$SUPABASE_DB_URL" > backup_$(date +%Y%m%d).sql
```

---

## Step 1: Apply Migration 53 (Performance Indexes)

**Risk**: VERY LOW - Only adds indexes, no schema or RLS changes
**Time**: 2-5 minutes
**Downtime**: None

### Apply Now

```bash
cd "/Users/omerzano/Downloads/עבודה/Sales Coach"

# Apply migration
psql "$SUPABASE_DB_URL" -f supabase/migrations/53_add_performance_indexes.sql
```

### Verify Success

```bash
# Check indexes created
psql "$SUPABASE_DB_URL" -c "
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN ('calls', 'leads', 'user_targets', 'call_summaries', 'tasks')
ORDER BY tablename, indexname;
"
```

Expected output: 15+ new indexes

### Test Performance

Before and after dashboard load times should improve 2-5x.

**Done!** Migration 53 is complete. You can safely use the system.

---

## Step 2: Test Migration 54 (RLS Policies)

**Risk**: MEDIUM-HIGH - Enables security, can break auth if misconfigured
**Time**: 15-30 minutes testing
**Downtime**: Possible if issues occur

### Option A: Test in Staging First (RECOMMENDED)

```bash
# Apply to staging database
psql "$SUPABASE_STAGING_URL" -f supabase/migrations/54_final_stable_rls.sql

# Run test script
node scripts/test_rls_policies.js

# Test manually as rep user
# Test manually as manager user
# Test lead creation (unassigned, assigned)
# Test dashboard performance
```

### Option B: Test Locally (If no staging)

```bash
# Start local Supabase
supabase start

# Apply migration
supabase db push

# Run tests
node scripts/test_rls_policies.js
```

### Expected Test Results

```
============================================================
Test Summary
============================================================
Total Tests: 25
✅ Passed: 25
❌ Failed: 0
Success Rate: 100%
```

If any tests fail, DO NOT apply to production. Review errors in test output.

---

## Step 3: Apply Migration 54 to Production

**ONLY AFTER** successful staging/local tests!

### Pre-Flight Checklist

- [ ] Migration 53 applied and working
- [ ] Staging tests passed (100%)
- [ ] Service role key configured
- [ ] Database backup created
- [ ] Rollback plan understood
- [ ] Off-peak time scheduled (optional but recommended)
- [ ] Team notified of deployment

### Apply Migration

```bash
cd "/Users/omerzano/Downloads/עבודה/Sales Coach"

# Final backup
supabase db dump -f backup_before_rls_$(date +%Y%m%d_%H%M%S).sql

# Apply migration
psql "$SUPABASE_DB_URL" -f supabase/migrations/54_final_stable_rls.sql
```

### Verify RLS Enabled

```bash
# Check RLS status
psql "$SUPABASE_DB_URL" -c "
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('calls', 'leads', 'profiles', 'tasks', 'user_targets', 'call_summaries')
ORDER BY tablename;
"
```

Expected: All tables should show `rls_enabled = t`

### Run Production Tests

```bash
# Quick automated test
node scripts/test_rls_policies.js

# Manual checks:
# 1. Login as rep user → Can see org data only
# 2. Login as manager → Can see all team data
# 3. Create lead (unassigned) → Should work
# 4. Create lead (assigned to teammate) → Should work
# 5. Dashboard loads in <2 seconds
```

---

## Step 4: Monitor & Verify

### First 5 Minutes

- [ ] No error logs with "row-level security policy violation"
- [ ] Users can login
- [ ] Dashboard loads
- [ ] Leads visible
- [ ] Can create leads

### First Hour

- [ ] No user complaints
- [ ] No 403 errors in logs
- [ ] Performance normal (<2s dashboard load)
- [ ] All features working

### First 24 Hours

- [ ] Database CPU normal (<50%)
- [ ] Query performance stable
- [ ] No cross-org data leaks (test by creating test users in different orgs)
- [ ] Manager access working

---

## Troubleshooting

### Issue: "row-level security policy violation"

**Cause**: Service role not configured or RLS policy bug

**Fix**:
```bash
# Check server uses service role key
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/

# If not found, update server to use service role
# Server should NOT use SUPABASE_ANON_KEY for database operations
```

### Issue: White screen / Cannot see data

**Cause**: RLS blocking legitimate access

**Quick Fix** (Temporary):
```bash
# Disable RLS temporarily
psql "$SUPABASE_DB_URL" -c "
ALTER TABLE public.calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
"

# Then investigate and fix root cause
```

### Issue: Cannot create leads

**Cause**: INSERT policy too restrictive

**Check**:
```bash
# View lead insert policies
psql "$SUPABASE_DB_URL" -c "
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'leads'
  AND cmd = 'INSERT';
"
```

Should see policy allowing `owner_id IS NULL OR owner_id = auth.uid() OR ...`

### Issue: Managers cannot see team data

**Cause**: Manager role not set correctly

**Check**:
```bash
# Verify manager role
psql "$SUPABASE_DB_URL" -c "
SELECT id, email, role, organization_id
FROM profiles
WHERE role IN ('manager', 'admin', 'platform_admin', 'super_admin');
"
```

**Fix**: Update user role:
```sql
UPDATE profiles SET role = 'manager' WHERE id = 'user-uuid';
```

---

## Rollback Plan

### Emergency: Rollback Migration 54

If RLS causes critical issues:

```bash
# Disable RLS on all tables
psql "$SUPABASE_DB_URL" -c "
ALTER TABLE public.calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_summaries DISABLE ROW LEVEL SECURITY;
"

# Verify
psql "$SUPABASE_DB_URL" -c "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
"
```

Should return empty (no tables with RLS enabled)

**WARNING**: This removes security isolation! Fix root cause ASAP.

### Restore from Backup

If database corrupted:

```bash
# Restore from backup
psql "$SUPABASE_DB_URL" -f backup_before_rls_YYYYMMDD_HHMMSS.sql

# Verify
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM leads;"
```

---

## Timeline

### Recommended Schedule

**Day 1** (Today):
- [x] Review audit and documentation
- [ ] Apply migration 53 (indexes) to production
- [ ] Verify performance improvement

**Day 2-3**:
- [ ] Create/verify staging environment
- [ ] Apply migration 54 to staging
- [ ] Run comprehensive tests
- [ ] Load test with production data volume

**Day 4-5**:
- [ ] Team review of staging results
- [ ] Fix any issues found in staging
- [ ] Schedule production deployment

**Day 6** (Weekend, low traffic):
- [ ] Apply migration 54 to production
- [ ] Monitor closely for 24 hours
- [ ] Document any issues

**Day 7+**:
- [ ] Continued monitoring
- [ ] Performance audit
- [ ] Security audit
- [ ] Mark as complete

---

## Success Metrics

### Performance
- Dashboard load time: <2 seconds (currently 4+ seconds)
- Query time (getLeads): <150ms (currently 890ms)
- Database CPU: <50% (currently spikes to 80%+)

### Security
- RLS enabled: 6/6 tables
- Test pass rate: 100%
- Cross-org data leaks: 0
- Policy violations: 0

### Functionality
- User login: Working
- Lead creation: All scenarios working
- Manager access: Full team visibility
- Rep access: Org data only
- No user complaints

---

## Commands Reference

### Quick Test
```bash
node scripts/test_rls_policies.js
```

### Check RLS Status
```bash
psql "$SUPABASE_DB_URL" -c "
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('calls', 'leads', 'profiles', 'tasks', 'user_targets');
"
```

### Check Indexes
```bash
psql "$SUPABASE_DB_URL" -c "\di+ public.idx_*"
```

### View Policies
```bash
psql "$SUPABASE_DB_URL" -c "
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"
```

### Monitor Queries
```bash
psql "$SUPABASE_DB_URL" -c "
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%leads%' OR query LIKE '%calls%'
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

---

## Help & Support

**Documentation**:
- Full guide: `/docs/database_policies.md`
- Audit summary: `/docs/RLS_AUDIT_SUMMARY.md`
- This guide: `/MIGRATION_QUICK_START.md`

**Test Script**:
- Location: `/scripts/test_rls_policies.js`
- Usage: `node scripts/test_rls_policies.js`

**Migration Files**:
- Performance: `/supabase/migrations/53_add_performance_indexes.sql`
- Security: `/supabase/migrations/54_final_stable_rls.sql`

**Questions?** Review troubleshooting section in `/docs/database_policies.md`

---

## Final Checklist

Before marking as complete:

- [ ] Migration 53 applied to production
- [ ] Performance improvement verified (2-5x faster)
- [ ] Migration 54 tested in staging (100% pass rate)
- [ ] Migration 54 applied to production
- [ ] RLS enabled on all tables
- [ ] Test script passes (100%)
- [ ] Manual testing complete (rep + manager users)
- [ ] No errors in logs
- [ ] Performance acceptable (<2s dashboard load)
- [ ] Team trained on new security model
- [ ] Documentation reviewed and understood
- [ ] Monitoring in place

---

**Good luck with the migration!**

If you encounter issues, refer to the comprehensive troubleshooting guide in `/docs/database_policies.md` or rollback using the instructions above.

**Remember**: Migration 53 is safe to apply now. Migration 54 requires careful testing first.
