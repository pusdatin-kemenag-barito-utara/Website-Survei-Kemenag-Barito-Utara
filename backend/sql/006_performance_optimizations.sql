-- ============================================================
-- SIKAP KEMENAG: High-Performance Database Optimizations
-- GIN Trigram Indexing, Functional Date Indexing & Composite Keys
-- ============================================================

-- 1. Enable PostgreSQL Trigram Extension for sub-millisecond text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN Trigram Indexes for Admin Responses Search (Replaces slow full table sequential scans)
CREATE INDEX IF NOT EXISTS idx_responses_name_trgm 
ON kemenag_survey.responses 
USING gin (respondent_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_responses_contact_trgm 
ON kemenag_survey.responses 
USING gin (respondent_contact gin_trgm_ops);

-- 3. Functional Date Index for Range Filtering (e.g. submitted_at::date >= date_from)
CREATE INDEX IF NOT EXISTS idx_responses_submitted_date 
ON kemenag_survey.responses (((submitted_at AT TIME ZONE 'UTC')::date));

-- 4. Composite Covering Indexes for Fast Calculation & Aggregation
CREATE INDEX IF NOT EXISTS idx_response_answers_comp_calc 
ON kemenag_survey.response_answers (unsur_id, rating_value, response_id);

CREATE INDEX IF NOT EXISTS idx_response_answers_resp_unsur 
ON kemenag_survey.response_answers (response_id, unsur_id);

CREATE INDEX IF NOT EXISTS idx_response_demographics_field_val 
ON kemenag_survey.response_demographics (field_id, value, response_id);
