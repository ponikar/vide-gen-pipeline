# Gold Fish — Product Requirements

## Overview

Gold Fish is a platform that lets anyone link their social media accounts (Instagram, TikTok) and create "apps." Each app acts as a container that connects a social account to an AI agent. The AI agent posts content on the user's behalf. Users see what happened — post count, stats, analytics — without doing any of the posting themselves.

The platform has two distinct stakeholders: **end users** and **AI agents**. They interact with completely different surfaces.

---

## Stakeholders

### 1. End Users (Dashboard users)

These are people who sign up, connect their social accounts, and create apps.

**What they do:**
- Sign up (Clerk auth)
- Connect Instagram / TikTok accounts (OAuth)
- Create apps (via onboarding chatbot or manual form)
- View their app dashboard
- See how many posts have been made
- See stats and analytics per post / account

**What they do NOT do:**
- Create posts manually
- Use API keys (those are for agents)
- Write content

**Their mental model:**
> "I linked my Instagram. I created an app. The AI posts for me. I check the dashboard to see how it's doing."

### 2. AI Agents (Internal, API consumers)

These are our own AI agents running in-house. They are the only consumers of the public API.

**What they do:**
- Authenticate via API key (`Authorization: Bearer gf_...`)
- POST `/api/v1/posts` — create a media container (Instagram)
- POST `/api/v1/posts/:containerId/publish` — publish a container
- GET `/api/v1/posts/:containerId/status` — check publish status
- GET `/api/v1/analytics` — fetch account / media insights

**What they do NOT do:**
- Access the dashboard UI
- Use Clerk sessions
- Manage connected accounts (users do that)

**Constraints:**
- Only our in-house AI agents get API keys. No third-party agents until we understand all use cases.
- API keys are scoped to a specific app (they carry `appId`).

### 3. Platform (Infrastructure)

- Clerk handles auth for users
- Drizzle + PostgreSQL stores all data
- Instagram Graph API (and future TikTok API) for posting
- tRPC for internal dashboard queries
- Next.js API routes for external agent endpoints

---

## Onboarding Flow

```
User signs up (Clerk)
  |
  v
Empty dashboard → "Create App" button
  |
  v
Onboarding chatbot (/dashboard/onboard)
  |-- Asks for URL (optional scrape)
  |-- Falls back to manual name + description
  |-- Creates app in DB
  |
  v
App detail page (/dashboard/:appId)
  |-- Connected Accounts section (connect Instagram/TikTok)
  |-- API Keys section (for internal AI agent setup)
```

The user never sees the posting flow. They connect their accounts, create an app, and the agent takes over.

---

## Data Model

### apps
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| clerk_user_id | text | owner |
| name | text | |
| description | text | nullable |

### connected_accounts
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| provider | text | "instagram" or "tiktok" |
| provider_user_id | text | unique |
| username | text | |
| access_token | text | |
| refresh_token | text | nullable |
| token_expires_at | timestamp | nullable |
| app_id | uuid | FK → apps (nullable: can exist without an app) |

### posts
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| app_id | uuid | FK → apps |
| title | text | auto-generated caption |
| link | text | permalink to the post |
| stats | jsonb | provider metadata (media ID, container ID, etc.) |

### api_keys
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| clerk_user_id | text | owner |
| name | text | human label |
| key_prefix | text | unique, "gf_" prefix |
| key_hash | text | SHA-256 of full key |
| app_id | uuid | FK → apps |
| last_used_at | timestamp | nullable |
| revoked_at | timestamp | nullable |

---

## Key Design Decisions

1. **Posts are agent-created, not user-created.** Users should never see a "New Post" form. The posts section on the dashboard shows what the agent has done — count, recent posts, stats — not a creation interface.

2. **API keys are for agents, not users.** The API Keys section on the dashboard is for the user to generate keys that the AI agent will use. The user creates the key, shares it with the agent, and the agent uses it to authenticate API calls.

3. **Connected accounts can exist without an app** (app_id is nullable). This handles the case where a user connects social media before creating an app. When they create an app, the account can be linked. Disconnecting sets app_id to null (does not delete the account).

4. **Only Instagram is implemented.** TikTok OAuth routes exist but the posting/analytics logic is not yet built.

5. **AI agents are in-house only.** No third-party agent integrations until all use cases are understood.

---

## Questions / Open Items

- Should the dashboard show per-post analytics (likes, shares, comments) or just aggregate stats?
- For TikTok: what does the publish flow look like (API parity with Instagram)?
- Do we need a webhook / callback system for the agent to know when a post is published?
- Should we surface a "disconnect" flow that also revokes the OAuth token on the provider side, or just null app_id?
- Do users need to be able to pause/resume agent posting?
