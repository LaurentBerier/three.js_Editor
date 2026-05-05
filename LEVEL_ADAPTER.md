# Level Adapter

Local-only patch on top of upstream three.js editor. Adds three menu items under
**File** that let the editor import and save *game-specific* level data through
a small bridge module ("adapter") served by the active local web server.

The editor itself stays game-agnostic. All game knowledge — file formats, asset
paths, save endpoints — lives in the adapter, which ships with the game project.

## The contract

An adapter is a single ES module served at the same origin as the editor. It
must export at least one of:

```js
export async function importLevel( editor ) { /* ... */ }
export async function saveLevel( editor ) { /* ... */ }
```

`editor` is the live three.js editor instance (the same object the rest of the
editor's UI works against — `editor.scene`, `editor.addObject`, `editor.config`,
`editor.storage`, etc.). The adapter runs in the editor's page context, so the
editor's import map is in scope:

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```

Anything else the adapter needs (level JSON, asset GLBs, a save endpoint) is the
serving project's responsibility — see [Hosting requirements](#hosting-requirements).

## Editor menu

`File` → bottom of the menu, below the standard Import row:

| Item | What it does |
| --- | --- |
| Import Level | Resolves the adapter URL, dynamically imports the module, calls `importLevel( editor )`. |
| Save Level | Same resolution, calls `saveLevel( editor )`. |
| Switch Server (Port)… | Scans `localhost:8000–8090`, lists live servers, prompts for a port, redirects to `http://localhost:<port>/editor/`. Use when running multiple game servers (e.g. several copies of the same game on 8081, 8082, 8083) and you want to import from a specific one. |
| Set Level Adapter URL… | Manual override of the cached adapter URL on the *current* origin. Opens a prompt seeded with the cached value. Blank submission clears the cache. |

All three live in [editor/js/Menubar.File.js](editor/js/Menubar.File.js).

## Adapter discovery

On every Import/Save click the editor calls `getAdapterUrl()`:

1. **Cache check.** If `localStorage['editor/levelAdapterUrl']` is set, `HEAD`
   it. 200 → use it. Anything else → drop the cache entry and continue.
2. **Same-origin probe.** `HEAD` these URLs in order, take the first 200:
   - `/tools/level-bridge.js`
   - `/tools/zombie-blaster-level.js`
   - `/level-bridge.js`
3. **Cross-port scan.** If nothing answers on this origin, sweep
   `localhost:8000` through `localhost:8090` in parallel for live servers
   (current port skipped). Each probe is a `no-cors` HEAD against `/`, which
   only tells us "something is listening" — not what it is. Closed ports
   refuse immediately on localhost so the whole scan is 1–2s.
   - **0 alive** → fall through to prompt.
   - **1 alive** → `confirm` dialog: "Switch to http://localhost:`<p>`/editor/?"
     OK redirects, Cancel falls through to prompt.
   - **2+ alive** → `prompt` listing the ports; type one to redirect. Blank
     or cancel falls through to prompt.
   The redirect navigates the browser to the picked origin's editor mount —
   it does *not* try to load the adapter cross-origin (that would need CORS
   on every game server). The new origin then runs its own discovery from
   scratch.
4. **Prompt.** If discovery and the port scan both fail, prompt the user for
   a URL. Cancel = abort the operation. Any non-empty value is cached.

The cache is per-origin (it's `localStorage`), so opening the editor on a
different host/port starts fresh.

## Hosting requirements

The editor needs to be loaded *from the same origin* that serves the adapter,
so the adapter can use absolute paths (`/data/...`, `/api/...`) without CORS.
The standard pattern is: the game project's own static server mounts the
editor under `/editor/` and serves the rest of the game tree at the root.

The Zombie Blaster project does this in
`D:\_Proj_src\Sandscape\Games\ZombieBlaster\ZombieBlaster\serve.py`. Relevant
mappings:

| URL prefix | Filesystem source |
| --- | --- |
| `/editor/`, `/build/`, `/examples/`, `/files/` | the sibling `three.js_Editor/` checkout |
| everything else | the game project root (so `/tools/`, `/data/`, `/assets/` are direct) |
| `POST /api/save-level` | writes the request body to `data/levelData.json` |

Run that server, open `http://localhost:8080/editor/`, and the probe finds
`/tools/zombie-blaster-level.js` automatically.

The editor's own `serve.py` (port 8081) and `utils/server.js` are vanilla
single-root static servers — they're for working on the editor in isolation
and **don't expose any adapter**. Loading the editor from those will produce
the "No level adapter found on this server" prompt.

## Writing an adapter for a new game

1. Drop a module on your game's server at any of the conventional probe paths
   (or any URL — you can override later).
2. Export `importLevel(editor)` / `saveLevel(editor)`. Use the editor's
   importmap-aliased modules (`'three'`, `'three/addons/...'`) — don't bundle
   your own three.js.
3. Mount the editor at `/editor/` (and `/build/`, `/examples/`, `/files/`)
   from your server so it shares your origin. Crib from
   `ZombieBlaster/ZombieBlaster/serve.py` if you're using Python's stdlib
   `http.server`.
4. Optional: if your game writes back, expose a save endpoint and `POST` to it
   from `saveLevel`.

Reference adapter: [tools/zombie-blaster-level.js](../ZombieBlaster/ZombieBlaster/tools/zombie-blaster-level.js)
in the Zombie Blaster project. It loads `data/levelData.json`, hydrates GLBs
from `/assets/CorridorKit/`, and `POST`s back to `/api/save-level` on save.

## Notes on autosave

The Zombie Blaster reference adapter neutralises the editor's autosave on
import (see `neutraliseAutosave` in that file). The editor's autosave does
`editor.toJSON()` + IndexedDB write on every signal-driven change, which on a
~310 MB level locks the main thread for ~1 s per gizmo nudge. The adapter
flips the autosave config flag, stubs `editor.toJSON()`, and stubs
`editor.storage.set()`. Originals are stashed on `editor._zbOriginal*` so you
can restore them from the dev console if you want the editor's native Save
Project flow back. Other adapters can do the same or skip it depending on
scene size.

## Troubleshooting

**"No level adapter found on this server"** — the same-origin probe got 404
on every conventional URL *and* the port scan found no other live local
servers (or you cancelled the picker). Either start the game's server in
the 8000–8090 range so the next click can detect it, or use "Set Level
Adapter URL…" to point at wherever your adapter lives. If a game server
is running but on a port outside the scan range, switch to its origin
manually (`http://localhost:<port>/editor/`).

**Picker offers a port that 404s on `/editor/`** — the scan only detects
"something is listening", not "an editor is mounted there". If you pick a
random Python `http.server` or a database, the redirect lands on a 404.
Pick the game project's server instead, or use "Set Level Adapter URL…".

**Stale cache after switching servers** — the cache check `HEAD`s the cached
URL before each use, so a no-longer-reachable URL self-heals on the next
click (it gets dropped and the probe re-runs). If you want to force a reset
without clicking anything, run in devtools:

```js
localStorage.removeItem( 'editor/levelAdapterUrl' )
```

**`Level importLevel failed (<url>): ...`** — the adapter URL resolved but
something inside the adapter threw. The URL is in the alert; check the
console for the full stack. Common causes: adapter's own dependencies
(`/data/levelData.json`, `/assets/...`) aren't being served, or the adapter
imports a specifier the editor's importmap doesn't know about.

**Patch is live but you still see the old "Zombie Blaster import failed"
alert** — browser is serving a cached `Menubar.File.js`. Hard reload
(`Ctrl+Shift+R`) or open DevTools → Network → Disable cache.
