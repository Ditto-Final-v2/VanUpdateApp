# Halloween party implementation

## Chunk 1 — shared display and OBS

- Rename visible Gold nuggets labels to Mercury Tonic; community goal 10,000.
- Preserve the existing `nuggets` storage field and accumulated total.
- Migration: `20261031030000_mercury_tonic_goal.sql` must be applied to the hosted database.
- Request mine playback unmuted and Dallas playback muted. Browser autoplay rules still apply.
- OBS browser sources: `/halloweenparty/obs?view=chat` (suggest 480 × 800) and `/halloweenparty/obs?view=counter` (suggest 640 × 200). Transparent backgrounds, shared persisted messages and counter, refresh every three seconds.
- Website source changes need deployment before those URLs work on the public site. OBS source configuration remains to be done.

## Chunk 2 — identity and introduction

- Entry `/halloweenparty/magiquest`: first device visit registers a player name.
- New player proceeds to `/halloweenparty/mines` for the mine introduction, then enters the game.
- Game resembles `/halloweenparty`; chat uses the saved player name.
- Persist player identity via an opaque server-issued device cookie and database record; names are display labels, not credentials.
- Add an About the mines section using owner-provided facts; reuse this content for onboarding.
- Confirmed: introduction once per device, returning players resume automatically.
- The Abode is the Dallas party venue; owner will walk them through setup.
- Added all 29 Nevada photos as optimized WebP assets, with a scrollable gallery and full-photo links.
- Introduction uses the owner's account of the abandoned mercury mine, distance from paved roads, and Halloween ghost/rain story.

## Chunk 3 — quests and rewards

- Show current quest, personal Mercury Tonic total, and a button below chat.
- `!quest` button becomes `!done` when a quest is active; five-second cooldown applies to buttons and typed commands on the server.
- New player's first quest is always “Possess a fellow party goer: take a clothespin and secretly pin it on someone's costume” (100 Mercury Tonic).
- `!quest` assigns a quest and posts “PLAYER has been given the quest DESCRIPTION”. Requesting an active quest must not replace it.
- `!done` completes the active quest, adds its reward to personal and community totals, and randomly assigns an uncompleted quest with the same announcement format.
- Use a database transaction and locked player/event records to prevent concurrent double rewards or lost community increments.
- Never repeat a completed quest for that player. When the pool is exhausted, show all quests complete.
- Keep existing public chat and host/admin behavior working.
- Owner authorized assigning difficulty-based rewards: 50–250 Mercury Tonic; 2,750 total per player across 19 quests.
- Implemented in `20261031040000_magiquest.sql`, the MagiQuest API, and the player UI.
- Both buttons and typed commands use the same transactional database operation. A completion also carries its expected quest ID, so retrying an old completion cannot complete the next quest.

### Quest pool supplied by owner

1. Ghostly Gaslight: go up to Mitchell and say approximately "I'm glad you're here tonight, I was worried that with what happened that you may not make it" DENY everything!
2. Seduce the Spirits: show off your costume to the camera
3. Dance with the Demons: request a song
4. Capture a Soul: take a photo with someone you don't know - send the photo to Curtis
5. Moving Memory Book: take B-Roll of the party and send it to Curtis
6. Tribal Dance: go all out and dance hard to one song
7. Soul Suck: Get someone to tell you a story about themselves, then go tell Curtis that story
8. Slasher Screenshot: stage a photo of a horror character committing murder - send it to Curtis
9. Exotic Elixir: Finish your drink - alcoholic or not :)
10. Making an Offering: do a kind gesture for the party hosts
11. Howl: go howl at the moon
12. Found Footage: Film a short vlog clip of yourself at the party - send it to Curtis
13. Trick or Treat: go enjoy a piece of candy
14. Spidey!: ask Curtis about Spidey.
15. Convine with Ghosts: Ask Curtis to tell you a tale
16. Regretful Reminiscing: send/tell Curtis about something that used to scare you as a kid
17. Scream and Tell: Send Curtis a picture of your favorite Halloween costume you've done
18. Spooky Sounds: make a spooky sound at the party in attempts to spook people

## Chunk 4 — validation and rollout

- Check registration, reload/resume, intro navigation, named chat, first quest, random assignment, pool exhaustion, personal/shared rewards, and concurrent/double completion.
- Apply migrations and deploy website through the existing hosting setup.
- Configure OBS browser sources; confirm transparency and live updates.
- Confirm stream defaults with actual live streams and check the experience on a phone.

### Local validation completed

- TypeScript check and production build passed.
- Executed all Halloween migrations against an isolated PostgreSQL-compatible PGlite database.
- Verified intro gate, first quest, cooldown, stale completion rejection, every quest without repeats, exhausted pool, personal/community totals, independent players, named chat, message throttle, paused chat, and RPC permission grants.
- Browser checked registration, public introduction, and the photo gallery at a narrow viewport.
- Live database credentials and hosting configuration are absent from this checkout. Hosted migration/deployment and full real-service browser testing remain outstanding.
