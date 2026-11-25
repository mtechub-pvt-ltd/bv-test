# Top List module: full reference

Everything about the Top List: rules, database, every API with real responses, error handling, how the website and admin panel use it, and how to add a module.

> Short, plain-words overview with a mindmap: [`TOP_LIST_ARCHITECTURE.md`](./TOP_LIST_ARCHITECTURE.md)

## Contents

1. [What it is](#1-what-it-is)
2. [Quick start](#2-quick-start)
3. [Authentication](#3-authentication)
4. [Modules](#4-modules)
5. [API reference](#5-api-reference)
   - [5.1 GET /top/modules](#51-get-topmodules)
   - [5.2 GET /top/entries/:module](#52-get-topentriesmodule)
   - [5.3 GET /top/entries/:module/candidates](#53-get-topentriesmodulecandidates)
   - [5.4 POST /top/entries/:module](#54-post-topentriesmodule)
   - [5.5 DELETE /top/entries/:module/:itemId](#55-delete-topentriesmoduleitemid)
6. [Object shapes](#6-object-shapes)
7. [Errors](#7-errors)
8. [Database and guarantees](#8-database-and-guarantees)
9. [Website (user app)](#9-website-user-app)
10. [Admin panel](#10-admin-panel)
11. [Behaviour and edge cases](#11-behaviour-and-edge-cases)
12. [Adding a new module](#12-adding-a-new-module)
13. [Files, tests, operations](#13-files-tests-operations)
14. [What was removed](#14-what-was-removed)

---

## 1. What it is

Admins choose which posts are the **top posts** of each module (Video Mania, Pic Tours, ...). The website shows them as a carousel at the top of that module.

**Rules**

| Rule | Detail |
|---|---|
| Limit | At most **3 top posts per module, in total** (not per category). |
| When full | Adding a 4th is **rejected** (`409 TOP_LIMIT_REACHED`). The admin removes one first. |
| A top is a pointer, not a copy | A top says "post #42 of Video Mania is top, slot 1". The post itself is never copied or moved, so edits show up automatically. |
| One call returns everything | Each top comes with its owner, category, sub-category, like / comment / view / share / save counts, who liked it, the **full nested comment thread**, what the logged-in viewer did, and the source post if it is a share. No second request with an id is needed. |
| Tops are normal posts | Like, comment, save, share, report and edit a top exactly like any other post. There are no separate "top" endpoints for those. |
| Empty module | Returns `entries: []`. There is no automatic fallback. |
| Who can change tops | Admins only (`role = admin`). Reading tops is public. |

---

## 2. Quick start

**Website (React)**

```js
import { useTopEntries } from "../../hooks/useTopEntries";
import { TOP_MODULES } from "../../utils/topEntries";

const { slides, loading } = useTopEntries(TOP_MODULES.VIDEO_MANIA);
// slides = up to 3 posts in the normal post shape.
// Pass them to <TopRecord moduleKey={TOP_MODULES.VIDEO_MANIA} video={slides} />
```

**Any client (curl)**

```bash
# public: the 3 tops of Video Mania
curl http://localhost:3801/top/entries/video_mania

# admin: add post 42, remove post 17
curl -X POST   http://localhost:3801/top/entries/video_mania -H "Authorization: Bearer <admin token>" -H "Content-Type: application/json" -d '{"item_id":42}'
curl -X DELETE http://localhost:3801/top/entries/video_mania/17 -H "Authorization: Bearer <admin token>"
```

---

## 3. Authentication

| Endpoint | Auth |
|---|---|
| `GET /top/modules` | none |
| `GET /top/entries/:module` | none. If a valid `Authorization: Bearer <token>` is sent, `is_saved` reflects that user |
| `GET /top/entries/:module/candidates` | **admin** |
| `POST /top/entries/:module` | **admin** |
| `DELETE /top/entries/:module/:itemId` | **admin** |

Header: `Authorization: Bearer <JWT>`. "Admin" means the user's `role` in the database is `admin` (checked in the database on every request, not trusted from the token).

Base URL: the same host as the rest of the API (local: `http://localhost:3801`). All routes are mounted under `/top`.

---

## 4. Modules

The module is part of the URL (`:module`). Keys are fixed; the common spellings in the **Aliases** column are also accepted (case, `-`, `_` and spaces are ignored: `Video-Mania`, `videoMania` and `video_mania` are the same).

| Key | Label | Posts come from | Category table / sub-category table | Aliases | Extra in `item` | Eligible to be top |
|---|---|---|---|---|---|---|
| `video_mania` | Video Mania | `xpi_videos` | `video_category` / `video_sub_category` | `xpi`, `videomania`, `video` | | any post |
| `pic_tours` | Pic Tours | `pic_tours` | `pic_category` / `pic_sub_category` | `pictour`, `pictours` | | any post |
| `open_letters` | Open Letters | `post_letters` | `disc_category` / `disc_sub_category` | `openletters`, `letters`, `postletter`, `post_letters` | `images` (array of image URLs) | any post |
| `mondo_market` | Mondo Market | `item` | `item_category` / `item_sub_category` | `mondomarket`, `item`, `items`, `marketzone` | `images` (array of `{id, image}`) | **paid listings only** (`paid_status = true`) |
| `on_news` | On News | `news` | `news_category` / `news_sub_category` | `news`, `onnews` | | any post |
| `qafi` | QAFI | `qafi` | `qafi_category` / `qafi_sub_category` | | | any post |
| `gebc` | EBIC | `gebc` | `gebc_category` / `gebc_sub_category` | `ebic` | | any post |
| `sports` | Sports | `sports` | `sports_category` / `sport_sub_category` | `sport` | | any post |
| `cinematics` | Cinematics | `cinematics_videos` | `cinematics_category` / `cinematics_sub_category` | | | any post |
| `fan_star` | Fan Star | `fan_star_videos` | `fan_star_category` / `fan_star_sub_category` | `fanstar` | | any post |
| `tv_progmax` | TV ProgMax | `tv_progmax_videos` | `tv_progmax_category` / `tv_progmax_sub_category` | `tvprogmax` | | any post |
| `kid_vids` | Kid Vids | `kid_vids_videos` | `kid_vids_category` / `kid_vids_sub_category` | `kidvids` | | any post |
| `learning_hobbies` | Learning & Hobbies | `learning_hobbies_videos` | `learning_hobbies_category` / `learning_hobbies_sub_category` | `learninghobbies` | | any post |
| `mass_apps` | Mass Apps | `mass_app` | `app_category` (no sub-category) | `massapp`, `massapps` | | any app |

In every module, posts of **deleted users are never shown and cannot be made top**.

The admin search box (`search` on the candidates endpoint) matches these fields (case-insensitive, "contains"):

| Module | Searched fields |
|---|---|
| video_mania, pic_tours, sports, cinematics, fan_star, tv_progmax, kid_vids, learning_hobbies | `name`, `description` |
| open_letters | `name`, `subject_place`, `body` |
| mondo_market | `title`, `description` |
| on_news, qafi, gebc | `description` |
| mass_apps | `name` |

---

## 5. API reference

All responses are JSON and contain `statusCode` (same number as the HTTP status). The examples below are real responses from the running API (long values shortened).

### 5.1 GET /top/modules

The tabs for the admin panel (or any dashboard): every module with how many tops it has right now.

- **Auth:** none
- **Params:** none

```json
{
  "statusCode": 200,
  "limit": 3,
  "modules": [
    { "key": "video_mania", "label": "Video Mania", "limit": 3, "count": 3, "full": true },
    { "key": "pic_tours",   "label": "Pic Tours",   "limit": 3, "count": 0, "full": false },
    { "key": "qafi",        "label": "QAFI",        "limit": 3, "count": 1, "full": false }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `limit` | number | Max tops per module (3) |
| `modules[].key` | string | Module key to use in the other URLs |
| `modules[].label` | string | Display name |
| `modules[].count` | number | **Live** tops (posts that were deleted, or belong to deleted users, are not counted) |
| `modules[].full` | boolean | `count >= limit` |

All 14 modules are returned, in the order of the table in section 4.

### 5.2 GET /top/entries/:module

**The one call the website makes.** Returns the current top posts of a module, ordered by `position`, with everything needed to show them.

- **Auth:** none. An optional token personalises `viewer` / `is_saved` and the comments' `is_liked`
- **Path:** `:module` module key or alias
- **Query** (all optional)

| Param | Default | Meaning |
|---|---|---|
| `lite` | off | `1` / `true`: counts and viewer flags only. `likes`, `comments` and `original_post` come back `null` (fast, small) |
| `comments_limit` | `200` (max `500`) | How many **top-level** comments (each with all its replies) to embed. `comments.has_more` tells you if there are more |
| `likers_limit` | `50` (max `200`, `0` = none) | How many most-recent likers to list. The total is always in `likes.total` |

```json
{
  "statusCode": 200,
  "module": { "key": "video_mania", "label": "Video Mania", "limit": 3 },
  "total": 3,
  "entries": [
    {
      "top_entry_id": 26,
      "module": "video_mania",
      "position": 1,
      "top_added_at": "2026-11-10T11:28:44.055Z",
      "added_by": 2,
      "item_id": 2,
      "item": {
        "id": 2,
        "name": "Sunset timelapse",
        "description": "A 30 second timelapse",
        "video": "https://cdn.example.com/v/sunset.mp4",
        "thumbnail": "https://cdn.example.com/t/sunset.jpg",
        "caption_url": null,
        "video_category": 1,
        "sub_category": 1,
        "shared_post_id": null,
        "status": "active",
        "user_id": 2,
        "created_at": "2026-11-10T11:28:41.418147+00:00",
        "updated_at": "2026-11-10T11:28:41.418147+00:00"
      },
      "user": {
        "id": 14, "username": "ava_martin", "image": "https://randomuser.me/api/portraits/women/12.jpg",
        "badge": null, "is_premium": false, "is_subscribed": false,
        "bio": "Chasing light and good coffee.", "profession": "Photographer",
        "city": "Lyon", "state": "Auvergne-Rhône-Alpes", "province": "Auvergne-Rhône-Alpes", "country": "France", "region": "Europe",
        "joined_at": "2026-11-10T12:00:39.163653+00:00"
      },
      "category":     { "id": 3, "name": "Wildlife & Safari", "french_name": "Faune et safari", "index": 2, "created_at": "...", "updated_at": "..." },
      "sub_category": { "id": 5, "category_id": 3, "name": "African Safari", "french_name": "Safari africain", "index": 0, "created_at": "...", "updated_at": "..." },
      "original_post": null,
      "stats":  { "likes_count": 2, "comments_count": 2, "views_count": 0, "shares_count": 0, "saves_count": 0 },
      "viewer": { "is_liked": false, "is_saved": false, "is_owner": true, "has_viewed": false },
      "likes": {
        "total": 2,
        "users": [ { "id": 22, "username": "nina_petrov", "image": "https://...", "badge": null, "is_premium": false, "is_subscribed": false, "liked_at": "2026-11-10T19:07:00.896Z" } ]
      },
      "comments": {
        "total": 2, "root_total": 1, "has_more": false,
        "items": [
          {
            "id": 62, "comment": "This one's stunning.", "created_at": "...", "is_edited": false, "parent_comment_id": null,
            "user_id": 22, "username": "nina_petrov", "userImage": "https://...", "premium": false, "is_subscribed": false, "badge": null,
            "like_count": 0, "is_liked": false,
            "replies": [ { "id": 63, "comment": "@nina_petrov Thank you!", "parent_comment_id": 62, "username": "ava_martin", "like_count": 0, "is_liked": false, "replies": [] } ]
          }
        ]
      },
      "is_saved": false
    }
  ]
}
```

Empty module:

```json
{ "statusCode": 200, "module": { "key": "video_mania", "label": "Video Mania", "limit": 3 }, "total": 0, "entries": [] }
```

Top-level fields:

| Field | Type | Meaning |
|---|---|---|
| `module` | object | `{ key, label, limit }` of the module asked for (an alias resolves to the canonical `key`) |
| `total` | number | `entries.length` (0 to 3) |
| `entries` | array | See [Entry object](#entry-object). Sorted by `position` ascending |

Errors: `404` unknown module. See [section 7](#7-errors).

### 5.3 GET /top/entries/:module/candidates

The admin picker: **every post the admin may choose from**, top ones first, with search and pagination.

- **Auth:** admin
- **Path:** `:module`
- **Query**

| Param | Default | Rules | Meaning |
|---|---|---|---|
| `search` | none | text, matched as "contains", case-insensitive; `%` and `_` are treated as plain characters | Filter (fields per module in section 4) |
| `page` | `1` | positive integer | Page number |
| `limit` | `20` | positive integer, **capped at 100** | Page size |

Ordering: posts that are currently top first (by `position`), then newest first.

```json
{
  "statusCode": 200,
  "module": { "key": "video_mania", "label": "Video Mania", "limit": 3 },
  "total": 4,
  "page": 1,
  "totalPages": 2,
  "posts": [
    {
      "top_entry_id": 26, "module": "video_mania", "position": 1,
      "top_added_at": "2026-11-10T11:28:44.055Z", "added_by": 2,
      "item_id": 2, "item": { "...": "full post, see 5.2" },
      "user": { "...": "..." }, "category": { "...": "..." }, "sub_category": { "...": "..." },
      "is_saved": false,
      "is_top": true,
      "top_position": 1
    },
    {
      "top_entry_id": null, "module": "video_mania", "position": null,
      "top_added_at": null, "added_by": null,
      "item_id": 5, "item": { "...": "..." },
      "user": { "...": "..." }, "category": { "...": "..." }, "sub_category": { "...": "..." },
      "is_saved": false,
      "is_top": false,
      "top_position": null
    }
  ]
}
```

A `post` is an [Entry object](#entry-object) **without the three lists** (`likes`, `comments`, `original_post`; it still has `stats` and `viewer`) plus two fields: `is_top` (boolean) and `top_position` (`1..3` or `null`). For posts that are not top, `top_entry_id`, `position`, `top_added_at` and `added_by` are `null`.

| Top-level field | Meaning |
|---|---|
| `total` | Number of posts matching the search (all pages) |
| `page` | Current page |
| `totalPages` | `max(1, ceil(total / limit))` |
| `posts` | The page of posts |

### 5.4 POST /top/entries/:module

Add a post to the module's top list. It takes the lowest free slot (1, 2 or 3).

- **Auth:** admin
- **Body (JSON):** `{ "item_id": 42 }`. `item_id` is the post's `id` in the module's table. Must be a positive integer.

**Success: `201`**

```json
{
  "statusCode": 201,
  "message": "Added to top list",
  "module": { "key": "video_mania", "label": "Video Mania", "limit": 3 },
  "total": 3,
  "entry": { "top_entry_id": 28, "position": 3, "item_id": 4, "item": { "...": "..." }, "user": { "...": "..." }, "category": { "...": "..." }, "sub_category": { "...": "..." }, "is_saved": false },
  "entries": [ "...all current tops, same as GET /top/entries/:module..." ]
}
```

`entry` is the post just added; `entries` is the complete new list (each with the same full details as `GET /top/entries/:module`), so the UI can refresh without another request.

**Failures.** Every one except the `400` for a bad `item_id` also returns `module`, `total` and the current `entries`, so the UI can show what is there and ask which one to remove:

| Status | `code` | `message` | When |
|---|---|---|---|
| 400 | | `item_id is required and must be a positive integer` | `item_id` missing or not a positive integer (no `entries` in this one) |
| 400 | | `This <Label> post is not eligible to be a top post` | The post exists but is not eligible (e.g. unpaid Mondo Market listing) |
| 404 | | `<Label> post not found` | No post with that id in the module (or its owner is deleted) |
| 409 | `ALREADY_TOP` | `This post is already a top post` | It is already in the top list |
| 409 | `TOP_LIMIT_REACHED` | `<Label> already has 3 top posts. Remove one before adding another.` | The module is full |

Example, module full:

```json
{
  "statusCode": 409,
  "message": "Video Mania already has 3 top posts. Remove one before adding another.",
  "code": "TOP_LIMIT_REACHED",
  "module": { "key": "video_mania", "label": "Video Mania", "limit": 3 },
  "total": 3,
  "entries": [ "...the 3 current tops..." ]
}
```

Concurrency is safe. If several admins add at the same moment, exactly 3 succeed and the rest get `409 TOP_LIMIT_REACHED` (verified with 5 simultaneous requests).

### 5.5 DELETE /top/entries/:module/:itemId

Remove one post from the top list. The post itself is **not** deleted. The freed slot is reused by the next add.

- **Auth:** admin
- **Path:** `:module`, `:itemId` = the post's `id` (positive integer)

**Success: `200`**

```json
{
  "statusCode": 200,
  "message": "Removed from top list",
  "module": { "key": "video_mania", "label": "Video Mania", "limit": 3 },
  "removed": { "top_entry_id": 27, "item_id": 3, "position": 2 },
  "total": 2,
  "entries": [ "...the remaining tops..." ]
}
```

**Failures**

| Status | Body | When |
|---|---|---|
| 400 | `{ "statusCode": 400, "message": "itemId must be a positive integer" }` | bad `itemId` |
| 404 | `{ "statusCode": 404, "message": "This post is not in the top list" }` | the post is not a top (also on a second delete of the same post) |

---

## 6. Object shapes

### Module object

```json
{ "key": "video_mania", "label": "Video Mania", "limit": 3 }
```

### Entry object

One top post, with everything bridged from the different tables.

| Field | Type | Meaning |
|---|---|---|
| `top_entry_id` | number or null | Id of the top row (`null` for non-top candidates) |
| `module` | string | Canonical module key |
| `position` | `1`, `2`, `3` or null | Slot. This is the display order |
| `top_added_at` | ISO date or null | When it became top |
| `added_by` | number or null | Admin user id who added it |
| `item_id` | number | Id of the real post (same as `item.id`) |
| `item` | object | **The full post row**: every column of the module's table, whatever it has, plus module extras (`images`, see section 4). Use this for titles, media, text, dates |
| `user` | object or null | The post owner, public fields only (below) |
| `category` | object or null | The full category row (`id`, `name`, `french_name`, `index`, timestamps) |
| `sub_category` | object or null | The full sub-category row, or `null` (Mass Apps has none, and some posts have none) |
| `original_post` | object or null | If this post is a **share** of another post: the source post in the same shape (`item`, `user`, `category`, `sub_category`, `stats`, `viewer`). Otherwise `null` (and `null` with `lite`) |
| `stats` | object | Counts, see [stats](#stats-object) |
| `viewer` | object | What the logged-in user did, see [viewer](#viewer-object). All `false` for guests |
| `likes` | object or null | `{ total, users[] }`, see [likes](#likes-object). `null` with `lite` |
| `comments` | object or null | `{ total, root_total, has_more, items[] }`, see [comments](#comments-object). `null` with `lite` |
| `is_saved` | boolean | Same as `viewer.is_saved` (kept for older clients) |

**`user` object** (the owner's public profile; never contains email or password). A user can hide location and / or profession, in which case those fields are `null`:

```json
{ "id": 14, "username": "ava_martin", "image": "https://.../avatar.png", "badge": null, "is_premium": false, "is_subscribed": false,
  "bio": "...", "profession": "Photographer", "city": "Lyon", "state": "...", "province": "...", "country": "France", "region": "Europe",
  "joined_at": "2026-11-10T12:00:39.163653+00:00" }
```

#### stats object

| Field | Meaning |
|---|---|
| `likes_count` | Number of likes |
| `comments_count` | Visible comments including replies (hidden / deleted ones are not counted). Equal to `comments.total` |
| `views_count` | Number of views, or `null` when the module does not track views (only Video Mania, Pic Tours, Cinematics, Fan Star, TV ProgMax, Kid Vids and Learning & Hobbies do) |
| `shares_count` | How many posts were created by sharing this one |
| `saves_count` | How many users saved it |
| `offers_count` | Mondo Market only: number of offers made on the listing |

#### viewer object

| Field | Meaning |
|---|---|
| `is_liked` | The viewer liked it |
| `is_saved` | The viewer saved it |
| `is_owner` | The viewer wrote it |
| `has_viewed` | The viewer has viewed it (modules that track views; otherwise `false`) |

#### likes object

`{ "total": 7, "users": [ { "id", "username", "image", "badge", "is_premium", "is_subscribed", "liked_at" } ] }`. `users` is the most recent likers, newest first, at most `likers_limit` (default 50). `total` is always the full count.

#### comments object

`{ "total", "root_total", "has_more", "items" }`. `total` counts every visible comment and reply; `root_total` counts top-level ones; `items` are the top-level comments (newest first, at most `comments_limit`) each with a nested `replies` array. It is exactly what the normal comment endpoint of that module returns (hidden comments excluded, deleted ones as placeholders), so a comment has: `id`, `comment`, `created_at`, `updated_at`, `is_edited`, `edited_at`, `is_deleted`, `parent_comment_id`, `user_id`, `username`, `userImage`, `premium`, `is_subscribed`, `badge`, `like_count`, `is_liked`, `replies[]`.

#### Module-specific extras inside `item`

| Module | Extra keys |
|---|---|
| open_letters | `images` (URLs), `signature` `{ id, image }`, `receiver` `{ id, username, image, address }` (private letters, otherwise `null`) |
| mondo_market | `images` `[{ id, image }]` |

**`item`** is the raw post, so its keys depend on the module. Examples:

Video Mania (real):
```json
{ "id": 2, "name": "Sunset timelapse", "description": "A 30 second timelapse",
  "video": "https://cdn.example.com/v/sunset.mp4", "thumbnail": "https://cdn.example.com/t/sunset.jpg", "caption_url": null,
  "video_category": 1, "sub_category": 1, "shared_post_id": null, "status": "active", "user_id": 2,
  "created_at": "2026-11-10T11:28:41.418147+00:00", "updated_at": "2026-11-10T11:28:41.418147+00:00" }
```

QAFI (real):
```json
{ "id": 10, "name": null, "description": "Why is the sky blue?", "type": "image",
  "image": "https://cdn.example.com/q/sky.jpg", "video": "", "thumbnail": "",
  "category": 1, "sub_category": 1, "shared_post_id": null, "status": "active", "user_id": 2,
  "created_at": "...", "updated_at": "..." }
```

Mondo Market (adds `images`; abbreviated):
```json
{ "id": 7, "title": "Used bike", "description": "...", "price": 120, "condition": "good", "paid_status": true,
  "images": [ { "id": 31, "image": "https://.../bike1.jpg" } ], "...": "all other item columns" }
```

Open Letters (adds `images`; abbreviated):
```json
{ "id": 5, "name": "...", "subject_place": "...", "greetings": "...", "introduction": "...", "body": "...", "form_of_appeal": "...",
  "video": null, "images": [ "https://.../l1.jpg" ], "...": "all other post_letters columns" }
```

> Because `item` is the raw row, media can be in different columns per module (`video` + `thumbnail`, `image`, `images`, ...). The website adapter (section 9) already handles this.

---

## 7. Errors

All errors are JSON with `statusCode` and `message`.

| Status | When | Body extras |
|---|---|---|
| **400** | `item_id` / `itemId` invalid, or post not eligible | none for validation errors; `module`, `total`, `entries` for "not eligible" |
| **401** | No token, expired token, or invalid token on an admin route | `success: false`; message `Please log in to continue` / `Your session has expired. Please log in again` / `Invalid session` / `Account not found` |
| **403** | Logged in but not an admin (`Admin access required`), or the account is blocked | `success: false` |
| **404** | Unknown module; post not found (add); post not in top list (delete) | unknown module adds `validModules: [...]`; "post not found" on add adds `module`, `total`, `entries` |
| **409** | `ALREADY_TOP` or `TOP_LIMIT_REACHED` | `code`, `module`, `total`, `entries` |
| **500** | Unexpected server error | `{ statusCode: 500, message: "Internal server error" }` |

Unknown module example:

```json
{
  "statusCode": 404,
  "message": "Unknown module \"nope\"",
  "validModules": ["video_mania", "pic_tours", "open_letters", "mondo_market", "on_news", "qafi", "gebc", "sports",
                   "cinematics", "fan_star", "tv_progmax", "kid_vids", "learning_hobbies", "mass_apps"]
}
```

Handling advice for clients: branch on `statusCode` and, for 409, on `code`. A 409 response already contains the current `entries`, so you can refresh the list from it directly.

---

## 8. Database and guarantees

Single table `top_entries` (created automatically on server start from `model/init.sql`, or by `node migrations/create_top_entries.js`):

```sql
CREATE TABLE public.top_entries (
    id          SERIAL PRIMARY KEY,
    module      VARCHAR(50) NOT NULL,          -- module key, e.g. 'video_mania'
    item_id     INT NOT NULL,                  -- id of the real post in that module's table
    position    SMALLINT NOT NULL,             -- slot 1..3 (display order)
    created_by  INT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT top_entries_position_range      CHECK (position BETWEEN 1 AND 3),
    CONSTRAINT top_entries_module_position_key UNIQUE (module, position),
    CONSTRAINT top_entries_module_item_key     UNIQUE (module, item_id)
);
```

| Guarantee | How |
|---|---|
| Never more than 3 tops per module | The API checks inside a transaction guarded by a per-module lock, **and** the database enforces it (`UNIQUE(module, position)` + `CHECK position 1..3`) |
| A post cannot be top twice | `UNIQUE(module, item_id)` |
| No race between admins | `pg_advisory_xact_lock` per module around count-then-insert |
| A deleted post never holds a slot | `item_id` has no foreign key (it points to a different table per module), so dead rows are removed before every add and ignored on every read |
| Posts of deleted users | Hidden on read, cannot be added, cleaned out before the next add |

If the limit ever changes, change `TOP_LIMIT` in `utils/topModules.js` **and** the `CHECK` constraint.

---

## 9. Website (user app)

One call for every module: `useTopEntries(moduleKey)` in `user/src/hooks/useTopEntries.js`. It calls `GET /top/entries/:module` (sending the user's token when logged in) and returns:

| Return | Meaning |
|---|---|
| `slides` | The tops, **adapted to the normal post shape** (below). `[]` when empty |
| `loading` | `true` while the request is running |
| `error` | The error body if the request failed (`slides` is `[]`) |
| `reload()` | Fetch again |

Options: `useTopEntries(key, { enabled, reloadKey })`. `enabled: false` skips the request (the views use this in "saved items" mode). Changing `reloadKey` refetches (the views pass their `reload` flag, which flips after a share).

### The adapter (`user/src/utils/topEntries.js`)

The cards, likes, comments, saves and shares were written for the per-module list endpoints. `adaptTopEntry` flattens an entry into that shape, so they work unchanged:

| Slide field | From |
|---|---|
| everything in `item` | spread as-is (`video`, `thumbnail`, `image`, `images`, `description`, ...) |
| `id` | `item.id` |
| module id alias | `item.id` under the name that module's lists use: `video_mania`, `cinematics`, `fan_star`, `tv_progmax`, `kid_vids`, `learning_hobbies` -> `video_id`; `pic_tours` -> `tour_id`; `open_letters` -> `post_id`; `mondo_market` -> `item_id`; `on_news` -> `news_id`; `qafi` -> `qafi_id`; `gebc` -> `gebc_id`; `sports` -> `sport_id` and `sports_id` |
| `username`, `userImage` / `userimage` / `user_image`, `premium` / `is_premium`, `is_subscribed`, `badge`, `user_id` | `user` |
| `category_id`, `category_name`, `sub_category_name` | `category`, `sub_category` |
| `video_category_name` / `pic_category_name` / `disc_category_name` | `category.name` (for the modules whose lists use these names) |
| `is_saved`, `is_liked`, `is_owner` | `is_saved`, `viewer` |
| `stats`, `viewer`, `likes_count`, `comments_count`, `views_count`, `shares_count`, `saves_count` | `stats`, `viewer` |
| `top_likes`, `top_comments` | `likes`, `comments` (named so they never clash with post fields; `null` with `lite`) |
| `original_post` | `original_post`, flattened to the shape the cards read (`name`, `video`, `thumbnail`, `username`, `user_image`, `premium`, ...) |
| `topEntryId`, `topPosition`, `topItemId`, `topModule` | the entry itself (safe names that never clash with post fields) |

> **Important:** slides are real posts. Never add `top_video_id`, `top_tours_id`, `isTop` or `type=topvideo/toptour` to them. Those flags belonged to the old system and no longer exist.

### Carousel and pin rules (`TopRecord`, `useTopPin`)

| Situation | Behaviour |
|---|---|
| 0 tops | The module's normal "no top found" message |
| 1 top | A single card. **No** carousel, arrows, dots or auto-scroll |
| 2 or 3 tops | Carousel: auto-scrolls every 5 seconds, arrows, dots, `1/3` counter |
| Auto-scroll pauses | While a video plays, while the pointer is over the carousel, and while a top is pinned |
| Pin button | Shown only with 2+ tops. Pins the visible top: auto-scroll stops. Press it again on the pinned top to unpin and resume |
| Where the pin lives | **Browser only**: `localStorage` key `wg:top-pin:<module key>` holding the post id. Nothing is sent to the backend. Synced across tabs. Falls back to in-memory if storage is blocked |
| Pinned top removed by an admin | The pin is forgotten automatically |
| Page reload with a pin | The carousel opens on the pinned top and does not auto-scroll |
| Opening a top | Goes to the normal post page (`/post/<module>/<id>`). Likes, comments, saves, shares and reports use the normal endpoints |

Accessibility: the pin is a toggle button (`aria-pressed`); arrows and dots are labelled buttons.

---

## 10. Admin panel

Page: **Top List** (`/toplist`, `admin/src/pages/TopList.jsx`). Deep link: `/toplist?module=qafi` opens that tab.

| Part | What it does | API |
|---|---|---|
| Module tabs | **One row**, scrolls sideways. Left/right arrows appear only when there is more to scroll in that direction (scroll by about 60% of the row). Each tab shows `count/3`. The selected tab is kept in view | `GET /top/modules` |
| Current top posts | Three slots for the selected module: filled (thumbnail, title, owner, category, **Remove**) or "Empty slot". Shows `N of 3 used` | `GET /top/entries/:module` |
| All posts | Searchable (300 ms debounce), paginated (6, 15 or 25 per page) table with preview, title, owner, category, status (`Top 1..3` or `Not top`) and **Add to top** / **Remove from top** | `GET /top/entries/:module/candidates` |
| Add to top | Disabled with an explanation when all 3 slots are used | `POST /top/entries/:module` |
| Remove | Asks for confirmation. The post itself is not deleted | `DELETE /top/entries/:module/:itemId` |

Notes: global-search results for Mondo Market, Video Mania, Pic Tours and Open Letters open this page on the right tab. The page's header box has the class `topbar-header-box`: the shared `Topbar` hides the duplicate header using that class (without it, it hides the wrong element and the page appears blank).

---

## 11. Behaviour and edge cases

| Case | What happens |
|---|---|
| Add when 3 exist | `409 TOP_LIMIT_REACHED`, nothing changes |
| Remove, then add | The new top takes the **lowest free slot** (not always the last one). Display order is always by `position` |
| Same post added twice | `409 ALREADY_TOP` |
| Post deleted while it is a top | It disappears from `GET` immediately and is cleaned out on the next add. `/top/modules` counts only live tops |
| Post owner deleted | Hidden; cannot be added; slot reclaimed on the next add |
| Unpaid Mondo Market listing | `400 ... not eligible` |
| Two admins click at once | Exactly one wins the last slot, the other gets 409 |
| Module alias in the URL | Resolved: `/top/entries/videoMania` works and returns `module.key = "video_mania"` |
| Guest vs logged in | Same data; only `is_saved` differs |
| Comments on a top | Stored on the real post, shown everywhere that post is shown |
| Notifications for a top | Use the normal module (a like on a top video notifies as a normal Video Mania like) |

---

## 12. Adding a new module

1. Add one object to `TOP_MODULES` in `backend/utils/topModules.js` (`key`, `label`, `table`, `userColumn`, category and sub-category tables and columns, `titleColumns`, optional `eligibleSql`, `extras`, `saveKey`). Table and column names must be plain constants there (they are used in SQL).
2. Website: add the key to `TOP_MODULES` and an id alias to `ID_ALIASES` in `user/src/utils/topEntries.js`, then call `useTopEntries(TOP_MODULES.X)` in the module's view and give `<TopRecord moduleKey={TOP_MODULES.X} ... />`.
3. Run the tests (section 13).

The admin page picks the new tab up automatically from `GET /top/modules`. No new routes, controller or table are needed.

---

## 13. Files, tests, operations

| File | Role |
|---|---|
| `backend/utils/topModules.js` | Module registry and limit (`TOP_LIMIT = 3`) |
| `backend/Controllers/topEntriesController.js` | The 5 endpoints |
| `backend/routes/top.routes.js` | Route mounting (`/top`) |
| `backend/model/init.sql` | `top_entries` table |
| `backend/migrations/create_top_entries.js` | Creates only the `top_entries` table |
| `backend/migrations/drop_legacy_top_system.js` | Removes the old top tables and columns (dry run by default; `--apply` writes a JSON backup, then commits) |
| `backend/utils/topModules.test.js` | Registry tests |
| `admin/src/pages/TopList.jsx` | Admin page |
| `user/src/hooks/useTopEntries.js`, `useTopPin.js` | Fetch hook and pin hook |
| `user/src/utils/topEntries.js` (+ `.test.js`) | Module keys, adapter |
| `user/src/components/ui/TopRecord.jsx` | Carousel, auto-scroll, pin button |

Run the tests:

```bash
cd backend && node --test utils/topModules.test.js
cd user    && node --test src/utils/topEntries.test.js
```

Verified end to end against the real database (all with cleanup): add / list / reject the 4th / remove / re-add, 5 simultaneous adds (3 win), a deleted post frees its slot, admin / non-admin / no-token requests, the queries of all 14 modules, and comment / like / view flows on a top post.

---

## 14. What was removed

The old top system is fully gone (code and database):

- Routes: `/top/app/*`, `/top/setTopItem`, `/top/createTopVideo` and every other per-module `/top/*` route; the per-module "most comments" endpoints (`/cinematics/getTopVideo`, `/news/getTopNews`, ...); `/xpi/createTopVideo`, `/xpi/getTopVideo`.
- Tables: `top_video`, `top_video_like`, `top_video_viewed`, `top_tours`, `top_QAFI`, `top_GEBC`, `top_NEWS`.
- Columns: `item.top_post`, `item.top_added_date`, `post_letters.top_letter`, `post_letters.top_added_date`, `xpi_videos.top`, and `top_*_id` on `video_comment`, `pic_comment`, `news_comment`, `gebc_comment`, `qafi_comment`, `sport_comment`.
- Website: the per-module top thunks, the `top_*_id` / `isTop` / `type=topvideo|toptour` handling, and the code that padded the top list with random recent posts.
- Admin: the four separate top pages (Pic Tours, Video, Post Letter, Top Letter).

A JSON backup of the rows that were deleted is in `backend/migrations/backups/`.
