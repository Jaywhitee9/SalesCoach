-- Organization Knowledge Base with STRICT ISOLATION
-- Each org has custom knowledge that improves AI coaching

create table if not exists public.organization_knowledge (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  
  -- Domain isolation (sales/support/success)
  domain text check (domain in ('sales', 'support', 'success')) default 'sales',
  
  -- Knowledge classification
  knowledge_type text check (knowledge_type in (
    'product_info',      -- General product/service description
    'objections',        -- Common objections + responses
    'competitors',       -- Competitor intel & battle cards
    'processes',         -- Internal processes & guidelines
    'terminology',       -- Company-specific terms
    'success_stories'    -- Case studies & wins
  )) not null,
  
  -- Content
  title text not null,
  content jsonb not null,  -- Flexible structure per type
  
  -- Metadata
  is_active boolean default true,
  priority integer default 0,  -- Higher = more important
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Composite index for fast filtering
  constraint unique_org_domain_type_title unique (organization_id, domain, knowledge_type, title)
);

-- Enable RLS (Row Level Security) - CRITICAL FOR ISOLATION
alter table public.organization_knowledge enable row level security;

-- POLICY 1: Users can ONLY see their org's knowledge
create policy "Users see only their org knowledge" on public.organization_knowledge
  for select using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );

-- POLICY 2: Managers can insert/update their org's knowledge
create policy "Managers manage their org knowledge" on public.organization_knowledge
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and organization_id = public.organization_knowledge.organization_id
      and role in ('manager', 'admin')
    )
  );

-- Indexes for performance
create index idx_knowledge_org_domain on public.organization_knowledge(organization_id, domain);
create index idx_knowledge_type on public.organization_knowledge(knowledge_type);
create index idx_knowledge_active on public.organization_knowledge(is_active) where is_active = true;

-- Sample data structure examples (for documentation):
-- 
-- PRODUCT_INFO:
-- {
--   "description": "AI coaching platform for sales teams",
--   "key_features": ["Real-time coaching", "Hebrew support"],
--   "pricing": "Starting at $99/user/month",
--   "target_audience": "B2B SaaS companies"
-- }
--
-- OBJECTIONS:
-- {
--   "objection_text": "יקר מדי",
--   "category": "price",
--   "response": "בואו נחשב ROI...",
--   "success_rate": 0.78,
--   "tips": ["Focus on value", "Share case study"]
-- }
--
-- COMPETITORS:
-- {
--   "competitor_name": "Salesforce",
--   "our_advantages": ["40% cheaper", "Hebrew support"],
--   "their_weaknesses": ["Complex", "Slow setup"],
--   "battle_card_response": "מעולה! הרבה לקוחות..."
-- }
