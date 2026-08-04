# SyncWrite — Architecture & Feature Deep-Dive

> **Purpose:** This document explains in detail what SyncWrite is, how every feature works under the hood, what technologies were chosen and why, and how the codebase is organized. It is intended for a technical presentation to a mentor.

---

## Table of Contents

1. [What is SyncWrite?](#what-is-syncwrite)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Feature Breakdown](#feature-breakdown)
   - [1. Authentication](#1-authentication)
   - [2. Dashboard Interface](#2-dashboard-interface)
   - [3. Document Management](#3-document-management)
   - [4. Rich Text Editing](#4-rich-text-editing)
   - [5. Real-Time Collaboration](#5-real-time-collaboration)
   - [6. Presence Awareness](#6-presence-awareness)
   - [7. Auto Save](#7-auto-save)
   - [8. Version History](#8-version-history)
   - [9. Comments System](#9-comments-system)
   - [10. Sharing & Permissions](#10-sharing--permissions)
   - [11. Live Cursor Tracking](#11-live-cursor-tracking)
   - [12. Typing Indicators](#12-typing-indicators)
   - [13. Activity Feed](#13-activity-feed)
   - [14. Keyboard Shortcuts](#14-keyboard-shortcuts)
   - [15. Find & Replace](#15-find--replace)
   - [16. Dark Mode](#16-dark-mode)
   - [17. User Avatars](#17-user-avatars)
   - [18. Document Search](#18-document-search)
   - [19. Export to PDF and Markdown](#19-export-to-pdf-and-markdown)
   - [20. Import Markdown](#20-import-markdown)
   - [21. Document Pinning & Favorites](#21-document-pinning--favorites)
5. [Database Schema Design](#database-schema-design)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Socket.IO Events Reference](#socketio-events-reference)
8. [Project Structure](#project-structure)

---

## What is SyncWrite?

**SyncWrite** is a full-stack, real-time collaborative document editor — similar in concept to Google Docs — built from the ground up using modern web technologies. It enables multiple users to simultaneously edit the same document, see each other's cursors in real time, manage document versions, share documents with role-based permissions, comment on content, and much more.

---

## Technology Stack

### Frontend (Client)
| Technology | Purpose |
|---|---|
| **React 19** | UI framework using functional components and hooks |
| **TypeScript** | Static typing for reliability and developer experience |
| **Vite** | Lightning-fast build tool and dev server |
| **Tiptap (v3)** | Headless rich-text editor built on ProseMirror |
| **Socket.IO Client** | WebSocket connection for real-time collaboration |
| **React Router v7** | Client-side routing with protected routes |
| **Axios** | HTTP client with interceptors for token refresh |
| **React Hook Form + Zod** | Form handling with schema-based validation |
| **Tailwind CSS** | Utility-first CSS framework for styling |
| **Lucide React** | Icon library |
| **Firebase Client SDK** | Google OAuth sign-in on the frontend |

### Backend (Server)
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | REST API server |
| **TypeScript** | Full type safety across the stack |
| **MongoDB + Mongoose** | NoSQL database with ODM for data modeling |
| **Socket.IO** | Real-time bidirectional WebSocket communication |
| **JWT (jsonwebtoken)** | Dual-token authentication (access + refresh) |
| **bcrypt** | Secure password hashing |
| **Firebase Admin SDK** | Server-side Google OAuth ID token verification |
| **Zod** | Runtime request validation schemas |
| **Winston** | Structured, leveled application logging |
| **Morgan** | HTTP request logging middleware |
| **express-rate-limit** | Rate limiting to prevent brute-force attacks |

---

## Architecture Overview

SyncWrite follows a **client-server architecture** with a clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (React + Vite)                  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Pages   │  │Components│  │  Hooks   │  │ Extensions │  │
│  │Dashboard │  │ Editor   │  │useSocket │  │CursorExt   │  │
│  │EditorPage│  │ Toolbar  │  │useDocs   │  │SearchExt   │  │
│  │Login     │  │ Comments │  │useAuth   │  │            │  │
│  │Register  │  │ Versions │  │useKBShort│  │            │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────────┘  │
│       │              │             │                         │
│  ┌────▼──────────────▼─────────────▼───────────────────────┐│
│  │          API Layer (Axios) + Socket.IO Client           ││
│  │    ┌─────────────┐           ┌──────────────────┐       ││
│  │    │ Services    │           │ Socket Singleton  │       ││
│  │    │ (REST calls)│           │ (WebSocket)       │       ││
│  │    └──────┬──────┘           └────────┬─────────┘       ││
│  └───────────┼──────────────────────────┼──────────────────┘│
└──────────────┼──────────────────────────┼──────────────────-┘
               │ HTTP (REST)              │ WebSocket
               ▼                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    SERVER (Express + Socket.IO)               │
│                                                               │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐ │
│  │  Routes  │  │ Controllers│  │Middleware │  │   Socket   │ │
│  │ auth     │  │ auth       │  │ auth(JWT) │  │ Handlers   │ │
│  │ document │  │ document   │  │ validate  │  │ (rooms,    │ │
│  │ version  │  │ version    │  │ errorHndl │  │  cursors,  │ │
│  │ comment  │  │ comment    │  │ rateLimit │  │  presence) │ │
│  │ activity │  │ activity   │  │           │  │            │ │
│  │ user     │  │ user       │  │           │  │            │ │
│  └────┬─────┘  └─────┬──────┘  └──────────┘  └──────┬─────┘ │
│       │              │                               │       │
│  ┌────▼──────────────▼───────────────────────────────▼─────┐ │
│  │                     Mongoose ODM                        │ │
│  │  Models: User | Document | Version | Comment | Activity │ │
│  │          DocumentPreference                             │ │
│  └─────────────────────────┬───────────────────────────────┘ │
└────────────────────────────┼─────────────────────────────────┘
                             ▼
                     ┌───────────────┐
                     │   MongoDB     │
                     └───────────────┘
```

### Key Architectural Decisions

- **Dual-token JWT authentication:** Short-lived access tokens (15 min) stored in HTTP-only cookies, plus long-lived refresh tokens (30 days) — no tokens in localStorage, preventing XSS attacks.
- **Cookie-based auth for both REST and WebSocket:** The Socket.IO handshake reads the JWT from the cookie header, so the user is authenticated on the WebSocket connection too — no separate auth flow needed.
- **Debounced auto-save:** Content changes are batched with a 2-second debounce before persisting to the database, reducing write frequency while ensuring no data loss.
- **Socket.IO rooms:** Each document gets its own room (`doc:<documentId>`), so events are scoped only to users currently viewing that document.
- **Custom ProseMirror plugins:** Two custom Tiptap extensions (`RemoteCursorExtension` and `SearchHighlightExtension`) are built as ProseMirror plugins using the Decoration API for rendering remote cursors and search highlights.

---

## Feature Breakdown

### 1. Authentication

**What it does:** Users can register with email/password or sign in with Google. Sessions are maintained via HTTP-only cookies.

**How it works:**

- **Registration** (`POST /api/auth/register`): The user submits name, email, and password. The password is validated against a strong password regex (≥8 chars, uppercase, lowercase, digit, special character) using Zod on the server. The password is hashed with `bcrypt` (salt rounds = 10) and stored in the `User` model. On success, both an access token (15 min) and refresh token (30 days) are set as HTTP-only, secure, `SameSite=strict` cookies.

- **Login** (`POST /api/auth/login`): The email/password pair is verified against the database using `bcrypt.compare()`. On success, cookies are set as described above.

- **Google OAuth** (`POST /api/auth/google-login`): The client-side Firebase SDK opens a Google sign-in popup via `signInWithPopup()`. The resulting Firebase ID token is sent to the backend, where `firebase-admin` verifies it with `verifyIdToken()`. If the user doesn't exist, a new account is created. If they do exist, the Google ID is linked.

- **Token Refresh** (`POST /api/auth/refresh`): When the 15-minute access token expires, the Axios interceptor on the client detects the `TOKEN_EXPIRED` error code and automatically calls the refresh endpoint. The server verifies the refresh token and issues a new access token — this is transparent to the user.

- **Logout** (`POST /api/auth/logout`): Clears all auth cookies.

- **Session Check** (`GET /api/auth/me`): Called on app load by the `AuthContext` to check if the user is already logged in.

- **Rate Limiting:** Registration is limited to 10 attempts per 15 minutes. Login is limited to 5 attempts per minute. This is enforced using `express-rate-limit`.

**Key files:**
- Server: `controllers/auth.controller.ts`, `utils/jwt.ts`, `middleware/auth.ts`, `config/firebase.ts`
- Client: `features/auth/AuthContext.tsx`, `pages/Login.tsx`, `pages/Register.tsx`, `api/axios.ts` (interceptor), `components/auth/GoogleSignInButton.tsx`

---

### 2. Dashboard Interface

**What it does:** After login, users see a dashboard displaying their documents organized into categories with statistics.

**How it works:**

- The `Dashboard` page calls `GET /api/documents` which returns documents categorized by the server into:
  - **My Documents** — documents the user owns
  - **Shared with Me** — documents where the user is a collaborator
  - **Recently Opened** — last 10 documents the user opened, sorted by most recent `openedAt` timestamp
  - **Pinned** — documents the user has pinned
  - **Favorites** — documents the user has favorited

- **Dashboard Statistics Cards** show counts: total documents, owned, shared with you, and recently opened.

- **View Modes:** The dashboard supports both **grid view** (card layout) and **table/list view** (rows with metadata columns).

- **Create New Document:** A prominent "+ New Document" button calls `POST /api/documents` and navigates to the newly created document's editor.

**Key files:**
- Client: `pages/Dashboard.tsx`, `components/documents/DashboardStatCards.tsx`, `components/documents/DocumentCard.tsx`, `components/documents/DocumentTableView.tsx`, `components/documents/DocumentTableRow.tsx`, `components/documents/RecentlyOpenedWidget.tsx`, `components/documents/SharedWithYouWidget.tsx`, `hooks/useDocuments.ts`

---

### 3. Document Management

**What it does:** Users can create, rename, delete, duplicate, pin, and favorite documents. Each document displays its title, owner, date created, and last modified date.

**How it works:**

| Operation | Endpoint | Authorization |
|---|---|---|
| Create | `POST /api/documents` | Any authenticated user |
| List | `GET /api/documents` | Returns user's owned + shared docs |
| Get | `GET /api/documents/:id` | Owner or collaborator |
| Rename | `PATCH /api/documents/:id/rename` | Owner only |
| Duplicate | `POST /api/documents/:id/duplicate` | Owner or collaborator |
| Delete | `DELETE /api/documents/:id` | Owner only |
| Toggle Favorite | `PATCH /api/documents/:id/favorite` | Owner or collaborator |
| Toggle Pin | `PATCH /api/documents/:id/pin` | Owner or collaborator |

- **Duplicate** creates a brand-new document with the same title (appended " (Copy)") and content, owned by the requesting user. Collaborators are NOT copied.
- **Favorites and Pins** are stored per-user in a separate `DocumentPreference` collection (with a unique compound index on `user + document`), so each user's preferences are independent.
- **Last Opened Tracking:** When a user opens a document (`GET /api/documents/:id`), the server updates or creates a `lastOpenedBy` entry for that user with the current timestamp.

**Key files:**
- Server: `controllers/document.controller.ts`, `models/Document.ts`, `models/DocumentPreference.ts`
- Client: `services/documentService.ts`, `hooks/useDocuments.ts`

---

### 4. Rich Text Editing

**What it does:** The editor supports headings (H1–H3), bold, italic, underline, strikethrough, bullet lists, ordered lists, blockquotes, code blocks, text alignment (left, center, right, justify), hyperlinks, and horizontal rules.

**How it works:**

- The editor is built using **Tiptap v3** — a headless, extensible rich-text editor framework built on ProseMirror.
- The editor is configured with these extensions:
  - `StarterKit` — provides paragraph, headings (levels 1-3), bold, italic, strikethrough, bullet list, ordered list, blockquote, code block, horizontal rule, hard break
  - `UnderlineExtension` — adds underline formatting
  - `TextAlign` — enables text alignment for headings and paragraphs
  - `LinkExtension` — adds clickable hyperlinks with autolink detection
  - `RemoteCursorExtension` — custom ProseMirror plugin for rendering remote cursors (see Section 11)
  - `SearchHighlightExtension` — custom ProseMirror plugin for find/replace highlighting (see Section 15)

- The **EditorToolbar** component renders formatting buttons that call Tiptap commands like `editor.chain().focus().toggleBold().run()`. Active formatting states are read from `editor.isActive('bold')` to highlight active toolbar buttons.

- Content is stored as **Tiptap/ProseMirror JSON** in MongoDB (using `Schema.Types.Mixed`), not HTML. This makes it easy to manipulate, version, and render.

**Key files:**
- Client: `pages/EditorPage.tsx` (editor initialization), `components/editor/EditorToolbar.tsx`

---

### 5. Real-Time Collaboration

**What it does:** When multiple users open the same document, changes made by one user appear instantly on all other users' screens without browser refresh.

**How it works:**

1. **Socket.IO Connection:** On app load, a single Socket.IO connection is established (configured in `api/socket.ts`). Authentication is handled in the Socket.IO middleware by parsing the JWT cookie from the WebSocket handshake headers.

2. **Joining a Document Room:** When a user navigates to a document, the `useDocumentSocket` hook emits `document:join` with the document ID. The server verifies the user has access (owner or collaborator), then joins the socket to the room `doc:<documentId>`.

3. **Broadcasting Content Changes:** On every editor change (`onUpdate`), the client:
   - Stores the new content in a pending ref
   - Emits `document:content` via Socket.IO to broadcast to other users
   - Debounces a save to the database (2 seconds)

4. **Receiving Remote Changes:** The server relays `document:content` to all sockets in the room **except the sender** (`socket.to(room).emit(...)`). On the receiving client, the editor content is replaced using `editor.commands.setContent(content, { emitUpdate: false })` — the `emitUpdate: false` flag prevents infinite loops.

5. **Cursor Preservation:** When receiving remote content, the local user's cursor position is saved before the update and restored afterward (clamped to valid document bounds).

6. **Remote Update Flag:** An `isRemoteUpdateRef` flag is used to distinguish between local edits and remote updates, preventing local saves and re-broadcasts for remote changes.

**Key files:**
- Server: `socket/index.ts` (the `document:content` handler)
- Client: `hooks/useSocket.ts` (`useDocumentSocket`), `pages/EditorPage.tsx` (`handleRemoteContent`)

---

### 6. Presence Awareness

**What it does:** The editor displays colored avatar circles showing who is currently viewing the document, along with their names and online status.

**How it works:**

1. When a user joins a document room, the server calls `broadcastPresence(room)` which:
   - Fetches all sockets in the room via `io.in(room).fetchSockets()`
   - Deduplicates by user ID (a user may have multiple tabs)
   - Emits `presence:update` with an array of `UserPresence` objects (id, name, email, avatarColor) to everyone in the room

2. Presence is re-broadcast when:
   - A user joins a room
   - A user leaves a room (via `document:leave` or `disconnecting`)
   - A socket disconnects

3. On the client, the `PresenceAvatars` component renders colored avatar circles with the user's initials. It shows up to a configured number of avatars, with a "+N" overflow indicator for additional users.

**Key files:**
- Server: `socket/index.ts` (`broadcastPresence` function)
- Client: `components/editor/PresenceAvatars.tsx`, `hooks/useSocket.ts` (presence state management)

---

### 7. Auto Save

**What it does:** Document changes are automatically saved to the database without a manual "Save" button. A status indicator shows the current save state.

**How it works:**

1. **Debounced Save:** When the user types, the `onUpdate` callback stores the latest content in `pendingContentRef` and starts a 2-second debounce timer. When the timer fires, the content is sent to `PATCH /api/documents/:id/content`.

2. **Save Status Indicator:** A visual indicator in the top bar shows:
   - ☁️ `idle` — everything is synced
   - 🟡 `Unsaved` — user has typed but save hasn't fired yet
   - 🔵 `Saving...` — save request in progress
   - ✅ `Saved` — save completed (shown for 3 seconds, then returns to idle)
   - 🔴 `Retry` — save failed, with a retry button

3. **Concurrent Write Protection:** While a save is in progress (`isSavingRef`), if the user types more, the new content is queued in `pendingContentRef`. After the current save completes, another save is automatically scheduled.

4. **Page Unload Protection:** A `beforeunload` event listener flushes any unsaved content using `fetch` with `keepalive: true` to ensure the request completes even as the page closes.

5. **Auto-Checkpointing:** On the server side, every content save checks if the last version snapshot is older than 10 minutes. If so, it automatically creates a version with `source: 'auto'`. This runs fire-and-forget so it doesn't block the response.

**Key files:**
- Client: `pages/EditorPage.tsx` (`saveContent`, `flushSave`, `retrySave`, `SaveIndicator` component)
- Server: `controllers/document.controller.ts` (`updateContent` with auto-checkpoint logic)

---

### 8. Version History

**What it does:** The application maintains previous revisions of documents. Users can view, preview, and restore earlier versions. Each version shows its timestamp, creator, and source (manual, auto, or restore).

**How it works:**

- **Version Model:** Each version stores `document` (reference), `versionNumber` (auto-incrementing per document), `title`, `content` (full snapshot), `createdBy` (user reference), and `source` ("manual", "auto", or "restore").

- **Creating Versions:**
  - **Manual:** User clicks the "Save Version" button → `POST /api/documents/:id/versions` creates a snapshot of current content
  - **Auto:** Every time content is saved and the last version is >10 minutes old, an automatic checkpoint is created
  - **Restore:** Restoring a version creates a new version tagged with `source: 'restore'`

- **Previewing Versions:** The `VersionHistoryPanel` lets users click on any version to preview it. The live content is saved in `liveContentRef`, the editor is set to read-only, and the version's content is loaded. A yellow banner shows "Previewing a previous version — The editor is read-only".

- **Restoring Versions:** `POST /api/documents/:id/versions/:versionId/restore`:
  1. Creates a new version snapshot from the old version's content (tagged as `restore`)
  2. Updates the live document's content and title
  3. Broadcasts the restored content and new version to all connected users via Socket.IO

- **Real-time Version Broadcasts:** When a version is created (manual or auto), the server emits `version:created` to the document room so the version history panel updates live for all collaborators.

**Key files:**
- Server: `controllers/version.controller.ts`, `models/Version.ts`
- Client: `components/editor/VersionHistoryPanel.tsx`, `services/versionService.ts`

---

### 9. Comments System

**What it does:** Users can add, reply to, resolve, and delete comments. Comments are threaded (top-level + replies).

**How it works:**

- **Comment Model:** Each comment stores `document`, `author`, `content`, `parentComment` (null for top-level, ObjectId for replies), `isResolved`, `resolvedBy`, and `resolvedAt`.

- **Operations and Permissions:**

| Operation | Who can do it |
|---|---|
| **Add comment** | Owner, Editor, Commenter (NOT Viewer) |
| **Reply to comment** | Owner, Editor, Commenter (NOT Viewer) |
| **Resolve/unresolve** | Owner, Editor only |
| **Delete own comment** | The comment's author |
| **Delete any comment** | Document owner |

- **Thread Structure:** The server fetches top-level comments (`parentComment: null`) and their replies in two queries, then nests replies into their parent comment objects.

- **Real-time Updates:** Every comment action (add, reply, resolve, delete) broadcasts a `comment:updated` event to the document room via Socket.IO. The `CommentsPanel` on the client listens for this event and re-fetches comments.

- **Activity Logging:** Every comment action is logged in the `Activity` collection for the activity feed.

**Key files:**
- Server: `controllers/comment.controller.ts`, `models/Comment.ts`
- Client: `components/editor/CommentsPanel.tsx`, `services/commentService.ts`

---

### 10. Sharing & Permissions

**What it does:** Document owners can share documents with other users by email, assigning one of three permission levels: **Viewer**, **Commenter**, or **Editor**. The system strictly enforces these permissions.

**How it works:**

- **Adding Collaborators** (`POST /api/documents/:id/collaborators`): Owner-only. Searches for the target user by email, validates they exist, checks they're not already a collaborator, and adds them with the specified role.

- **Updating Roles** (`PATCH /api/documents/:id/collaborators/:userId`): Owner-only. Changes a collaborator's role.

- **Removing Collaborators** (`DELETE /api/documents/:id/collaborators/:userId`): Owner can remove anyone. Collaborators can remove themselves (leave).

- **Permission Enforcement:**

| Permission Level | Can View | Can Comment | Can Edit | Can Share | Can Delete |
|---|---|---|---|---|---|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Commenter** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |

- **Server-side enforcement:** Every controller checks the user's role before allowing an action. Unauthorized users receive a `403 Forbidden` error.

- **Client-side enforcement:** The editor's `editable` prop is set based on permissions. Viewers and Commenters see a read-only editor. A role badge (e.g., "viewer", "editor") is displayed next to the document title for non-owners.

- **ShareModal** (`ShareModal.tsx`): A rich modal that lets the owner:
  - Search users by name/email with autocomplete (calls `GET /api/users/search?q=...`)
  - Add collaborators with a role dropdown
  - View current collaborators with their roles
  - Change collaborator roles inline
  - Remove collaborators

- **Socket.IO enforcement:** Content broadcast events (`document:content`) are also validated on the server — only owners and editors can broadcast.

**Key files:**
- Server: `controllers/document.controller.ts` (collaborator methods), `socket/index.ts` (content broadcast auth check)
- Client: `components/documents/ShareModal.tsx`, `pages/EditorPage.tsx` (permission derivation)

---

### 11. Live Cursor Tracking

**What it does:** Each collaborator's cursor position and text selection are visible to other users in real time, rendered as colored cursor lines with name labels.

**How it works:**

1. **Emitting Cursor Updates:** On every `onSelectionUpdate` in the Tiptap editor, the local user's selection `{from, to}` positions are sent to the server via `socket.emit('cursor:update', ...)`. This is **throttled** to at most once every 100ms to reduce network traffic.

2. **Server Relay:** The server receives `cursor:update` and broadcasts it to all other sockets in the document room, including the user's name and avatar color.

3. **Custom ProseMirror Plugin (`RemoteCursorExtension`):** This is a custom Tiptap extension that uses the ProseMirror `Plugin` and `Decoration` API to:
   - Render a colored vertical cursor line (`Decoration.widget`) at each remote user's cursor position
   - Attach a colored name label above the cursor
   - Render a semi-transparent colored highlight (`Decoration.inline`) for remote text selections
   - Exclude the current user's own cursor from rendering
   - Clamp cursor positions to valid document bounds

4. **Cursor Cleanup:** When a user leaves the document or disconnects, the server broadcasts a `cursor:update` with `cursor: null`, and the client's `handleCursorUpdate` removes that user's cursor from the map.

**Key files:**
- Client: `extensions/CursorExtension.ts`, `pages/EditorPage.tsx` (cursor throttling logic), `hooks/useSocket.ts` (cursor state management)
- Server: `socket/index.ts` (`cursor:update` handler)

---

### 12. Typing Indicators

**What it does:** Shows a "User X is typing..." indicator when other users are actively editing the document.

**How it works:**

1. When the local user types (detected in `onUpdate`), `typing:start` is emitted via Socket.IO.
2. A 2-second timeout is set; if no more typing occurs, `typing:stop` is emitted.
3. The server relays these events to other users in the room.
4. On the receiving client, typing users are tracked in state with auto-expiry (4-second timeout as a safety net).
5. The `TypingIndicator` component renders the names of typing users.

**Key files:**
- Client: `hooks/useSocket.ts` (typing state), `components/editor/TypingIndicator.tsx`
- Server: `socket/index.ts` (`typing:start` / `typing:stop` handlers)

---

### 13. Activity Feed

**What it does:** Every significant action on a document is logged and displayed in a real-time activity feed panel.

**How it works:**

- **Tracked Actions:** document created, document renamed, collaborator added/removed/role updated, collaborator joined/left, version restored, comment added/replied/resolved/reopened/deleted.

- **Activity Model:** Each activity stores `document`, `user`, `action` (enum), `details` (flexible metadata), and `createdAt`.

- **Logging:** The `logActivity()` utility function creates an activity record and broadcasts it via Socket.IO (`activity:new`).

- **Client:** The `ActivityFeedPanel` component fetches activities via REST (`GET /api/documents/:id/activity`) with pagination, and prepends live activities received via Socket.IO.

**Key files:**
- Server: `utils/activityLogger.ts`, `models/Activity.ts`, `controllers/activity.controller.ts`
- Client: `components/editor/ActivityFeedPanel.tsx`, `services/activityService.ts`

---

### 14. Keyboard Shortcuts

**What it does:** Common editor actions are accessible via keyboard shortcuts.

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Force save |
| `Ctrl+F` | Toggle Find & Replace |
| `Ctrl+Shift+E` | Export as Markdown |
| `Ctrl+Shift+P` | Export as PDF |
| `Ctrl+/` | Show keyboard shortcuts help |
| `Escape` | Close active panel or find bar |

**How it works:**

- The `useKeyboardShortcuts` hook registers a global `keydown` event listener that intercepts these key combinations, prevents default browser behavior, and calls the corresponding handler functions.

- A `KeyboardShortcutsModal` component displays the shortcuts reference when triggered.

**Key files:**
- Client: `hooks/useKeyboardShortcuts.ts`, `components/editor/KeyboardShortcutsModal.tsx`

---

### 15. Find & Replace

**What it does:** A floating find/replace bar that highlights all occurrences of a search term and allows navigating between matches and replacing text.

**How it works:**

1. **Custom ProseMirror Plugin (`SearchHighlightExtension`):** Uses the Decoration API to scan the document for all occurrences of the search term and apply highlight decorations:
   - `.search-match` class for regular matches (yellow highlight)
   - `.search-match-current` class for the currently focused match (orange highlight)

2. **FindReplaceBar Component:** Provides an input for the search term, match count display, navigation (Previous/Next), and Replace/Replace All functionality.

3. **State Management:** The search term and current match index are stored as ProseMirror plugin state, updated via transaction metadata. Match positions are recalculated whenever the search term changes or the document content changes.

**Key files:**
- Client: `extensions/SearchHighlight.ts`, `components/editor/FindReplaceBar.tsx`

---

### 16. Dark Mode

**What it does:** Full dark mode support with system preference detection and manual toggle. Persisted across sessions.

**How it works:**

- The `ThemeContext` checks `localStorage` for a saved preference, then falls back to `window.matchMedia('(prefers-color-scheme: dark)')`.
- Toggling adds/removes the `dark` class on `<html>`, enabling Tailwind CSS dark mode variants (`dark:bg-gray-800`, etc.).
- The preference is saved to `localStorage` under the key `syncwrite-theme`.
- A toggle button in the navbar switches between light and dark themes.

**Key files:**
- Client: `features/theme/ThemeContext.tsx`, `components/layout/Navbar.tsx`

---

### 17. User Avatars

**What it does:** Each user is assigned a color for their avatar. Initials-based colored circles are used throughout the app for user identification.

**How it works:**

- Each `User` model has an `avatarColor` field (defaults to `#3B82F6`).
- The `Avatar` component renders a circle with the user's initial and their assigned color.
- Avatars appear in: presence indicators, comments, activity feed, share modal, and navigation.

**Key files:**
- Client: `components/ui/Avatar.tsx`, `components/editor/PresenceAvatars.tsx`

---

### 18. Document Search

**What it does:** Users can search for documents by title from the dashboard.

**How it works:**

- The dashboard has a search input that updates `searchQuery` state.
- The `useDocuments` hook debounces the search (300ms) and calls `GET /api/documents?search=keyword`.
- On the server, the search query is escaped for regex safety and used in a case-insensitive regex filter on the `title` field.

**Key files:**
- Client: `hooks/useDocuments.ts` (debounced search), `pages/Dashboard.tsx` (search input)
- Server: `controllers/document.controller.ts` (`listDocuments` with search filter)

---

### 19. Export to PDF and Markdown

**What it does:** Users can export their document as a PDF or a Markdown (`.md`) file.

**How it works:**

- **Markdown Export:** The `buildMarkdown()` function recursively traverses the Tiptap JSON content tree and converts each node type (paragraph, heading, bulletList, orderedList, blockquote, codeBlock, etc.) into Markdown syntax. Inline marks (bold, italic, underline, link) are converted to their Markdown equivalents. The resulting string is saved as a `.md` file using the Blob API and a programmatic `<a>` click.

- **PDF Export:** The editor's HTML output (`editor.getHTML()`) is wrapped in a full HTML document with professional print-ready CSS. A new browser window is opened, the HTML is written into it, and `window.print()` is called — the browser's native print dialog allows saving to PDF.

**Key files:**
- Client: `pages/EditorPage.tsx` (`buildMarkdown`, `handleExport`)

---

### 20. Import Markdown

**What it does:** Users can import a Markdown file (`.md`) and have its content loaded into the editor.

**How it works:**

- The `ImportMarkdownButton` component renders a file input that accepts `.md` and `.txt` files.
- When a file is selected, it is read using the `FileReader` API.
- The Markdown text is parsed and converted into Tiptap-compatible JSON format.
- The converted content is set into the editor using `editor.commands.setContent()`.

**Key files:**
- Client: `components/editor/ImportMarkdownButton.tsx`

---

### 21. Document Pinning & Favorites

**What it does:** Users can pin and/or favorite documents for quick access. These preferences are per-user (each user has their own pins/favorites).

**How it works:**

- **DocumentPreference Model:** A separate MongoDB collection with fields `user`, `document`, `isPinned`, and `isFavorite`. A unique compound index on `{user, document}` ensures one preference record per user per document.

- **Toggle Endpoints:** `PATCH /api/documents/:id/pin` and `PATCH /api/documents/:id/favorite` toggle the respective boolean. If no preference record exists, one is created.

- **Dashboard Display:** The dashboard has dedicated sections for pinned and favorite documents.

- **Editor:** Pin and favorite toggle buttons are in the editor's top bar.

**Key files:**
- Server: `models/DocumentPreference.ts`, `controllers/document.controller.ts` (`togglePinDocument`, `toggleFavoriteDocument`)
- Client: `pages/EditorPage.tsx`, `pages/Dashboard.tsx`

---

## Database Schema Design

```
┌─────────────────┐     ┌──────────────────────┐
│      User       │     │      Document         │
├─────────────────┤     ├──────────────────────-┤
│ _id             │◄────│ owner (ref: User)     │
│ name            │     │ title                 │
│ email (unique)  │     │ content (Mixed/JSON)  │
│ passwordHash    │     │ collaborators[]       │
│ avatarColor     │     │   ├─ user (ref:User)  │
│ authProvider    │     │   └─ role (enum)      │
│ googleId        │     │ lastOpenedBy[]        │
│ timestamps      │     │   ├─ user (ref:User)  │
└─────────────────┘     │   └─ openedAt         │
                        │ timestamps            │
                        └───────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ DocumentVersion  │ │    Comment       │ │    Activity      │
├──────────────────┤ ├──────────────────┤ ├─────────────────-┤
│ document (ref)   │ │ document (ref)   │ │ document (ref)   │
│ versionNumber    │ │ author (ref)     │ │ user (ref)       │
│ title            │ │ content          │ │ action (enum)    │
│ content (Mixed)  │ │ parentComment    │ │ details (Mixed)  │
│ createdBy (ref)  │ │ isResolved       │ │ timestamps       │
│ source (enum)    │ │ resolvedBy (ref) │ └─────────────────-┘
│ timestamps       │ │ resolvedAt       │
└──────────────────┘ │ timestamps       │
                     └──────────────────┘

┌──────────────────────┐
│ DocumentPreference   │
├──────────────────────┤
│ user (ref)           │
│ document (ref)       │
│ isPinned             │
│ isFavorite           │
│ unique: {user, doc}  │
└──────────────────────┘
```

**Indexes:**
- `User.email` — unique index for login lookups
- `User.googleId` — unique sparse index for Google OAuth
- `Document.owner` — for "my documents" queries
- `Document.collaborators.user` — compound index for "shared with me" queries
- `Document.updatedAt` — for sorting by recent activity
- `DocumentVersion.{document, versionNumber}` — compound index for efficient version listing
- `Comment.{document, createdAt}` — compound index for listing comments
- `Comment.parentComment` — for finding replies
- `Activity.{document, createdAt}` — compound index for activity feed

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login with email/password |
| `POST` | `/api/auth/google-login` | Login with Google |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Logout (clear cookies) |
| `GET`  | `/api/auth/me` | Get current user |

### Documents
| Method | Endpoint | Description |
|---|---|---|
| `POST`   | `/api/documents` | Create document |
| `GET`    | `/api/documents` | List all user documents |
| `GET`    | `/api/documents/:id` | Get single document |
| `PATCH`  | `/api/documents/:id/rename` | Rename document |
| `POST`   | `/api/documents/:id/duplicate` | Duplicate document |
| `DELETE` | `/api/documents/:id` | Delete document |
| `PATCH`  | `/api/documents/:id/content` | Update document content |
| `PATCH`  | `/api/documents/:id/favorite` | Toggle favorite |
| `PATCH`  | `/api/documents/:id/pin` | Toggle pin |

### Collaborators
| Method | Endpoint | Description |
|---|---|---|
| `POST`   | `/api/documents/:id/collaborators` | Add collaborator |
| `GET`    | `/api/documents/:id/collaborators` | List collaborators |
| `PATCH`  | `/api/documents/:id/collaborators/:userId` | Update role |
| `DELETE` | `/api/documents/:id/collaborators/:userId` | Remove collaborator |

### Versions
| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/documents/:id/versions` | List versions (paginated) |
| `POST` | `/api/documents/:id/versions` | Create manual version |
| `GET`  | `/api/documents/:id/versions/:versionId` | Get version with content |
| `POST` | `/api/documents/:id/versions/:versionId/restore` | Restore version |

### Comments
| Method | Endpoint | Description |
|---|---|---|
| `GET`    | `/api/documents/:id/comments` | List comments with replies |
| `POST`   | `/api/documents/:id/comments` | Add top-level comment |
| `POST`   | `/api/documents/:id/comments/:commentId/replies` | Reply to comment |
| `PATCH`  | `/api/documents/:id/comments/:commentId/resolve` | Toggle resolve |
| `DELETE` | `/api/documents/:id/comments/:commentId` | Delete comment |

### Activity
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/documents/:id/activity` | Get activity feed (paginated) |

### Users
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/search?q=term` | Search users for sharing |

---

## Socket.IO Events Reference

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `document:join` | `{ documentId }` + callback | Join a document room |
| `document:leave` | `{ documentId }` | Leave a document room |
| `document:content` | `{ documentId, content }` | Broadcast content change |
| `cursor:update` | `{ documentId, cursor: {from, to} \| null }` | Share cursor position |
| `typing:start` | `{ documentId }` | Indicate typing started |
| `typing:stop` | `{ documentId }` | Indicate typing stopped |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `document:content` | `{ content, userId }` | Remote content change |
| `presence:update` | `UserPresence[]` | Active users in document |
| `cursor:update` | `{ userId, userName, color, cursor }` | Remote cursor position |
| `typing:start` | `{ userId, userName }` | Remote user started typing |
| `typing:stop` | `{ userId }` | Remote user stopped typing |
| `version:created` | `{ documentId, version }` | New version created |
| `comment:updated` | `{ documentId }` | Comment section changed |
| `activity:new` | `ActivityItem` | New activity logged |

---

## Project Structure

```
SyncWrite/
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/
│   │   │   ├── axios.ts             # Axios instance with token refresh interceptor
│   │   │   └── socket.ts            # Socket.IO client singleton with type-safe events
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── GoogleSignInButton.tsx
│   │   │   ├── documents/
│   │   │   │   ├── DashboardStatCards.tsx
│   │   │   │   ├── DocumentCard.tsx
│   │   │   │   ├── DocumentSection.tsx
│   │   │   │   ├── DocumentTableRow.tsx
│   │   │   │   ├── DocumentTableView.tsx
│   │   │   │   ├── RecentlyOpenedWidget.tsx
│   │   │   │   ├── ShareModal.tsx
│   │   │   │   └── SharedWithYouWidget.tsx
│   │   │   ├── editor/
│   │   │   │   ├── ActivityFeedPanel.tsx
│   │   │   │   ├── CommentsPanel.tsx
│   │   │   │   ├── EditorToolbar.tsx
│   │   │   │   ├── FindReplaceBar.tsx
│   │   │   │   ├── ImportMarkdownButton.tsx
│   │   │   │   ├── KeyboardShortcutsModal.tsx
│   │   │   │   ├── PresenceAvatars.tsx
│   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   └── VersionHistoryPanel.tsx
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   └── Navbar.tsx
│   │   │   └── ui/
│   │   │       ├── Avatar.tsx
│   │   │       └── ConfirmModal.tsx
│   │   ├── config/
│   │   │   └── firebase.ts          # Firebase client configuration
│   │   ├── extensions/
│   │   │   ├── CursorExtension.ts   # Custom ProseMirror plugin for remote cursors
│   │   │   └── SearchHighlight.ts   # Custom ProseMirror plugin for find/replace
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   └── AuthContext.tsx   # Authentication state provider
│   │   │   └── theme/
│   │   │       └── ThemeContext.tsx   # Dark mode state provider
│   │   ├── hooks/
│   │   │   ├── useAuth.ts           # Auth context consumer hook
│   │   │   ├── useDocuments.ts      # Document CRUD operations hook
│   │   │   ├── useKeyboardShortcuts.ts  # Global keyboard shortcut handler
│   │   │   └── useSocket.ts         # Socket.IO lifecycle + document room hook
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Document dashboard
│   │   │   ├── EditorPage.tsx       # Full-featured collaborative editor
│   │   │   ├── Login.tsx            # Login page
│   │   │   └── Register.tsx         # Registration page
│   │   ├── routes/
│   │   │   └── ProtectedRoute.tsx   # Auth guard for protected pages
│   │   ├── services/
│   │   │   ├── activityService.ts   # Activity API calls
│   │   │   ├── api.ts               # Legacy API instance
│   │   │   ├── commentService.ts    # Comment API calls
│   │   │   ├── documentService.ts   # Document + collaborator API calls
│   │   │   └── versionService.ts    # Version API calls
│   │   ├── types/
│   │   │   ├── activity.ts          # Activity type definitions
│   │   │   ├── document.ts          # Document, Version, Comment types
│   │   │   └── index.ts             # User and API response types
│   │   ├── utils/
│   │   │   └── password.ts          # Client-side password validation
│   │   ├── App.tsx                  # Root component with routing
│   │   ├── main.tsx                 # Entry point
│   │   ├── App.css                  # Global styles
│   │   └── index.css                # Tailwind imports + custom styles
│   ├── package.json
│   ├── vite.config.ts               # Vite config with API/WebSocket proxy
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── server/                          # Backend (Express + Socket.IO)
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.ts          # Firebase Admin SDK initialization
│   │   ├── controllers/
│   │   │   ├── activity.controller.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── comment.controller.ts
│   │   │   ├── document.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── version.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT authentication middleware
│   │   │   ├── errorHandler.ts      # Global error handler (AppError, Zod, Mongo)
│   │   │   └── validate.ts          # Zod schema validation middleware
│   │   ├── models/
│   │   │   ├── Activity.ts
│   │   │   ├── Comment.ts
│   │   │   ├── Document.ts
│   │   │   ├── DocumentPreference.ts
│   │   │   ├── User.ts
│   │   │   └── Version.ts
│   │   ├── routes/
│   │   │   ├── activity.routes.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── comment.routes.ts
│   │   │   ├── document.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   └── version.routes.ts
│   │   ├── socket/
│   │   │   ├── index.ts             # Socket.IO initialization + event handlers
│   │   │   └── types.ts             # Socket event type definitions
│   │   ├── utils/
│   │   │   ├── activityLogger.ts    # Activity logging + broadcast utility
│   │   │   ├── AppError.ts          # Custom error class
│   │   │   ├── jwt.ts               # JWT generation, verification, cookie helpers
│   │   │   ├── logger.ts            # Winston logger configuration
│   │   │   └── password.ts          # Strong password regex + validator
│   │   ├── validators/
│   │   │   ├── auth.validator.ts    # Zod schemas for auth routes
│   │   │   ├── comment.validator.ts # Zod schemas for comment routes
│   │   │   ├── document.validator.ts# Zod schemas for document routes
│   │   │   └── version.validator.ts # Zod schemas for version routes
│   │   ├── app.ts                   # Express app setup (middleware, routes)
│   │   ├── env.ts                   # dotenv loader
│   │   └── server.ts               # HTTP server + MongoDB connect + Socket init
│   ├── package.json
│   └── tsconfig.json
│
├── README.md                        # Project overview and setup instructions
└── architecture.md                  # This file — detailed architecture reference
```
