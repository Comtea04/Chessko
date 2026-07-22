-- Run this once against the relational Supabase project (SQL editor, or `supabase db execute`).
-- This is NOT the pgvector project used by RagService — see supabase_setup.sql for that one.
--
-- The community layer: users contribute a MOVE at a position, and IDEAS explaining it. Ideas are
-- what people actually come for — the same move gets many, all different, and that is the point,
-- so nothing here tries to deduplicate them. Moves do get deduplicated, because a move at a
-- position is a fact: two users playing 4.Ng5 in the Two Knights are talking about one thing.
--
-- Two gates, deliberately different:
--   * an idea EXISTS as soon as it is written (visible in the board, votable, reportable)
--   * an idea is PROMOTED — shown by default under the move, shipped in the offline bundle — only
--     when an admin says so.
-- Votes never publish anything on their own; they only order the review queue. That is why the app
-- can vote without an account: forging device votes costs an admin nothing but a reshuffled list.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Contributors
-- ---------------------------------------------------------------------------

-- Only the website signs people in (Google/Apple via Supabase Auth). The mobile app stays
-- account-free: it reads, and it votes with a device id.
create table if not exists profiles (
    id           uuid primary key references auth.users on delete cascade,
    display_name text not null check (length(trim(display_name)) between 1 and 40),
    is_admin     boolean not null default false,
    -- Which terms they agreed to, and when. Recorded per version: the licence users grant (including
    -- the right to summarise their text) is the only basis for showing or adapting what they wrote,
    -- so "they agreed" has to be answerable for the wording in force at the time.
    terms_version     text,
    terms_accepted_at timestamptz,
    created_at   timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into profiles (id, display_name)
    values (
        new.id,
        coalesce(
            nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
            split_part(new.email, '@', 1),
            '기여자'
        )
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

-- Admin checks run inside RLS policies on tables that themselves have RLS, so they must not
-- re-enter those policies — hence security definer.
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
    select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- is_admin is not self-service. `auth.uid()` is null when the statement runs under the service key
-- (Supabase SQL editor, server-side jobs), which is how the first admin gets made — without that
-- escape there is no way to bootstrap one, since only an admin could grant it.
create or replace function guard_admin_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.is_admin is distinct from old.is_admin and auth.uid() is not null and not is_admin() then
        raise exception 'is_admin can only be changed by an admin';
    end if;
    return new;
end;
$$;

drop trigger if exists profiles_guard_admin on profiles;
create trigger profiles_guard_admin
    before update on profiles
    for each row execute function guard_admin_flag();

-- ---------------------------------------------------------------------------
-- Moves
-- ---------------------------------------------------------------------------

-- `fen` is the position BEFORE the move, normalised to the four fields that identify a position:
-- placement, side to move, castling rights, en-passant target. The two move counters are dropped
-- and the en-passant square is only kept when a capture is actually available — without both of
-- those, transpositions that are the same position land on different rows. The client normalises
-- (chess.js knows whether the en-passant capture is legal); this only enforces the shape.
--
-- `san` carries no grade suffix. A community move's grade comes from the engine, baked at
-- submission by the backend's Stockfish pool, and read the same way the app reads its own
-- generated annotations.
create table if not exists move_nodes (
    id           bigint generated always as identity primary key,
    fen          text not null check (fen ~ '^[1-8pnbrqkPNBRQK/]+ [wb] (-|K?Q?k?q?) (-|[a-h][36])$'),
    san          text not null check (san ~ '^[a-zA-Z0-9+#=-]{2,7}$'),
    status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    -- Engine verdict on the move, from white's perspective, as centipawns or mate distance.
    eval_cp      int,
    eval_mate    int,
    eval_depth   int,
    submitted_by uuid references profiles on delete set null,
    created_at   timestamptz not null default now(),
    reviewed_at  timestamptz,
    reviewed_by  uuid references profiles on delete set null,
    unique (fen, san)
);

create index if not exists move_nodes_status_idx on move_nodes (status);
create index if not exists move_nodes_fen_idx on move_nodes (fen) where status = 'approved';

-- ---------------------------------------------------------------------------
-- Ideas
-- ---------------------------------------------------------------------------

-- `refs` mirrors the app's Reference type: [{label, url, kind}]. Sources are linked, never pasted —
-- someone else's study text is theirs, and that rule is the same here as in openingNotes.json.
create table if not exists move_ideas (
    id          bigint generated always as identity primary key,
    move_id     bigint not null references move_nodes on delete cascade,
    body        text not null check (length(trim(body)) between 10 and 1000),
    refs        jsonb not null default '[]'::jsonb check (jsonb_typeof(refs) = 'array'),
    -- held: caught by the ad filter below, kept out of the queue until an admin looks.
    status      text not null default 'pending' check (status in ('pending', 'promoted', 'rejected', 'held')),
    -- Who produced the text. 'ai' is a synthesis of other people's ideas, which makes it a derivative
    -- work of theirs rather than user content of its own — it may only be written where the licence
    -- in the accepted terms allows it, and it is reviewed like everything else.
    origin      text not null default 'user' check (origin in ('user', 'admin', 'ai')),
    -- The one explanation shown as the move's main text, above the community's best. At most one per
    -- move, admin only.
    is_official boolean not null default false,
    -- The submitter's own assertion that they wrote it. Not a shield against a rights holder, but it
    -- is what makes a repeat copier answerable rather than the service.
    authorship_confirmed boolean not null default false,
    reject_reason text check (reject_reason in ('copyright', 'wrong', 'ad', 'abuse', 'duplicate', 'other')),
    author_id   uuid not null references profiles on delete cascade,
    created_at  timestamptz not null default now(),
    reviewed_at timestamptz,
    reviewed_by uuid references profiles on delete set null,
    -- Being the official text is a promoted state by definition; the two can't disagree.
    check (not is_official or status = 'promoted'),
    -- A synthesis is the service's own writing, so nobody is asserting authorship of it.
    check (origin <> 'user' or authorship_confirmed)
);

create index if not exists move_ideas_move_idx on move_ideas (move_id);
create index if not exists move_ideas_status_idx on move_ideas (status);
create unique index if not exists move_ideas_official_idx on move_ideas (move_id) where is_official;

-- ---------------------------------------------------------------------------
-- Votes
-- ---------------------------------------------------------------------------

-- Exactly one of user_id (website) / device_id (app, no account) identifies the voter. The unique
-- indexes are the whole anti-inflation story, and they are enough because votes only sort a queue.
create table if not exists idea_votes (
    id         bigint generated always as identity primary key,
    idea_id    bigint not null references move_ideas on delete cascade,
    user_id    uuid references profiles on delete cascade,
    device_id  text check (length(device_id) between 8 and 128),
    created_at timestamptz not null default now(),
    check (num_nonnulls(user_id, device_id) = 1)
);

create unique index if not exists idea_votes_user_idx on idea_votes (idea_id, user_id) where user_id is not null;
create unique index if not exists idea_votes_device_idx on idea_votes (idea_id, device_id) where device_id is not null;

-- ---------------------------------------------------------------------------
-- Reports (App Store guideline 1.2 needs a way to flag content from inside the app)
-- ---------------------------------------------------------------------------

-- Handling has to be recorded, not just receipt. The OSP liability limit rests on having acted on
-- notice, and "we took it down the same day" is only arguable if there is a row that says so.
create table if not exists idea_reports (
    id          bigint generated always as identity primary key,
    idea_id     bigint not null references move_ideas on delete cascade,
    reason      text not null check (reason in ('ad', 'wrong', 'abuse', 'copyright', 'other')),
    detail      text check (length(detail) <= 500),
    user_id     uuid references profiles on delete set null,
    device_id   text check (length(device_id) between 8 and 128),
    status      text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
    resolution  text check (length(resolution) <= 500),
    resolved_at timestamptz,
    resolved_by uuid references profiles on delete set null,
    created_at  timestamptz not null default now()
);

create index if not exists idea_reports_idea_idx on idea_reports (idea_id);
create index if not exists idea_reports_open_idx on idea_reports (created_at) where status = 'open';

-- ---------------------------------------------------------------------------
-- Flood control — protects review time, not the app
-- ---------------------------------------------------------------------------

-- One function for both tables, so the column holding the author is read out of the row rather than
-- named directly: plpgsql resolves NEW.<field> at run time and would fail on whichever table lacks
-- the other's column.
create or replace function enforce_daily_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    col    text := case tg_table_name when 'move_ideas' then 'author_id' else 'submitted_by' end;
    cap    int  := case tg_table_name when 'move_ideas' then 30 else 20 end;
    author uuid := (to_jsonb(new) ->> col)::uuid;
    used   int;
begin
    if author is null or is_admin() then
        return new;
    end if;
    execute format(
        'select count(*) from %I where %I = $1 and created_at > now() - interval ''24 hours''',
        tg_table_name, col
    ) into used using author;

    if used >= cap then
        raise exception '하루에 올릴 수 있는 개수(%)를 넘었습니다. 내일 다시 시도해 주세요.', cap
            using errcode = 'check_violation';
    end if;
    return new;
end;
$$;

drop trigger if exists move_ideas_daily_limit on move_ideas;
create trigger move_ideas_daily_limit
    before insert on move_ideas
    for each row execute function enforce_daily_limit();

drop trigger if exists move_nodes_daily_limit on move_nodes;
create trigger move_nodes_daily_limit
    before insert on move_nodes
    for each row execute function enforce_daily_limit();

-- Ads are the one kind of junk with a reliable signature. Anything matching lands as 'held' rather
-- than 'pending': it still reaches the queue, but labelled, so the admin UI can leave it in a
-- separate pile instead of mixing it into the ideas actually worth reading.
create or replace function hold_suspicious_ideas()
returns trigger language plpgsql set search_path = public as $$
begin
    if new.body ~* '(https?://|www\.|\.com|\.net|카카오톡|오픈채팅|010[-. ]?[0-9]{4}|[0-9]{1,3}만\s*원|무료\s*체험)' then
        new.status := 'held';
    end if;
    return new;
end;
$$;

drop trigger if exists move_ideas_hold_suspicious on move_ideas;
create trigger move_ideas_hold_suspicious
    before insert on move_ideas
    for each row execute function hold_suspicious_ideas();

-- ---------------------------------------------------------------------------
-- Reading views
-- ---------------------------------------------------------------------------

create or replace view idea_scores as
select
    i.id            as idea_id,
    i.move_id,
    count(v.id)                                              as votes,
    count(v.id) filter (where v.user_id is not null)         as account_votes,
    count(r.id)                                              as reports,
    -- Raw totals freeze the leaderboard: whatever is shown gets the votes, so nothing new can ever
    -- overtake it. Decaying by age keeps recent ideas reachable in the queue.
    round((count(v.id) + 1)::numeric
          / power(extract(epoch from now() - i.created_at) / 3600.0 + 2, 1.5)::numeric, 6) as hot
from move_ideas i
left join idea_votes v on v.idea_id = i.id
left join idea_reports r on r.idea_id = i.id
group by i.id, i.move_id, i.created_at;

-- What the app ships offline: the official text of an approved move first, then the community's
-- best under it, capped. Everything else is only reachable by opening the board for that move, over
-- the network. `rank` is the display order — 0 is the official one.
create or replace view promoted_ideas as
select m.fen, m.san, m.eval_cp, m.eval_mate,
       top.id as idea_id, top.body, top.refs, top.origin, top.is_official,
       top.author_id, p.display_name as author_name, s.votes,
       row_number() over (partition by m.id order by top.is_official desc, s.votes desc, top.created_at) - 1 as rank
from move_nodes m
join lateral (
    select i.*
    from move_ideas i
    left join idea_scores sc on sc.idea_id = i.id
    where i.move_id = m.id and i.status = 'promoted'
    order by i.is_official desc, coalesce(sc.votes, 0) desc, i.created_at
    limit 6
) top on true
join idea_scores s on s.idea_id = top.id
left join profiles p on p.id = top.author_id
where m.status = 'approved';

-- Someone who has had one idea pulled for copying probably has others. Rejections and upheld
-- reports are counted together so the same person turning up twice is visible without digging.
create or replace view contributor_strikes as
select p.id, p.display_name,
       count(*) filter (where i.reject_reason = 'copyright')            as copyright_rejections,
       count(*) filter (where i.reject_reason is not null)              as total_rejections,
       count(*) filter (where r.status = 'actioned')                    as upheld_reports,
       max(coalesce(i.reviewed_at, r.resolved_at))                      as last_strike_at
from profiles p
join move_ideas i on i.author_id = p.id
left join idea_reports r on r.idea_id = i.id
where i.reject_reason is not null or r.status = 'actioned'
group by p.id, p.display_name;

-- The admin queue: what is waiting, hottest first, with the engine's verdict already attached so
-- the call is a glance rather than an investigation.
create or replace view review_queue as
select i.id as idea_id, i.body, i.refs, i.status, i.created_at,
       m.id as move_id, m.fen, m.san, m.status as move_status, m.eval_cp, m.eval_mate,
       p.display_name as author_name,
       s.votes, s.reports, s.hot
from move_ideas i
join move_nodes m on m.id = i.move_id
join idea_scores s on s.idea_id = i.id
left join profiles p on p.id = i.author_id
where i.status in ('pending', 'held')
order by s.hot desc;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table profiles     enable row level security;
alter table move_nodes   enable row level security;
alter table move_ideas   enable row level security;
alter table idea_votes   enable row level security;
alter table idea_reports enable row level security;

create policy profiles_read   on profiles for select using (true);
create policy profiles_update on profiles for update using (id = auth.uid() or is_admin());

-- Rejected content disappears for everyone but its author and the admins.
create policy move_nodes_read on move_nodes for select
    using (status <> 'rejected' or submitted_by = auth.uid() or is_admin());
create policy move_nodes_insert on move_nodes for insert to authenticated
    with check (submitted_by = auth.uid() and status = 'pending');
create policy move_nodes_admin on move_nodes for update using (is_admin());
create policy move_nodes_delete on move_nodes for delete using (is_admin());

create policy move_ideas_read on move_ideas for select
    using (status <> 'rejected' or author_id = auth.uid() or is_admin());
-- A contributor may only file plain user-written ideas, pending, with authorship asserted — the
-- checkbox is enforced here rather than trusted to the form. 'admin'/'ai' origin and the official
-- slot are the admin's alone.
create policy move_ideas_insert on move_ideas for insert to authenticated
    with check (
        author_id = auth.uid()
        and (is_admin() or (origin = 'user' and status = 'pending' and not is_official and authorship_confirmed))
    );
-- An author may fix their own wording until it has been ruled on; after that it is the admin's.
-- The WITH CHECK is what stops an author promoting their own idea — the whole approval gate rests
-- on it. Postgres would infer the same expression from USING if it were omitted, but this rule is
-- too important to leave to a default nobody can see.
create policy move_ideas_update on move_ideas for update
    using ((author_id = auth.uid() and status in ('pending', 'held')) or is_admin())
    with check (
        is_admin()
        or (author_id = auth.uid() and status in ('pending', 'held') and not is_official and origin = 'user')
    );
create policy move_ideas_delete on move_ideas for delete
    using (author_id = auth.uid() or is_admin());

create policy idea_votes_read on idea_votes for select using (true);
create policy idea_votes_insert_user on idea_votes for insert to authenticated
    with check (user_id = auth.uid() and device_id is null);
-- The app votes without an account. The unique index caps it at one vote per device per idea.
create policy idea_votes_insert_device on idea_votes for insert to anon
    with check (user_id is null and device_id is not null);
create policy idea_votes_delete on idea_votes for delete
    using (user_id = auth.uid() or is_admin());

create policy idea_reports_insert on idea_reports for insert to anon, authenticated
    with check (status = 'open' and resolved_at is null);
create policy idea_reports_read on idea_reports for select using (is_admin());
create policy idea_reports_resolve on idea_reports for update using (is_admin()) with check (is_admin());
