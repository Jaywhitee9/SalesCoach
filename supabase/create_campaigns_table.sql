-- Campaign Management: Create campaigns table
-- A campaign is a filter for lead sources (e.g., "Landing Page" = leads with source="Website")

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_filter TEXT NOT NULL, -- e.g., 'Website', 'Google', 'Landing Page', 'Facebook'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(organization_id, is_active);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see campaigns from their organization
CREATE POLICY "campaigns_select_own_org" ON campaigns
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policy: Users can insert campaigns for their organization
CREATE POLICY "campaigns_insert_own_org" ON campaigns
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policy: Users can update campaigns in their organization
CREATE POLICY "campaigns_update_own_org" ON campaigns
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policy: Users can delete campaigns in their organization
CREATE POLICY "campaigns_delete_own_org" ON campaigns
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Grant access to authenticated users
GRANT ALL ON campaigns TO authenticated;
