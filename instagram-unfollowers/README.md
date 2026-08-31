# Instagram Unfollowers Finder

by **zeytokg**

A single-file, console-pasteable tool that scans the accounts you follow on
Instagram and shows you which ones don't follow you back. Comes with a
simple landing page you can publish on GitHub Pages.

Written from scratch, loosely inspired by the general idea behind
[cobanov/instagram](https://github.com/cobanov/instagram) and
[davidarroyo1234/InstagramUnfollowers](https://github.com/davidarroyo1234/InstagramUnfollowers)
— the code itself is original, not copied from either.

## How it works

- It uses endpoints Instagram's own web client relies on (undocumented,
  but publicly known for years across many independent open-source
  projects):
  - `GET /api/v1/friendships/{id}/following/` — lists who you follow, and
    whether each one follows you back (`friendship_status.followed_by`).
  - `POST /api/v1/friendships/destroy/{id}/` — unfollows a given account.
- Authentication piggybacks on the session cookies your browser already
  has (`ds_user_id`, `csrftoken`) — no separate login or API key needed.
- No request ever goes anywhere except Instagram — the tool runs entirely
  client-side, in your own browser.
- If Instagram responds with a rate limit (HTTP 429) or a server error, the
  scan backs off and retries a few times instead of failing outright.

## Files

- `instagram-unfollowers.js` — the tool itself, pasted into the console. Has
  its own EN/TR toggle in the panel header (separate from the site's).
- `index.html` — a simple landing page with usage instructions and the
  copyable code (ready for GitHub Pages). Has an EN/TR toggle in the top
  right that translates the whole page.
- `security.html` — the SHA-256 hash of the current script and a few
  notes on how to verify the code yourself before running it.

## Usage

1. Log into `https://www.instagram.com`.
2. Open DevTools console (Windows/Linux: `Ctrl+Shift+J`, macOS: `Cmd+Option+J`).
3. Copy the contents of `instagram-unfollowers.js`, paste into the console, press Enter.
   (If Chrome blocks pasting, type `allow pasting` first, then paste again.)
4. Click **Scan now** in the panel that appears.
5. Search/filter the results, copy usernames, or unfollow a selection
   slowly with pause/cancel controls.

## Publishing on GitHub Pages

1. Push this folder to a GitHub repo (`index.html` and
   `instagram-unfollowers.js` need to be at the repo root).
2. In the repo's **Settings → Pages**, set the source to the `main`
   branch / root folder.
3. Within a few minutes it'll be live at
   `https://<your-username>.github.io/<repo-name>/`.

## Risks and limitations

- This is not an official/public Instagram API — it relies on
  undocumented endpoints that Instagram can change or restrict without
  notice.
- Automated unfollowing may be considered a violation of Instagram's
  Terms of Service and can lead to temporary restrictions (rate limiting,
  action blocks, or worse).
- Default delays are intentionally slow to reduce that risk; shortening
  them increases it.
- Provided as-is, with no warranty; use is entirely at your own
  responsibility (see `LICENSE`).

## License

MIT — see `LICENSE`.
