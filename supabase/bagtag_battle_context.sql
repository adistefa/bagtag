-- Migration: bagtag battle context (locations, courses, events)
-- Safe, idempotent changes that only affect the `bagtag` schema.
-- Do NOT execute this file here; it's a migration script to be applied in staging/production.

-- 1) LOCATIONS
CREATE TABLE IF NOT EXISTS bagtag.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent accidental duplicates caused only by case or surrounding whitespace.
-- Use a unique index on lower(trim(name)). This enforces uniqueness in a case-insensitive, trimmed way.
CREATE UNIQUE INDEX IF NOT EXISTS locations_name_normalized_unique
  ON bagtag.locations ((lower(btrim(name))));

CREATE INDEX IF NOT EXISTS locations_name_normalized_idx
  ON bagtag.locations ((lower(btrim(name))));

-- Reject empty or whitespace-only names for locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'locations_name_not_blank_check' AND connamespace = 'bagtag'::regnamespace
  ) THEN
    ALTER TABLE bagtag.locations
      ADD CONSTRAINT locations_name_not_blank_check CHECK (btrim(name) <> '');
  END IF;
END$$;

-- 2) COURSES
CREATE TABLE IF NOT EXISTS bagtag.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES bagtag.locations(id),
  name TEXT NOT NULL,
  default_holes SMALLINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course names must be unique per-location in a case-insensitive, trimmed manner.
CREATE UNIQUE INDEX IF NOT EXISTS courses_location_name_normalized_unique
  ON bagtag.courses(location_id, (lower(btrim(name))));

-- Helpful lookup index for courses by location
CREATE INDEX IF NOT EXISTS courses_location_idx ON bagtag.courses(location_id);

-- default_holes must be NULL or > 0. Add constraint only if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_default_holes_check' AND connamespace = 'bagtag'::regnamespace
  ) THEN
    ALTER TABLE bagtag.courses
      ADD CONSTRAINT courses_default_holes_check CHECK (default_holes IS NULL OR default_holes > 0);
  END IF;
END$$;

-- Reject empty or whitespace-only course names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_name_not_blank_check' AND connamespace = 'bagtag'::regnamespace
  ) THEN
    ALTER TABLE bagtag.courses
      ADD CONSTRAINT courses_name_not_blank_check CHECK (btrim(name) <> '');
  END IF;
END$$;

-- 3) EVENTS
CREATE TABLE IF NOT EXISTS bagtag.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event names should not duplicate by case/whitespace.
CREATE UNIQUE INDEX IF NOT EXISTS events_name_normalized_unique
  ON bagtag.events ((lower(btrim(name))));

CREATE INDEX IF NOT EXISTS events_name_normalized_idx
  ON bagtag.events ((lower(btrim(name))));

-- Reject empty or whitespace-only event names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_name_not_blank_check' AND connamespace = 'bagtag'::regnamespace
  ) THEN
    ALTER TABLE bagtag.events
      ADD CONSTRAINT events_name_not_blank_check CHECK (btrim(name) <> '');
  END IF;
END$$;

-- 4) ALTER EXISTING battles TABLE: add nullable columns and checks
ALTER TABLE bagtag.battles
  ADD COLUMN IF NOT EXISTS event_id UUID NULL REFERENCES bagtag.events(id);

ALTER TABLE bagtag.battles
  ADD COLUMN IF NOT EXISTS location_id UUID NULL REFERENCES bagtag.locations(id);

ALTER TABLE bagtag.battles
  ADD COLUMN IF NOT EXISTS course_id UUID NULL REFERENCES bagtag.courses(id);

ALTER TABLE bagtag.battles
  ADD COLUMN IF NOT EXISTS holes_played SMALLINT NULL;

ALTER TABLE bagtag.battles
  ADD COLUMN IF NOT EXISTS variant TEXT NULL;

-- holes_played must be NULL or > 0. Add constraint idempotently.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'battles_holes_played_check' AND connamespace = 'bagtag'::regnamespace
  ) THEN
    ALTER TABLE bagtag.battles
      ADD CONSTRAINT battles_holes_played_check CHECK (holes_played IS NULL OR holes_played > 0);
  END IF;
END$$;

-- 5) ENFORCE: selected course must belong to selected location
-- 5) RELATIONAL ENFORCEMENT: selected course must belong to selected location
-- Instead of a trigger, enforce via a composite foreign key on (course_id, location_id)
-- To reference (id, location_id) the referenced columns must be constrained UNIQUE in bagtag.courses.

-- Ensure courses has a unique constraint over (id, location_id) so it can be referenced as a composite target.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_id_location_unique' AND connamespace = 'bagtag'::regnamespace
  ) THEN
    ALTER TABLE bagtag.courses
      ADD CONSTRAINT courses_id_location_unique UNIQUE (id, location_id);
  END IF;
END$$;

-- Add composite foreign key from battles(course_id, location_id) -> courses(id, location_id).
-- This is only checked when both columns are non-NULL, which matches the desired behaviour.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'battles_course_location_fkey' AND connamespace = 'bagtag'::regnamespace
  ) THEN
    ALTER TABLE bagtag.battles
      ADD CONSTRAINT battles_course_location_fkey FOREIGN KEY (course_id, location_id)
      REFERENCES bagtag.courses(id, location_id);
  END IF;
END$$;

-- 6) RLS: enable row-level security on new tables (no policies created here)
ALTER TABLE IF EXISTS bagtag.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bagtag.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bagtag.events ENABLE ROW LEVEL SECURITY;

-- 7) INDEXES: battles by location/course/event to help queries
CREATE INDEX IF NOT EXISTS battles_location_idx ON bagtag.battles(location_id);
CREATE INDEX IF NOT EXISTS battles_course_idx ON bagtag.battles(course_id);
CREATE INDEX IF NOT EXISTS battles_event_idx ON bagtag.battles(event_id);

-- 8) SEED: idempotent insert for Hardhof and its two known layouts
-- Use lower(btrim(name)) checks to avoid duplicates caused by case/whitespace.

-- Insert Hardhof location if missing
INSERT INTO bagtag.locations (id, name, created_at)
SELECT gen_random_uuid(), 'Hardhof', now()
WHERE NOT EXISTS (
  SELECT 1 FROM bagtag.locations WHERE lower(btrim(name)) = lower(btrim('Hardhof'))
);

-- Insert the two Hardhof courses if missing (12 holes and 18 holes)
WITH loc AS (
  SELECT id FROM bagtag.locations WHERE lower(btrim(name)) = lower(btrim('Hardhof')) LIMIT 1
)
INSERT INTO bagtag.courses (id, location_id, name, default_holes, created_at)
SELECT gen_random_uuid(), loc.id, '12 holes', 12, now()
FROM loc
WHERE NOT EXISTS (
  SELECT 1 FROM bagtag.courses c WHERE c.location_id = loc.id AND lower(btrim(c.name)) = lower(btrim('12 holes'))
);

WITH loc AS (
  SELECT id FROM bagtag.locations WHERE lower(btrim(name)) = lower(btrim('Hardhof')) LIMIT 1
)
INSERT INTO bagtag.courses (id, location_id, name, default_holes, created_at)
SELECT gen_random_uuid(), loc.id, '18 holes', 18, now()
FROM loc
WHERE NOT EXISTS (
  SELECT 1 FROM bagtag.courses c WHERE c.location_id = loc.id AND lower(btrim(c.name)) = lower(btrim('18 holes'))
);

-- End of migration
