# Marquee: Floxum wave 2, paused (resume notes)

## State: DONE except release work. Tests pass on 3 databases (74 tests).
- The 4 charged findings are fixed: forum JS uses Extend.Store and Extend.Model; Later is now queued jobs (DescribeMedia, PruneMedia, FetchSeason); DescribeCommand uses constructor injection; intervention/image is required.
- The pre-floxum lists are fixed:
  - an HttpClients factory;
  - IGDB fails fast instead of usleep;
  - MediaResource uses injection;
  - the empty migration down is filled in;
  - the comment mismatch is fixed;
  - long PHP functions are split;
  - the JS is strict TypeScript with lazy chunks (jsDirectory js/dist/forum, which MUST be committed);
  - MediaHero is split into subjects.tsx;
  - the companion tables and an indexed prune;
  - a posts-include N+1 fix with a query-count test;
  - prune is a single delete statement;
  - one queued describe job per title;
  - a lock on backdrop uploads, with the new locale key api.backdrop_busy (en and fr).
- extend.php reads Settings keys as string literals (the rules.md autoload trap). Deleted-discussion cleanup is on `eloquent.deleting`: core's Deleted event fires after the rows have cascaded.
- The sandbox migration was proved on real data: 25 links, 2 seasons and the related titles moved, and the columns were dropped. The sandbox DB was then restored.

## Left to do
1. Re-run pre-floxum on this branch and confirm 0 findings.
2. Split into proper commits: `feat:` for the companion tables (v1.21.0); `fix:` for the rest. Rebuild js/dist from a fresh `npm ci`.
3. Deploy all 5 to dev together. Screenshot the matrix: default light, dark, coloured header, Bespoke, 390px, iOS and Android. Check the season browser, the Linked title window and Curio's Show-it-off.
4. Update KB article 93 (ext-marquee): queue behaviour, the companion tables, the busy-upload message.
5. Write the changelog: edonline only, because Discuss is paused. Do not request a Floxum review; Ernest does that.

## Why this branch exists

Floxum wave 2 (Ernest 2026-11-19: "I want 100 on everything"; Marquee v1.20.2 was reviewed at 87). Paused on 2026-11-19 by Ernest ("Yes, pause rewrites"), with weekly usage at about 43%; resume after the reset on 2026-11-26. This branch is LOCAL ONLY: nothing is pushed or tagged. Some vendor/ dirs hold an rsync copy of the unreleased Marquee for testing; run `composer install` to get Packagist back.

## The coordinated move (5 repos)

Marquee moves its five columns off `discussions` (marquee_media_id, marquee_season, marquee_episode, marquee_related, marquee_backdrops) into `marquee_discussions` (discussion_id PK, media_id, season, episode, backdrops) plus `marquee_related` (discussion_id, media_id, position). The model is `Ernestdefoe\Marquee\Link`, reached as the Discussion relation `marqueeLink`.

Readers: Curio (MarqueeTitle), Shelf (DiscussionLinks), Club (PickResource), Spoiler Shield (MarkWriter plus its 2026_11_10_200004 backfill). Each reads through `Link` when `class_exists(Link::class)`, and otherwise the old columns.

Release order:
1. Readers first: Curio v1.27.1, Shelf v1.1.4 (v1.1.3 = the security fix shipped alone from main; rebase this branch onto it), Club v1.0.3, Spoiler Shield 1.1.1. Commit subjects `fix:` only, so the drafter bumps the patch.
2. Then Marquee v1.21.0. It needs a `feat:` subject for the minor bump, and its composer.json conflicts with older readers: club <1.0.3, curio <1.27.1, shelf <1.1.4, spoiler-shield <1.1.1. If a reader ships at a different version, raise the conflict to match.
3. Deploy readers first, then Marquee, then `php flarum migrate`. Do it on dev, then the showcase, then any live forum that runs them.
4. Before ANY tag: one combined review package to the Command Center. It needs the commit ranges, each repo's fresh pre-floxum, and tests on SQLite, MySQL and PostgreSQL for all 5 repos. The readers are also tested on SQLite against Marquee 1.20.2.

Spoiler Shield privacy gate: while a discussion saves, Marquee keeps the changed Link as the loaded `marqueeLink` relation (dirty media_id/season/episode; media_id null means unlinked) and writes it in afterSave. MarkWriter::marqueeChange() reads that. Marquee test: `while_a_discussion_saves_its_changed_link_is_the_loaded_relation`.

Test databases used: the Docker containers marquee_mysql_test (127.0.0.1:33911) and marquee_pg_test (127.0.0.1:55911), root/root, prefix dev_, one database per repo (curio_test etc.). They may be gone after the pause; the shared notes file marquee-companion-table-reader-brief.md has the details.
