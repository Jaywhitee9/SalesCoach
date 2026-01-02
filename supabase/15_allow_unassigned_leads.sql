-- Fix: Allow leads to be unassigned (owner_id = NULL)
-- This is required for "Unassign Leads" action when deleting a user

ALTER TABLE public.leads ALTER COLUMN owner_id DROP NOT NULL;
