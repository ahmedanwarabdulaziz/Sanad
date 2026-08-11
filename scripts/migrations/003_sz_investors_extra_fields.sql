-- ============================================================
-- Migration 003: Add extra fields to sz_investors
-- Safe to run even if some columns already exist.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.sz_investors
  ADD COLUMN IF NOT EXISTS phone_2               TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS job_in_national_id    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_in_national_id TEXT NOT NULL DEFAULT '';
