-- CANONICAL bagtag API: confirm_battle RPC and read views
-- Copy of the intended canonical implementation. If this looks good,
-- I will replace `supabase/bagtag_api.sql` with this content (you already
-- approved that). No SQL will be executed and nothing will be committed.

-- -----------------------------
-- Read views (read-only)
-- -----------------------------
CREATE OR REPLACE VIEW bagtag.v_leaderboard AS
SELECT
  t.number AS tag_number,
  t.owner_id AS player_id,
  p.username,
  p.display_name,
  t.assigned_at
FROM bagtag.tags t
LEFT JOIN bagtag.players p ON p.id = t.owner_id
ORDER BY t.number;

CREATE OR REPLACE VIEW bagtag.v_battle_history AS
SELECT
  bp.battle_id,
  b.played_at,
  e.name AS event,
  l.name AS location,
  c.name AS course,
  b.holes_played,
  b.variant,
  bp.player_id,
  bp.player_name_snapshot AS name,
  bp.score,
  bp.position,
  bp.starting_tag,
  bp.resulting_tag
FROM bagtag.battle_participants bp
JOIN bagtag.battles b ON b.id = bp.battle_id
LEFT JOIN bagtag.events e ON e.id = b.event_id
LEFT JOIN bagtag.locations l ON l.id = b.location_id
LEFT JOIN bagtag.courses c ON c.id = b.course_id
ORDER BY b.played_at DESC, bp.position;

-- -----------------------------
-- RPC: bagtag.confirm_battle
-- -----------------------------
-- Signature:
-- (participants jsonb, location_name text, course_name text,
--  holes_played smallint DEFAULT NULL,
--  event_name text DEFAULT NULL,
--  variant text DEFAULT NULL)

CREATE OR REPLACE FUNCTION bagtag.confirm_battle(
  participants jsonb,
  location_name text,
  course_name text,
  holes_played smallint DEFAULT NULL,
  event_name text DEFAULT NULL,
  variant text DEFAULT NULL
+) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loc_name text := btrim(COALESCE(location_name,''));
  v_course_name text := btrim(COALESCE(course_name,''));
  v_event_name text := NULL::text;
  v_variant text := NULL::text;
  v_loc_id uuid;
  v_course_id uuid;
  v_event_id uuid := NULL;
  v_battle_id uuid;
  v_played_at timestamptz;
  now_ts timestamptz := clock_timestamp();

  rec RECORD;
  cnt int;
  uniqcnt int;
  idx int := 0;

BEGIN
  PERFORM set_config('search_path', 'pg_catalog', true);

  IF v_loc_name = '' THEN
    RAISE EXCEPTION 'location_name must not be blank';
  END IF;
  IF v_course_name = '' THEN
    RAISE EXCEPTION 'course_name must not be blank';
  END IF;

  IF btrim(COALESCE(event_name,'')) <> '' THEN
    v_event_name := btrim(event_name);
  END IF;
  IF btrim(COALESCE(variant,'')) <> '' THEN
    v_variant := btrim(variant);
  END IF;

  IF jsonb_typeof(participants) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'participants must be a json array';
  END IF;

  CREATE TEMP TABLE tmp_participants(
    player_id uuid PRIMARY KEY,
    score integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_participants(player_id, score)
  SELECT (elem->>'player_id')::uuid, (elem->>'score')::int
  FROM jsonb_array_elements(participants) AS arr(elem);

  SELECT count(*) INTO cnt FROM tmp_participants;
  IF cnt < 2 THEN
    RAISE EXCEPTION 'at least 2 participants required';
  END IF;

  SELECT count(DISTINCT player_id) INTO uniqcnt FROM tmp_participants;
  IF uniqcnt <> cnt THEN
    RAISE EXCEPTION 'duplicate player_id in participants';
  END IF;

  IF EXISTS (SELECT 1 FROM tmp_participants WHERE score IS NULL OR score < 0) THEN
    RAISE EXCEPTION 'scores must be integers >= 0';
  END IF;

  CREATE TEMP TABLE tmp_players AS
  SELECT p.id AS player_id, COALESCE(p.display_name, p.username) AS player_name
  FROM bagtag.players p
  JOIN tmp_participants tp ON tp.player_id = p.id;

  IF (SELECT count(*) FROM tmp_players) <> (SELECT count(*) FROM tmp_participants) THEN
    RAISE EXCEPTION 'every participant must reference an existing player';
  END IF;

  SELECT id INTO v_loc_id FROM bagtag.locations WHERE lower(btrim(name)) = lower(btrim(v_loc_name)) LIMIT 1;
  IF v_loc_id IS NULL THEN
    BEGIN
      INSERT INTO bagtag.locations(id, name, created_at)
      VALUES (gen_random_uuid(), btrim(v_loc_name), now())
      RETURNING id INTO v_loc_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_loc_id FROM bagtag.locations WHERE lower(btrim(name)) = lower(btrim(v_loc_name)) LIMIT 1;
    END;
  END IF;

  SELECT id INTO v_course_id FROM bagtag.courses
  WHERE location_id = v_loc_id AND lower(btrim(name)) = lower(btrim(v_course_name)) LIMIT 1;
  IF v_course_id IS NULL THEN
    BEGIN
      INSERT INTO bagtag.courses(id, location_id, name, default_holes, created_at)
      VALUES (gen_random_uuid(), v_loc_id, btrim(v_course_name),
              CASE WHEN holes_played IS NOT NULL THEN holes_played ELSE NULL END,
              now())
      RETURNING id INTO v_course_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_course_id FROM bagtag.courses
      WHERE location_id = v_loc_id AND lower(btrim(name)) = lower(btrim(v_course_name)) LIMIT 1;
    END;
  END IF;

  IF v_event_name IS NOT NULL THEN
    SELECT id INTO v_event_id FROM bagtag.events WHERE lower(btrim(name)) = lower(btrim(v_event_name)) LIMIT 1;
    IF v_event_id IS NULL THEN
      BEGIN
        INSERT INTO bagtag.events(id, name, created_at)
        VALUES (gen_random_uuid(), btrim(v_event_name), now())
        RETURNING id INTO v_event_id;
      EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_event_id FROM bagtag.events WHERE lower(btrim(name)) = lower(btrim(v_event_name)) LIMIT 1;
      END;
    END IF;
  END IF;

  IF holes_played IS NOT NULL AND holes_played <= 0 THEN
    RAISE EXCEPTION 'holes_played must be > 0 when provided';
  END IF;

  CREATE TEMP TABLE tmp_tags_before AS
  SELECT t.number, t.owner_id, t.assigned_at
  FROM bagtag.tags t
  WHERE t.owner_id IN (SELECT player_id FROM tmp_participants)
  ORDER BY t.number
  FOR UPDATE;

  IF (SELECT count(*) FROM tmp_tags_before) <> (SELECT count(*) FROM tmp_participants) THEN
    RAISE EXCEPTION 'every participant must currently own exactly one Tag';
  END IF;

  CREATE TEMP TABLE tmp_results AS
  SELECT tp.player_id, p.player_name, tp.score, tb.number AS starting_tag, NULL::integer AS position, NULL::smallint AS resulting_tag
  FROM tmp_participants tp
  JOIN tmp_players p ON p.player_id = tp.player_id
  JOIN tmp_tags_before tb ON tb.owner_id = tp.player_id;

  idx := 0;
  FOR rec IN SELECT player_id, score, starting_tag FROM tmp_results ORDER BY score ASC, starting_tag ASC LOOP
    idx := idx + 1;
    UPDATE tmp_results SET position = idx WHERE player_id = rec.player_id;
  END LOOP;

  CREATE TEMP TABLE tmp_sorted_tags AS
  SELECT number AS tag_number, row_number() OVER (ORDER BY number) AS seq
  FROM tmp_tags_before
  ORDER BY number;

  CREATE TEMP TABLE tmp_assign AS SELECT NULL::smallint AS tag_number, NULL::uuid AS new_owner LIMIT 0;
  idx := 0;
  FOR rec IN SELECT player_id FROM tmp_results ORDER BY position ASC LOOP
    idx := idx + 1;
    INSERT INTO tmp_assign(tag_number, new_owner)
    SELECT tag_number, rec.player_id FROM tmp_sorted_tags WHERE seq = idx;
    UPDATE tmp_results SET resulting_tag = (SELECT tag_number FROM tmp_sorted_tags WHERE seq = idx) WHERE player_id = rec.player_id;
  END LOOP;

  UPDATE bagtag.tags SET owner_id = NULL WHERE number IN (SELECT tag_number FROM tmp_assign);

  INSERT INTO bagtag.battles(played_at, created_at, created_by, event_id, location_id, course_id, holes_played, variant)
  VALUES (now_ts, now_ts, NULL, v_event_id, v_loc_id, v_course_id, holes_played, v_variant)
  RETURNING id, played_at INTO v_battle_id, v_played_at;

  INSERT INTO bagtag.battle_participants(battle_id, player_id, player_name_snapshot, score, position, starting_tag, resulting_tag, created_at)
  SELECT v_battle_id, r.player_id, r.player_name, r.score, r.position, r.starting_tag, r.resulting_tag, now_ts
  FROM tmp_results r
  ORDER BY r.position;

  UPDATE bagtag.tags t
  SET owner_id = a.new_owner,
      assigned_at = CASE WHEN b.owner_id IS DISTINCT FROM a.new_owner THEN v_played_at ELSE b.assigned_at END
  FROM tmp_assign a
  JOIN tmp_tags_before b ON b.number = a.tag_number
  WHERE t.number = a.tag_number;

  INSERT INTO bagtag.tag_transfers(tag_number, from_player_id, to_player_id, battle_id, action, created_by, created_at)
  SELECT a.tag_number, b.owner_id, a.new_owner, v_battle_id, 'battle', NULL, now_ts
  FROM tmp_assign a
  JOIN tmp_tags_before b ON b.number = a.tag_number
  WHERE (b.owner_id IS DISTINCT FROM a.new_owner)
  ORDER BY a.tag_number;

  RETURN jsonb_build_object(
    'battle_id', v_battle_id,
    'played_at', to_jsonb(v_played_at),
    'context', jsonb_build_object(
      'event', (CASE WHEN v_event_id IS NULL THEN NULL ELSE v_event_name END),
      'location', v_loc_name,
      'course', v_course_name,
      'holes_played', holes_played,
      'variant', v_variant
    ),
    'participants', (
      SELECT jsonb_agg(jsonb_build_object(
        'player_id', r.player_id,
        'name', r.player_name,
        'score', r.score,
        'position', r.position,
        'starting_tag', r.starting_tag,
        'resulting_tag', r.resulting_tag
      ) ORDER BY r.position)
      FROM tmp_results r
    ),
    'transfers', (
      SELECT jsonb_agg(jsonb_build_object(
        'tag_number', a.tag_number,
        'from_player_id', b.owner_id,
        'from_name', (SELECT COALESCE(p.display_name, p.username) FROM bagtag.players p WHERE p.id = b.owner_id),
        'to_player_id', a.new_owner,
        'to_name', (SELECT COALESCE(p.display_name, p.username) FROM bagtag.players p WHERE p.id = a.new_owner)
      ) ORDER BY a.tag_number)
      FROM tmp_assign a JOIN tmp_tags_before b ON b.number = a.tag_number
      WHERE (b.owner_id IS DISTINCT FROM a.new_owner)
    )
  );

EXCEPTION WHEN others THEN
  RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION bagtag.confirm_battle(jsonb, text, text, smallint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bagtag.confirm_battle(jsonb, text, text, smallint, text, text) TO anon;

GRANT USAGE ON SCHEMA bagtag TO anon;
GRANT SELECT ON bagtag.v_leaderboard TO anon;
GRANT SELECT ON bagtag.v_battle_history TO anon;

COMMENT ON FUNCTION bagtag.confirm_battle(jsonb, text, text, smallint, text, text) IS
  'Confirm a BagTag battle. SECURITY DEFINER RPC. The bagtag schema must be included in Supabase exposed schemas.';

-- End of canonical API file
