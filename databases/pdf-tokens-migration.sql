-- Migration: pdf_tokens table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pdf_tokens (
  token       TEXT PRIMARY KEY,          -- short 8-char random ID, e.g. "xk9mpqr2"
  bucket      TEXT NOT NULL,             -- Supabase storage bucket name
  storage_path TEXT NOT NULL,            -- path inside the bucket
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: auto-clean tokens older than 30 days (run as a cron job or pg_cron)
-- DELETE FROM pdf_tokens WHERE created_at < NOW() - INTERVAL '30 days';
