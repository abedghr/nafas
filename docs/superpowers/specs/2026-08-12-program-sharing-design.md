# Program Sharing — Design Spec

Date: 2026-08-12 · Status: approved

## Goal
A user authors a multi-week training program (N weeks, per-week name/info, per-day
exercises), then shares it with another user. The recipient accepts, gets their **own
snapshot copy** in their programs, and **cannot re-share it** — only the original owner can.
Shares carry an optional **claim expiry** and an optional **access expiry** (each with an
"unlimited" option).

## Model: snapshot copy (approved option A)
On accept, deep-copy the program into a new row owned by the recipient. No live link to the
owner. Owner edits/deletes never affect the recipient's copy.

## Authoring additions
- `programs.weekMeta jsonb` = `[{ index:number, name:string, notes:string }]` (default `[]`).
  Weeks are already an integer count; days already hold exercises. Edit UI gains name+notes per week.

## Data model
New columns on `programs`:
- `sourceOwnerId uuid null` — set on snapshots; `null` = an original the user authored.
- `accessExpiresAt timestamp null` — snapshot access window; `null` = unlimited.
- `weekMeta jsonb default []`.

New table `program_shares` (one share offer):
- `id, programId (owner original), fromUserId, toUserId (null for code shares), code (null for direct),`
- `claimExpiresAt timestamp null (null=unlimited), accessExpiresAt timestamp null (null=unlimited),`
- `status: pending|accepted|declined|revoked|expired, createdAt, acceptedAt`.
- Indexes: by toUserId+status (incoming inbox), unique on code.

## Re-share lock
Only programs with `sourceOwnerId IS NULL` (originals) can be shared. Snapshots cannot. The
recipient MAY edit their own snapshot; they just cannot re-share it. The Share button is hidden
on snapshots.

## Snapshot-on-accept
Copy program row (new id, userId=recipient, `sourceOwnerId=share.fromUserId`,
`accessExpiresAt=share.accessExpiresAt`, copy name/weeks/notes/startDate=null/weekMeta) + all
`program_days` rows. Mark share `accepted`, set `acceptedAt`.

## Expiry (computed at read; no cron)
- Claim: accept/redeem past `claimExpiresAt` → reject "expired" and flip share.status=expired.
- Access: program listing flags/hides snapshots past `accessExpiresAt` (server marks `expired:true`).

## Endpoints
- `POST /programs/:id/share { toUserId?, generateCode?, claimExpiresAt?, accessExpiresAt? }`
  → 201 share (with `code` when generated). Owner + original only; 403 on snapshot.
- `GET /program-invites` → my pending incoming shares (joined with program name + owner name).
- `POST /program-invites/:id/accept` → snapshot-copy; 201 new program. `/decline` → 200.
- `POST /program-shares/claim { code }` → resolve code → accept path.
- `GET /users/search?q=` → `[{ id, name, username, avatar }]` (min 2 chars, cap 20). New.
- Existing `/programs*` unchanged; list response gains `expired` + `shared` flags per program.

## Client surfaces
- **Programs screen:** pinned **Invites** section (name, owner, Accept/Decline) when any pending;
  small count badge on the Workout tab. Expired snapshots greyed/hidden.
- **Program detail (owner + original only):** Share button → sheet with:
  user search (username) OR generate code/link, plus two expiry pickers each with an "Unlimited"
  toggle. Snapshots show no Share button and no re-share.
- **Week meta:** program create/edit gains per-week name + notes fields.

## Scope / YAGNI
No live sync, no post-accept revoke beyond the access window, no notifications system (badge +
pinned section only), snapshots editable by recipient. Auth: every endpoint checks ownership
from the session; toUserId/code never trusted for authorization.

## Verification
- Owner shares to user B (direct + code); B sees invite, accepts → snapshot in B's list, B has no
  Share button on it; B edits copy without affecting A. Claim past claimExpiry → rejected. Snapshot
  past accessExpiry → hidden/greyed. Cross-user share of a snapshot → 403.
