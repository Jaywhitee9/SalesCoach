-- API Keys Table for Secure Webhook Access
-- Each organization can have multiple API keys for different integrations

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Security: Never store plain key, only hash
  key_hash TEXT NOT NULL,        -- SHA256 hash of the full key
  key_prefix TEXT NOT NULL,      -- First 8 chars for display (e.g., "org_sk_a")
  
  -- Metadata
  name TEXT DEFAULT 'Default Key',
  description TEXT,
  
  -- Permissions (for future expansion)
  permissions TEXT[] DEFAULT ARRAY['leads:write'],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  last_used_at TIMESTAMPTZ,
  last_used_ip TEXT,
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(organization_id, is_active);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage API keys for their organization
CREATE POLICY "api_keys_select_own_org" ON api_keys
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "api_keys_insert_own_org" ON api_keys
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "api_keys_update_own_org" ON api_keys
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "api_keys_delete_own_org" ON api_keys
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Grant access
GRANT ALL ON api_keys TO authenticated;

-- Comment
COMMENT ON TABLE api_keys IS 'Stores API keys for secure webhook access. Keys are hashed with SHA256.';
