# Top List API: Frontend Guide

Everything you need to build the Top List in the website and the admin panel: which API to call, what to send, where each value comes from, and what you get back.

## 1. What is the Top List?

Every module (Video Mania, Pic Tours, Sports, ...) can show up to **3 "top" posts** at the top of its page, as a carousel. Admins choose them in the admin panel.

- A top is **a normal post** that an admin marked as top. It is not a copy.
- Max **3 per module** (the whole module, not per category).
- **One API call returns everything** for each top: the post, its owner, category, like / comment / view counts, who liked it, the full comment thread, and what the logged-in user did. You never need a second request with an id to get more details.

## 2. The 5 endpoints at a glance

| # | Endpoint | Used by | Needs login |
|---|---|---|---|
| 1 | `GET /top/modules` | Admin (tabs) | No |
| 2 | `GET /top/entries/{module}` | **Website** (the carousel) and admin (current tops) | No (token is optional) |
| 3 | `GET /top/entries/{module}/candidates` | Admin (list of posts to choose from) | **Admin** |
| 4 | `POST /top/entries/{module}` | Admin (add a top) | **Admin** |
| 5 | `DELETE /top/entries/{module}/{itemId}` | Admin (remove a top) | **Admin** |

**Website only needs endpoint 2.**

## 3. Setup

### Base URL

All routes start with `/top`. Use the same API host as the rest of the app.

| Environment | Base URL |
|---|---|
| Local | `http://localhost:3801` |
| Website | `import.meta.env.VITE_API_URL` (already used by `client` in `user/src/configs/client.js`) |
| Admin panel | `url` in `admin/src/url.jsx` |

So the full URL of endpoint 2 for Video Mania is `{BASE_URL}/top/entries/video_mania`.

### Sending the token

Send the login token in the `Authorization` header:

```
Authorization: Bearer <token>
```

**Where the token comes from:** the login response, `POST /user/login`, returns `{ statusCode: 200, user: { ..., token } }`. The token is valid for 30 days.

| App | Where it is already stored |
|---|---|
| Website | Redux: `state.auth.token` |
| Admin panel | `localStorage` key `profiledetails`, then `.user.token` |

You **never** send a `user_id`. The API reads the user from the token.

| Endpoint | Token |
|---|---|
| 1 modules | not needed |
| 2 entries | optional. Without it you still get everything, but `viewer` flags are all `false`. With it, `viewer.is_liked`, `viewer.is_saved` and each comment's `is_liked` are correct for that user |
| 3, 4, 5 | **required, and the user must be an admin**, otherwise `401` / `403` |

## 4. Module names (use these exactly)

The `{module}` part of the URL is the **module key**. Copy it from the first column.

| Module key (pass this) | Screen name | Website constant (`TOP_MODULES.`) | Also accepted (aliases) |
|---|---|---|---|
| `video_mania` | Video Mania | `VIDEO_MANIA` | `xpi`, `videomania`, `video` |
| `pic_tours` | Pic Tours | `PIC_TOURS` | `pictour`, `pictours` |
| `open_letters` | Open Letters | `OPEN_LETTERS` | `openletters`, `letters`, `postletter`, `post_letters` |
| `mondo_market` | Mondo Market | `MONDO_MARKET` | `mondomarket`, `item`, `items`, `marketzone` |
| `on_news` | On News | `ON_NEWS` | `news`, `onnews` |
| `qafi` | QAFI (Q & A) | `QAFI` | none |
| `gebc` | EBIC | `EBIC` | `ebic` |
| `sports` | Sports & Sports | `SPORTS` | `sport` |
| `cinematics` | Cinematics | `CINEMATICS` | none |
| `fan_star` | Fan Star Zone | `FAN_STAR` | `fanstar` |
| `tv_progmax` | TV ProgMax | `TV_PROGMAX` | `tvprogmax` |
| `kid_vids` | Kid Vids | `KID_VIDS` | `kidvids` |
| `learning_hobbies` | Learning & Hobbies | `LEARNING_HOBBIES` | `learninghobbies` |
| `mass_apps` | Mass Apps | `MASS_APPS` | `massapp`, `massapps` |

Notes:

- **EBIC's key is `gebc`** (not `ebic`), and the website constant is `TOP_MODULES.EBIC`.
- Upper / lower case, `-`, `_` and spaces are ignored, so `Video-Mania` also works, but **always send the key from the table**.
- Do not hard-code the list if you do not want to: `GET /top/modules` returns every key and label (see 6.1).
- An unknown name returns `404` with a `validModules` list.

## 5. Where does each parameter come from?

| Parameter | Goes in | Used by | Type | Where the value comes from |
|---|---|---|---|---|
| `module` | URL path | all except `/top/modules` | string | Module key from section 4, or `modules[].key` from `GET /top/modules` |
| `item_id` | JSON body | POST | integer | The post's id. Take it from `posts[].item_id` in the candidates response (that is the list the admin clicks on). It is the same number as `item.id` |
| `itemId` | URL path | DELETE | integer | The post's id: `entries[].item_id` (or `entries[].item.id`) of the top you want to remove. **Not** `top_entry_id` |
| `search` | query string | candidates | string | The text the admin typed in the search box |
| `page` | query string | candidates | integer, starts at 1 | The pagination control. Default `1` |
| `limit` | query string | candidates | integer | Page size. Default `20`, maximum `100` |
| `lite` | query string | entries | `1` / `true` | You decide. `lite=1` returns counts only (no comment thread, no likers). Default is the full data |
| `comments_limit` | query string | entries | integer | How many top-level comments to embed (each comes with all its replies). Default `200`, max `500` |
| `likers_limit` | query string | entries | integer | How many recent likers to list. Default `50`, max `200`, `0` = none |
| `Authorization` | header | see section 3 | `Bearer <token>` | Login response, `user.token` |
| `Content-Type` | header | POST | `application/json` | Always this for the POST body |

> **The one thing to get right:** the ids you send (`item_id`, `itemId`) are **post ids**. Every response gives you `item_id` for exactly this purpose, so you never have to look anything up.

## 6. Endpoints in detail

### 6.1 `GET /top/modules`

The list of modules with how many tops each has. Use it for the admin tabs.

- Params: none. Token: not needed.

```js
const res = await fetch(`${BASE_URL}/top/modules`);
const data = await res.json();
```

Response `200`:

```json
{
  "statusCode": 200,
  "limit": 3,
  "modules": [
    { "key": "video_mania", "label": "Video Mania", "limit": 3, "count": 3, "full": true },
    { "key": "qafi",        "label": "QAFI",        "limit": 3, "count": 1, "full": false }
  ]
}
```

| Field | Meaning |
|---|---|
| `limit` | Maximum tops per module (3) |
| `modules[].key` | The module key to use in the other URLs |
| `modules[].label` | Display name for the tab |
| `modules[].count` | Tops live right now (0 to 3) |
| `modules[].full` | `true` when `count` equals `limit`. Disable "Add to top" for that module |

### 6.2 `GET /top/entries/{module}` (the website call)

Returns the module's tops, in display order, with everything.

```js
const res = await fetch(`${BASE_URL}/top/entries/video_mania`, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});
const { entries } = await res.json();      // 0 to 3 items
```

Optional query: `?lite=1`, `?comments_limit=50`, `?likers_limit=10`.

Response `200` (one entry shown; real data, long values shortened):

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
      "item_id": 30,
      "item": {
        "id": 30, "name": "African Safari: Top 5 moments", "description": "...",
        "video": "https://assets.mixkit.co/videos/19179/19179-360.mp4",
        "thumbnail": "https://assets.mixkit.co/videos/19179/19179-thumb-720-0.jpg",
        "video_category": 3, "sub_category": 5, "shared_post_id": null, "status": "active",
        "user_id": 14, "created_at": "...", "updated_at": "..."
      },
      "user": {
        "id": 14, "username": "ava_martin", "image": "https://...", "badge": null,
        "is_premium": false, "is_subscribed": false, "bio": "...", "profession": "Photographer",
        "city": "Lyon", "state": "...", "province": "...", "country": "France", "region": "Europe",
        "joined_at": "..."
      },
      "category":     { "id": 3, "name": "Wildlife & Safari", "french_name": "Faune et safari", "index": 2 },
      "sub_category": { "id": 5, "category_id": 3, "name": "African Safari", "french_name": "Safari africain", "index": 0 },
      "original_post": null,
      "stats":  { "likes_count": 2, "comments_count": 2, "views_count": 0, "shares_count": 0, "saves_count": 0 },
      "viewer": { "is_liked": false, "is_saved": false, "is_owner": false, "has_viewed": false },
      "likes": {
        "total": 2,
        "users": [ { "id": 22, "username": "nina_petrov", "image": "https://...", "badge": null, "is_premium": false, "is_subscribed": false, "liked_at": "..." } ]
      },
      "comments": {
        "total": 2, "root_total": 1, "has_more": false,
        "items": [
          {
            "id": 62, "comment": "This one's stunning.", "created_at": "...", "is_edited": false, "parent_comment_id": null,
            "user_id": 22, "username": "nina_petrov", "userImage": "https://...", "premium": false, "is_subscribed": false, "badge": null,
            "like_count": 0, "is_liked": false,
            "replies": [ { "id": 63, "comment": "@nina_petrov Thank you!", "username": "ava_martin", "like_count": 0, "is_liked": false, "replies": [] } ]
          }
        ]
      },
      "is_saved": false
    }
  ]
}
```

**If the module has no tops:** `{ "statusCode": 200, ..., "total": 0, "entries": [] }`. Show the screen's normal "no top found" message.

#### What every field is

| Field | Type | What it is |
|---|---|---|
| `top_entry_id` | number | Id of the "top" record itself. You normally do not need it |
| `module` | string | The module key |
| `position` | 1, 2 or 3 | Slot / display order. The array is already sorted by it |
| `top_added_at` | date | When it became top |
| `added_by` | number | The admin's user id |
| `item_id` | number | **The post's id.** Use this for opening the post, liking, commenting, and for the admin DELETE |
| `item` | object | **The whole post.** Every column of the post (see section 7 for what is inside per module) |
| `user` | object | The post owner's public profile. `profession` and the location fields are `null` if the user hid them. Never contains email or password |
| `category` | object | Full category row (`name`, `french_name`, ...). Use `french_name` for the French UI |
| `sub_category` | object or null | Full sub-category row |
| `original_post` | object or null | Only for a post that was **shared** from another: the source post, in the same shape. Otherwise `null` |
| `stats` | object | The counts (below) |
| `viewer` | object | What the logged-in user did (below). All `false` for guests |
| `likes` | object | `{ total, users[] }`: total number of likes and the most recent likers (name, avatar, badge) |
| `comments` | object | `{ total, root_total, has_more, items[] }`: the full thread, newest first, each comment with `replies[]` nested inside |
| `is_saved` | boolean | Same as `viewer.is_saved` (kept for older code) |

**`stats`**

| Field | Meaning |
|---|---|
| `likes_count` | Number of likes |
| `comments_count` | Visible comments including replies. Same as `comments.total` |
| `views_count` | Number of views, or `null` if this module does not track views. Only video-type modules and Pic Tours do (`video_mania`, `pic_tours`, `cinematics`, `fan_star`, `tv_progmax`, `kid_vids`, `learning_hobbies`) |
| `shares_count` | How many times it was shared |
| `saves_count` | How many users saved it |
| `offers_count` | `mondo_market` only: number of offers on the listing |

**`viewer`** (the logged-in user)

| Field | Meaning |
|---|---|
| `is_liked` | This user liked it. Use to colour the like button |
| `is_saved` | This user saved it. Use to colour the bookmark |
| `is_owner` | This user wrote it |
| `has_viewed` | This user already viewed it |

**A comment** (inside `comments.items[]` and nested `replies[]`) has: `id`, `comment`, `created_at`, `updated_at`, `is_edited`, `is_deleted`, `parent_comment_id`, `user_id`, `username`, `userImage`, `premium`, `is_subscribed`, `badge`, `like_count`, `is_liked`, `replies[]`. It is the same shape the normal comment endpoints return, so your existing comment component works.

**Size control:** `lite=1` returns the same entries with `stats` and `viewer` only (`likes`, `comments`, `original_post` are `null`). Use it if you only need counts, for example a small badge.

### 6.3 `GET /top/entries/{module}/candidates` (admin)

All posts the admin can choose from, top ones first.

```js
const url = `${BASE_URL}/top/entries/video_mania/candidates?page=1&limit=6&search=safari`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${adminToken}` } });
```

| Query | Required | Default | From |
|---|---|---|---|
| `search` | no | none | search box text |
| `page` | no | 1 | pagination |
| `limit` | no | 20 (max 100) | rows-per-page selector |

Response `200`:

```json
{
  "statusCode": 200,
  "module": { "key": "video_mania", "label": "Video Mania", "limit": 3 },
  "total": 24, "page": 1, "totalPages": 4,
  "posts": [
    { "item_id": 30, "item": { "...": "..." }, "user": { "...": "..." }, "category": { "...": "..." }, "sub_category": { "...": "..." },
      "stats": { "...": "..." }, "viewer": { "...": "..." },
      "top_entry_id": 26, "position": 1, "is_top": true, "top_position": 1 },
    { "item_id": 31, "item": { "...": "..." },
      "top_entry_id": null, "position": null, "is_top": false, "top_position": null }
  ]
}
```

- Each post has the same fields as an entry, **without** `likes`, `comments`, `original_post` (the picker is light).
- `is_top` says whether it is already a top; `top_position` is its slot (1 to 3) or `null`.
- `total` is the number of posts that match the search (all pages). `totalPages` is for the pager.

### 6.4 `POST /top/entries/{module}` (admin: add a top)

```js
const res = await fetch(`${BASE_URL}/top/entries/video_mania`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({ item_id: 31 }),   // item_id of the post from the candidates list
});
const data = await res.json();
```

Body: `{ "item_id": <post id> }`. Required, positive integer.

Success `201`:

```json
{
  "statusCode": 201,
  "message": "Added to top list",
  "module": { "key": "video_mania", "label": "Video Mania", "limit": 3 },
  "total": 3,
  "entry":   { "...": "the post just added (full entry)" },
  "entries": [ "...the complete new list of tops, same as GET /top/entries/{module}..." ]
}
```

Use `entries` to refresh the screen. No second request is needed.

Failures (the first is `400` without `entries`; the others also return `module`, `total` and the current `entries`):

| Status | `code` | `message` | What to do in the UI |
|---|---|---|---|
| 400 | | `item_id is required and must be a positive integer` | Bug in your request |
| 400 | | `This <Module> post is not eligible to be a top post` | Show the message (for example an unpaid Mondo Market listing) |
| 404 | | `<Module> post not found` | Refresh the list; the post was deleted |
| 409 | `ALREADY_TOP` | `This post is already a top post` | Refresh |
| 409 | `TOP_LIMIT_REACHED` | `<Module> already has 3 top posts. Remove one before adding another.` | Tell the admin to remove one first. The response's `entries` shows what is there |

### 6.5 `DELETE /top/entries/{module}/{itemId}` (admin: remove a top)

```js
const res = await fetch(`${BASE_URL}/top/entries/video_mania/${entry.item_id}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${adminToken}` },
});
```

No body. `itemId` = the post id (`entries[].item_id`). The post itself is **not** deleted, it just stops being a top.

Success `200`:

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

Failures: `400` `itemId must be a positive integer`; `404` `This post is not in the top list` (also if you delete the same one twice).

## 7. What is inside `item` for each module

`item` is the raw post, so its fields differ per module. Use this to know what to render:

| Module key | Title | Text | Image / media | Other useful fields |
|---|---|---|---|---|
| `video_mania`, `cinematics`, `tv_progmax`, `kid_vids`, `learning_hobbies` | `item.name` | `item.description` | video: `item.video` (mp4 URL), poster: `item.thumbnail` | `item.caption_url` (Video Mania) |
| `pic_tours` | `item.name` | `item.description` | `item.image` | |
| `sports` | `item.name` | `item.description` | `item.type` is `"image"` or `"video"`. Image: `item.image`. Video: `item.video` with poster `item.thumbnail` | |
| `fan_star` | `item.name` | `item.description` | `item.type` is `"image"` or `"video"`. Image: `item.image`. Video: `item.video` with poster `item.thumbnail` | |
| `on_news` | `item.name` (headline, can be `null`) | `item.description` | `item.image` | |
| `qafi` | `item.name` (the question) | `item.description` (`"Q: ...\nA: ..."`) | `item.image` | |
| `gebc` (EBIC) | `item.name` | `item.description` | **`item.image` is an emoji character, not a URL** (for example `"😍"`) | |
| `open_letters` | `item.subject_place` | `item.greetings`, `item.introduction`, `item.body`, `item.form_of_appeal` | `item.images[]` (array of URLs), `item.signature.image` | `item.name` (author's name), `item.post_type` (`public` / `private`), `item.receiver_type`, `item.receiver` (`{ id, username, image, address }` for private letters, else `null`) |
| `mondo_market` | `item.title` | `item.description` | `item.images[]`, each `{ id, image }` | `item.price` (number), `item.condition` (`new`, `used_Like_new`, `used_Good`, `used_Fair`), `item.location`, `item.city`, `item.state`, `item.region`, `item.country`, `item.country_code` |
| `mass_apps` | `item.name` | | `item.icon` | `item.type` |

These are the same on every module, outside `item`:

- Author: `user.username`, `user.image`, `user.badge`, `user.is_premium`
- Category label: `category.name` (English) / `category.french_name` (French), `sub_category.name` / `sub_category.french_name`
- Numbers and buttons: `stats.*`, `viewer.*`
- Date: `item.created_at`

## 8. Recipes

### Website: show the tops of a module

The project already has this wired. Use the hook, do not call `fetch` yourself:

```js
import { useTopEntries } from "../../hooks/useTopEntries";
import { TOP_MODULES } from "../../utils/topEntries";

const { slides, loading } = useTopEntries(TOP_MODULES.VIDEO_MANIA);

<TopRecord moduleKey={TOP_MODULES.VIDEO_MANIA} video={slides} />
```

`slides` are the entries reshaped to the "normal post" shape that cards, likes and comments already understand (`video_id`, `username`, `userImage`, ...). The extra data is on each slide as: `likes_count`, `comments_count`, `views_count`, `shares_count`, `saves_count`, `is_liked`, `is_saved`, `is_owner`, `top_likes` (`{ total, users }`), `top_comments` (`{ total, root_total, has_more, items }`), `original_post`.

### Website: carousel and pin rules

| Number of tops | Behaviour |
|---|---|
| 0 | Normal "no top found" message |
| 1 | Single card. **No** carousel, arrows, dots or auto-scroll |
| 2 or 3 | Carousel: auto-scrolls every 5 seconds, arrows, dots, `1/3` counter |

- **Pin:** a pin button shows only with 2+ tops. Pinned means: stop auto-scrolling. Press again to unpin and resume.
- **The pin is saved only in the browser**: `localStorage` key `wg:top-pin:<module key>`, value = the post id. Nothing is sent to the API.
- If an admin removes the pinned top, the pin clears itself.
- Auto-scroll also pauses while a video plays or the mouse is over the carousel.

### Website: like or comment on a top

A top is a normal post. Use the **same endpoints your module screen already uses**, with the post id (`item_id`, or `item.id`). There are no separate "top" endpoints for likes, comments, saves, shares or reports.

### Admin: the full flow

1. Tabs: `GET /top/modules` -> one tab per `modules[]` (show `count/limit`).
2. When a tab is selected (its `key`):
   - Slots: `GET /top/entries/{key}` -> show up to 3 slots; empty ones are "Empty slot".
   - Posts table: `GET /top/entries/{key}/candidates?page=&limit=&search=`.
3. **Add to top** button on a row -> `POST /top/entries/{key}` with `{ item_id: row.item_id }`. Disable the button when `module.full` is true or `is_top` is true.
4. **Remove** on a slot or row -> `DELETE /top/entries/{key}/{row.item_id}` (ask for confirmation).
5. After 4 or 5, replace your slots with the `entries` array in the response, and refresh the tab counts (`GET /top/modules`).
6. If you get `409 TOP_LIMIT_REACHED`, show the message and show the `entries` from the response so the admin can pick one to remove.

## 9. Errors

Every error is JSON with `statusCode` and `message`.

| Status | Meaning | Typical cause |
|---|---|---|
| 400 | Bad request | `item_id` missing or not a number; post not eligible |
| 401 | Not logged in | No / expired / invalid token on an admin endpoint |
| 403 | Not allowed | Logged in but not an admin (or blocked account) |
| 404 | Not found | Unknown module (body has `validModules`); post not found; post is not a top |
| 409 | Conflict | `code: "ALREADY_TOP"` or `code: "TOP_LIMIT_REACHED"` |
| 500 | Server error | Show a generic error and retry later |

Handle them by `statusCode`, and for 409 by `code`.

## 10. Good to know

- **Always 0 to 3 entries.** Never more.
- **Order:** entries come sorted by `position`; just render in array order.
- **Dates** are ISO strings.
- **Posts of deleted users** are never returned.
- **Images:** all media URLs are absolute (`https://...`); use them as they are. Exception: EBIC's `item.image` is an emoji character.
- **Languages:** categories include `french_name`; the post text itself is not translated.
- **Caching:** the data changes only when an admin adds / removes a top or when users like / comment. A short cache (30 to 60 seconds) is fine for the website; always refetch after admin actions.

## 11. Try it in 1 minute

```bash
# 1) public: the tops of Video Mania
curl "http://localhost:3801/top/entries/video_mania"

# 2) with a user token (personalised viewer flags)
curl "http://localhost:3801/top/entries/video_mania" -H "Authorization: Bearer <token>"

# 3) admin: choose posts, add, remove
curl "http://localhost:3801/top/entries/video_mania/candidates?limit=5" -H "Authorization: Bearer <admin token>"
curl -X POST   "http://localhost:3801/top/entries/video_mania" -H "Authorization: Bearer <admin token>" -H "Content-Type: application/json" -d '{"item_id":31}'
curl -X DELETE "http://localhost:3801/top/entries/video_mania/31" -H "Authorization: Bearer <admin token>"
```

Test accounts: the demo data has 10 users, for example `ava_martin@demo.wotchagotcha.app` with password `Demo@12345` (log in with `POST /user/login` to get a token). Every module already has tops (3 each; On News has 2, QAFI has 1, Mass Apps has none).

---

Questions about this API: see the full technical reference in `backend/md/TOP_LIST_API.md`.
