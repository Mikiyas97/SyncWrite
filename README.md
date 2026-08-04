# SyncWrite — Real-Time Collaborative Document Editor

A full-stack, real-time collaborative document editor built with React, Node.js, Socket.IO, and MongoDB. Think Google Docs — but built from scratch.

> 📖 **For a detailed architecture breakdown and feature deep-dive, see [architecture.md](./architecture.md).**

---


## Features

### Core Features
- **Authentication** — Email/password registration & login + Google OAuth via Firebase
- **Dashboard** — View owned, shared, recently opened, pinned, and favorited documents
- **Document Management** — Create, rename, delete, duplicate documents
- **Rich Text Editor** — Headings, bold, italic, underline, lists, alignment, links, code blocks (powered by Tiptap/ProseMirror)
- **Real-Time Collaboration** — Multiple users edit the same document simultaneously via Socket.IO
- **Presence Awareness** — See who's currently viewing the document with colored avatars
- **Auto Save** — Changes persist automatically with debounced saving and a visual save indicator
- **Version History** — Manual + automatic version snapshots, preview past versions, restore with one click
- **Comments** — Threaded comments with replies, resolve/reopen, role-based permissions
- **Sharing & Permissions** — Share by email with Viewer, Commenter, or Editor roles

### Bonus Features
- **Live Cursor Tracking** — See other users' cursors and selections in real time
- **Typing Indicators** — "User X is typing..." notifications
- **Activity Feed** — Real-time log of all document events (edits, shares, comments, etc.)
- **Keyboard Shortcuts** — Ctrl+S (save), Ctrl+F (find), Ctrl+Shift+E (export .md), Ctrl+Shift+P (export PDF)
- **Find & Replace** — In-document text search with match highlighting and replace
- **Dark Mode** — System-aware with manual toggle, persisted in localStorage
- **User Avatars** — Color-coded initials-based avatars throughout the app
- **Document Search** — Search documents by title from the dashboard
- **Export** — Download documents as PDF or Markdown (.md)
- **Import Markdown** — Upload a `.md` file into the editor
- **Pin & Favorite** — Per-user document pinning and favorites

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tiptap v3, Socket.IO Client, React Router v7, Axios, Tailwind CSS, Lucide React, Firebase SDK |
| **Backend** | Node.js, Express 5, TypeScript, Socket.IO, Mongoose, JWT, bcrypt, Firebase Admin, Zod, Winston, Morgan |
| **Database** | MongoDB |

---

## Setup Instructions

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** — either running locally or a MongoDB Atlas connection string
- **Git** — to clone the repository
- *(Optional)* A **Firebase project** if you want Google OAuth sign-in

### Step 1: Clone the Repository

```bash
git clone https://github.com/Mikiyas97/SyncWrite.git
cd SyncWrite
```

### Step 2: Set Up the Server

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Create your environment file from the example
cp .env.example .env
```

Open `server/.env` and configure the required variables:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/syncwrite
CLIENT_URL=http://localhost:5173

# Generate strong random secrets for production
JWT_SECRET=your_access_token_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here

# Optional — only needed for Google OAuth
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Start the server:

```bash
npm run dev
```

The server will start on `http://localhost:5000`. You should see:

```
Connected to MongoDB
Server is running on port 5000
```

### Step 3: Set Up the Client

Open a new terminal:

```bash
# Navigate to the client directory
cd client

# Install dependencies
npm install

# Create your environment file from the example
cp .env.example .env
```

Open `client/.env` and configure (optional — only needed for Google sign-in):

```env
# Optional — API is auto-proxied by Vite, only set if deploying separately
# VITE_API_URL=http://localhost:5000/api

# Optional — only needed for Google OAuth
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

Start the client:

```bash
npm run dev
```

The client will start on `http://localhost:5173`. Vite automatically proxies `/api` and `/socket.io` requests to the server at port 5000.

### Step 4: Use the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Register a new account with name, email, and password
3. You will be redirected to the Dashboard
4. Click **"+ New Document"** to create your first document
5. To test real-time collaboration, open the same document URL in a second browser/incognito window with a different account

### Setting Up Google OAuth (Optional)

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Authentication → Sign-in method → Google**
3. Go to **Project Settings → General → Your apps** and create a Web app to get the client-side config (`apiKey`, `authDomain`, `projectId`) — add these to `client/.env`
4. Go to **Project Settings → Service Accounts** and generate a private key JSON — extract `project_id`, `client_email`, and `private_key` into `server/.env`

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description | Default |
|---|---|---|---|
| `PORT` | No | Server port | `5000` |
| `NODE_ENV` | No | Environment mode | `development` |
| `MONGODB_URI` | **Yes** | MongoDB connection string | `mongodb://localhost:27017/syncwrite` |
| `CLIENT_URL` | No | Frontend URL for CORS | `http://localhost:5173` |
| `JWT_SECRET` | **Yes** | Secret for signing access tokens | — |
| `JWT_REFRESH_SECRET` | **Yes** | Secret for signing refresh tokens | — |
| `FIREBASE_PROJECT_ID` | No | Firebase project ID (for Google login) | — |
| `FIREBASE_CLIENT_EMAIL` | No | Firebase service account email | — |
| `FIREBASE_PRIVATE_KEY` | No | Firebase service account private key | — |

### Client (`client/.env`)

| Variable | Required | Description | Default |
|---|---|---|---|
| `VITE_API_URL` | No | Override API base URL | `/api` (Vite proxy) |
| `VITE_FIREBASE_API_KEY` | No | Firebase web API key | — |
| `VITE_FIREBASE_AUTH_DOMAIN` | No | Firebase auth domain | — |
| `VITE_FIREBASE_PROJECT_ID` | No | Firebase project ID | — |

> **Note:** Firebase variables are only required for Google Sign-In. The application works fully with email/password authentication alone.

---

## Scripts

### Server

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start dev server with hot reload (`tsx watch`) |
| `build` | `npm run build` | Compile TypeScript to `dist/` |
| `start` | `npm start` | Run compiled production build |

### Client

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start Vite dev server with HMR |
| `build` | `npm run build` | TypeScript check + Vite production build |
| `preview` | `npm run preview` | Preview production build locally |
| `lint` | `npm run lint` | Run oxlint |

---

## Database Schema

SyncWrite uses **MongoDB** with **Mongoose** as the ODM. The database consists of 6 collections:

### Entity Relationship Diagram

```
┌─────────────────┐       ┌───────────────────────┐
│      User       │       │       Document         │
├─────────────────┤       ├───────────────────────-┤
│ _id             │◄──────│ owner (ref: User)      │
│ name            │       │ title                  │
│ email (unique)  │       │ content (Mixed/JSON)   │
│ passwordHash    │       │ collaborators[]        │
│ avatarColor     │       │   ├─ user (ref: User)  │
│ authProvider    │       │   └─ role (enum)       │
│ googleId        │       │ lastOpenedBy[]         │
│ createdAt       │       │   ├─ user (ref: User)  │
│ updatedAt       │       │   └─ openedAt          │
└─────────────────┘       │ createdAt              │
                          │ updatedAt              │
                          └────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌────────────────────┐   ┌────────────────────┐   ┌─────────────────────┐
│  DocumentVersion   │   │     Comment        │   │     Activity        │
├────────────────────┤   ├────────────────────┤   ├─────────────────────┤
│ document (ref)     │   │ document (ref)     │   │ document (ref)      │
│ versionNumber      │   │ author (ref: User) │   │ user (ref: User)    │
│ title              │   │ content            │   │ action (enum)       │
│ content (Mixed)    │   │ parentComment (ref)│   │ details (Mixed)     │
│ createdBy (ref)    │   │ isResolved         │   │ createdAt           │
│ source (enum)      │   │ resolvedBy (ref)   │   │ updatedAt           │
│ createdAt          │   │ resolvedAt         │   └─────────────────────┘
│ updatedAt          │   │ createdAt          │
└────────────────────┘   │ updatedAt          │
                         └────────────────────┘

┌──────────────────────────┐
│   DocumentPreference     │
├──────────────────────────┤
│ user (ref: User)         │
│ document (ref: Document) │
│ isPinned                 │
│ isFavorite               │
│ createdAt                │
│ updatedAt                │
│ unique index: {user,doc} │
└──────────────────────────┘
```

### Collection Details

#### User

| Field | Type | Description |
|---|---|---|
| `name` | String | User's display name (required, 2-50 chars) |
| `email` | String | Unique, lowercase, trimmed email |
| `passwordHash` | String | bcrypt-hashed password (excluded from JSON output) |
| `avatarColor` | String | Hex color for avatar (default: `#3B82F6`) |
| `authProvider` | Enum | `'local'` or `'google'` |
| `googleId` | String | Google UID (unique, sparse index) |

#### Document

| Field | Type | Description |
|---|---|---|
| `title` | String | Document title (max 255 chars, default: "Untitled Document") |
| `content` | Mixed | Tiptap/ProseMirror JSON content |
| `owner` | ObjectId → User | Document creator and owner |
| `collaborators` | Array | List of `{ user: ObjectId, role: 'editor' \| 'viewer' \| 'commenter' }` |
| `lastOpenedBy` | Array | List of `{ user: ObjectId, openedAt: Date }` for recently-opened tracking |

**Indexes:** `owner`, `collaborators.user`, `updatedAt` (descending)

#### DocumentVersion

| Field | Type | Description |
|---|---|---|
| `document` | ObjectId → Document | Parent document |
| `versionNumber` | Number | Auto-incrementing per document |
| `title` | String | Document title at time of snapshot |
| `content` | Mixed | Full content snapshot |
| `createdBy` | ObjectId → User | User who created the version |
| `source` | Enum | `'manual'` \| `'auto'` \| `'restore'` |

**Indexes:** `{ document: 1, versionNumber: -1 }` (compound)

#### Comment

| Field | Type | Description |
|---|---|---|
| `document` | ObjectId → Document | Parent document |
| `author` | ObjectId → User | Comment author |
| `content` | String | Comment text (max 2000 chars) |
| `parentComment` | ObjectId → Comment \| null | Null for top-level, ID for replies |
| `isResolved` | Boolean | Whether the thread is resolved |
| `resolvedBy` | ObjectId → User \| null | Who resolved it |
| `resolvedAt` | Date \| null | When it was resolved |

**Indexes:** `{ document: 1, createdAt: 1 }`, `{ parentComment: 1 }`

#### Activity

| Field | Type | Description |
|---|---|---|
| `document` | ObjectId → Document | Parent document |
| `user` | ObjectId → User | User who performed the action |
| `action` | Enum | One of: `document_created`, `document_renamed`, `collaborator_added`, `collaborator_removed`, `collaborator_role_updated`, `collaborator_joined`, `collaborator_left`, `version_restored`, `comment_added`, `comment_replied`, `comment_resolved`, `comment_reopened`, `comment_deleted` |
| `details` | Mixed | Action-specific metadata (e.g., old/new title, target user, role) |

**Indexes:** `{ document: 1, createdAt: -1 }` (compound)

#### DocumentPreference

| Field | Type | Description |
|---|---|---|
| `user` | ObjectId → User | The user |
| `document` | ObjectId → Document | The document |
| `isPinned` | Boolean | Whether the user has pinned this document |
| `isFavorite` | Boolean | Whether the user has favorited this document |

**Indexes:** `{ user: 1, document: 1 }` (unique compound)

---

## API Documentation

All API endpoints are prefixed with `/api`. Responses follow a consistent format:

```json
{
  "success": true,
  "message": "Description of the result",
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

### Authentication

All auth endpoints set/clear HTTP-only cookies for tokens. No manual token handling is needed on the client.

---

#### `POST /api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "MyStr0ng!Pass"
}
```

**Password Requirements:** ≥8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character (`@$!%*?&`).

**Success Response:** `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "avatarColor": "#3B82F6",
      "authProvider": "local",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Cookies Set:** `access_token` (15 min), `refresh_token` (30 days)

**Rate Limit:** 10 requests per 15 minutes

---

#### `POST /api/auth/login`

Log in with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "MyStr0ng!Pass"
}
```

**Success Response:** `200 OK` — same format as register.

**Error Responses:**
- `401` — Invalid email or password

**Rate Limit:** 5 requests per minute

---

#### `POST /api/auth/google-login`

Log in or register using a Google Firebase ID token.

**Request Body:**
```json
{
  "token": "firebase-id-token-string"
}
```

**Success Response:** `200 OK` — same format as register. Creates a new user if one doesn't exist.

---

#### `POST /api/auth/refresh`

Refresh the access token using the refresh token cookie.

**Cookies Required:** `refresh_token`

**Success Response:** `200 OK` — returns user data and sets a new `access_token` cookie.

---

#### `POST /api/auth/logout`

Log out by clearing all auth cookies.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `GET /api/auth/me`

Get the currently authenticated user. 🔒 **Requires authentication.**

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "...", "email": "...", ... }
  }
}
```

---

### Documents

All document endpoints require authentication (🔒).

---

#### `POST /api/documents` 🔒

Create a new document. The authenticated user becomes the owner.

**Request Body:**
```json
{
  "title": "My Document"
}
```
`title` is optional — defaults to `"Untitled Document"`.

**Success Response:** `201 Created`
```json
{
  "success": true,
  "message": "Document created successfully",
  "data": {
    "document": {
      "_id": "...",
      "title": "My Document",
      "content": { "type": "doc", "content": [{ "type": "paragraph", "content": [] }] },
      "owner": { "_id": "...", "name": "...", "email": "...", "avatarColor": "..." },
      "collaborators": [],
      "lastOpenedBy": [],
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

---

#### `GET /api/documents` 🔒

List all documents the user owns or collaborates on. Supports search by title.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `search` | string | *(optional)* Filter documents by title (case-insensitive) |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "owned": [ ... ],
    "shared": [ ... ],
    "recentlyOpened": [ ... ],
    "pinned": [ ... ],
    "favorites": [ ... ],
    "total": 12
  }
}
```

Each document includes `isPinned` and `isFavorite` boolean flags (per-user).

---

#### `GET /api/documents/:id` 🔒

Get a single document. Also records a "last opened" timestamp for the user.

**Authorization:** Owner or collaborator.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "document": {
      "_id": "...",
      "title": "...",
      "content": { ... },
      "owner": { "_id": "...", "name": "...", "email": "...", "avatarColor": "..." },
      "collaborators": [
        { "user": { "_id": "...", "name": "...", "email": "...", "avatarColor": "..." }, "role": "editor" }
      ],
      "isPinned": false,
      "isFavorite": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Error Responses:**
- `403` — You do not have access to this document
- `404` — Document not found

---

#### `PATCH /api/documents/:id/rename` 🔒

Rename a document.

**Authorization:** Owner only.

**Request Body:**
```json
{
  "title": "New Title"
}
```

**Success Response:** `200 OK`

---

#### `POST /api/documents/:id/duplicate` 🔒

Duplicate a document. Creates a new document with the same content, owned by the requesting user. Collaborators are not copied.

**Authorization:** Owner or collaborator.

**Success Response:** `201 Created` — returns the new document with title `"Original Title (Copy)"`.

---

#### `DELETE /api/documents/:id` 🔒

Delete a document permanently.

**Authorization:** Owner only.

**Success Response:** `200 OK`

---

#### `PATCH /api/documents/:id/content` 🔒

Update document content (Tiptap JSON). Also triggers auto-checkpointing if the last version is older than 10 minutes.

**Authorization:** Owner or Editor collaborator.

**Request Body:**
```json
{
  "content": {
    "type": "doc",
    "content": [
      { "type": "paragraph", "content": [{ "type": "text", "text": "Hello world" }] }
    ]
  }
}
```

**Success Response:** `200 OK`

---

#### `PATCH /api/documents/:id/favorite` 🔒

Toggle the favorite status for the current user.

**Authorization:** Owner or collaborator.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Document added to favorites",
  "data": { "isFavorite": true, "isPinned": false }
}
```

---

#### `PATCH /api/documents/:id/pin` 🔒

Toggle the pin status for the current user.

**Authorization:** Owner or collaborator.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Document pinned",
  "data": { "isFavorite": false, "isPinned": true }
}
```

---

### Collaborators

All collaborator endpoints require authentication (🔒).

---

#### `POST /api/documents/:id/collaborators` 🔒

Add a collaborator by email with a specific role.

**Authorization:** Owner only.

**Request Body:**
```json
{
  "email": "collaborator@example.com",
  "role": "editor"
}
```

`role` must be one of: `"editor"`, `"viewer"`, `"commenter"`.

**Success Response:** `200 OK` — returns updated document.

**Error Responses:**
- `400` — User is already a collaborator / Cannot add yourself
- `404` — User with this email was not found

---

#### `GET /api/documents/:id/collaborators` 🔒

List the owner and all collaborators for a document.

**Authorization:** Owner or any collaborator.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "owner": { "_id": "...", "name": "...", "email": "...", "avatarColor": "..." },
    "collaborators": [
      { "user": { "_id": "...", "name": "...", "email": "...", "avatarColor": "..." }, "role": "editor" }
    ]
  }
}
```

---

#### `PATCH /api/documents/:id/collaborators/:userId` 🔒

Update a collaborator's permission role.

**Authorization:** Owner only.

**Request Body:**
```json
{
  "role": "commenter"
}
```

**Success Response:** `200 OK`

---

#### `DELETE /api/documents/:id/collaborators/:userId` 🔒

Remove a collaborator. The owner can remove anyone; a collaborator can remove themselves (leave the document).

**Authorization:** Owner, or the collaborator removing themselves.

**Success Response:** `200 OK`

---

### Versions

All version endpoints require authentication (🔒). Routes are nested under `/api/documents/:id/versions`.

---

#### `GET /api/documents/:id/versions` 🔒

List all version snapshots for a document, newest first. Content is excluded for performance.

**Authorization:** Owner or any collaborator.

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 50) |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "_id": "...",
        "document": "...",
        "versionNumber": 5,
        "title": "My Document",
        "createdBy": { "_id": "...", "name": "...", "email": "...", "avatarColor": "..." },
        "source": "manual",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
  }
}
```

---

#### `POST /api/documents/:id/versions` 🔒

Create a manual version snapshot of the current document content.

**Authorization:** Owner or Editor.

**Success Response:** `201 Created`

**Socket.IO Side Effect:** Emits `version:created` to the document room.

---

#### `GET /api/documents/:id/versions/:versionId` 🔒

Get a specific version with full content included.

**Authorization:** Owner or any collaborator.

**Success Response:** `200 OK` — includes `content` field.

---

#### `POST /api/documents/:id/versions/:versionId/restore` 🔒

Restore a previous version. This:
1. Creates a new version snapshot tagged as `source: 'restore'`
2. Updates the live document content and title to match the restored version
3. Broadcasts the restored content to all connected users via Socket.IO

**Authorization:** Owner or Editor.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Document restored to version 3",
  "data": {
    "version": { ... },
    "document": { ... }
  }
}
```

**Socket.IO Side Effects:** Emits `document:content` and `version:created` to the document room.

---

### Comments

All comment endpoints require authentication (🔒). Routes are nested under `/api/documents/:id/comments`.

---

#### `GET /api/documents/:id/comments` 🔒

List all comments for a document. Returns top-level comments with their replies nested.

**Authorization:** Owner or any collaborator (including Viewers).

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "...",
        "document": "...",
        "author": { "_id": "...", "name": "...", "email": "...", "avatarColor": "..." },
        "content": "This is a comment",
        "parentComment": null,
        "isResolved": false,
        "resolvedBy": null,
        "resolvedAt": null,
        "replies": [
          {
            "_id": "...",
            "author": { ... },
            "content": "This is a reply",
            "parentComment": "parent-id",
            "createdAt": "..."
          }
        ],
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

---

#### `POST /api/documents/:id/comments` 🔒

Add a top-level comment.

**Authorization:** Owner, Editor, or Commenter. (**NOT** Viewer.)

**Request Body:**
```json
{
  "content": "This section needs revision"
}
```

**Success Response:** `201 Created`

**Socket.IO Side Effect:** Emits `comment:updated` to the document room.

---

#### `POST /api/documents/:id/comments/:commentId/replies` 🔒

Reply to an existing comment.

**Authorization:** Owner, Editor, or Commenter. (**NOT** Viewer.)

**Request Body:**
```json
{
  "content": "I agree, let me fix it"
}
```

**Success Response:** `201 Created`

---

#### `PATCH /api/documents/:id/comments/:commentId/resolve` 🔒

Toggle the resolved/unresolved status of a top-level comment thread.

**Authorization:** Owner or Editor only.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Comment resolved",
  "data": {
    "comment": { ... , "isResolved": true, "resolvedBy": { ... }, "resolvedAt": "..." }
  }
}
```

---

#### `DELETE /api/documents/:id/comments/:commentId` 🔒

Delete a comment or reply. If a top-level comment is deleted, all its replies are also deleted.

**Authorization:** The comment's author, or the document owner.

**Success Response:** `200 OK`

---

### Activity

---

#### `GET /api/documents/:id/activity` 🔒

Get the activity feed for a document, sorted newest first.

**Authorization:** Owner or any collaborator.

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 30 | Items per page (max 100) |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "_id": "...",
        "document": "...",
        "user": { "_id": "...", "name": "Jane", "email": "...", "avatarColor": "..." },
        "action": "collaborator_added",
        "details": { "targetUserName": "John", "role": "editor" },
        "createdAt": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 30, "total": 15, "totalPages": 1 }
  }
}
```

---

### Users

---

#### `GET /api/users/search?q=term` 🔒

Search users by name or email for the share/collaborate autocomplete. Returns up to 5 matches, excluding the current user.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `q` | string | Search term (minimum 2 characters) |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "users": [
      { "_id": "...", "name": "Jane Smith", "email": "jane@example.com", "avatarColor": "#10B981" }
    ]
  }
}
```

---

## Socket.IO Events

Real-time collaboration is powered by Socket.IO. The connection is authenticated via the JWT cookie.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `document:join` | `{ documentId }` + callback | Join a document room (verifies access) |
| `document:leave` | `{ documentId }` | Leave a document room |
| `document:content` | `{ documentId, content }` | Broadcast content change to other users |
| `cursor:update` | `{ documentId, cursor: {from, to} \| null }` | Share cursor position |
| `typing:start` | `{ documentId }` | Indicate typing started |
| `typing:stop` | `{ documentId }` | Indicate typing stopped |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `document:content` | `{ content, userId }` | Remote user's content change |
| `presence:update` | `UserPresence[]` | Updated list of active users in document |
| `cursor:update` | `{ userId, userName, color, cursor }` | Remote cursor position |
| `typing:start` | `{ userId, userName }` | Remote user started typing |
| `typing:stop` | `{ userId }` | Remote user stopped typing |
| `version:created` | `{ documentId, version }` | New version snapshot was created |
| `comment:updated` | `{ documentId }` | Comments were modified (re-fetch) |
| `activity:new` | `ActivityItem` | New activity entry was logged |

---

## Project Structure

```
SyncWrite/
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/                     # Axios instance, Socket.IO client
│   │   ├── components/
│   │   │   ├── auth/                # GoogleSignInButton
│   │   │   ├── documents/           # Dashboard cards, ShareModal, table views
│   │   │   ├── editor/              # Toolbar, Comments, Versions, Presence, FindReplace
│   │   │   ├── layout/              # Navbar, DashboardLayout
│   │   │   └── ui/                  # Avatar, ConfirmModal
│   │   ├── config/                  # Firebase client config
│   │   ├── extensions/              # Custom TipTap/ProseMirror plugins (cursors, search)
│   │   ├── features/                # AuthContext, ThemeContext
│   │   ├── hooks/                   # useAuth, useDocuments, useSocket, useKeyboardShortcuts
│   │   ├── pages/                   # Dashboard, EditorPage, Login, Register
│   │   ├── routes/                  # ProtectedRoute
│   │   ├── services/                # REST API service functions
│   │   ├── types/                   # TypeScript type definitions
│   │   └── utils/                   # Password validation
│   ├── package.json
│   ├── vite.config.ts               # Vite config with API/WebSocket proxy
│   └── tailwind.config.js
│
├── server/                          # Backend (Express + Socket.IO)
│   ├── src/
│   │   ├── config/                  # Firebase Admin SDK setup
│   │   ├── controllers/             # Route handlers (auth, document, version, comment, activity, user)
│   │   ├── middleware/              # JWT auth, Zod validation, global error handler
│   │   ├── models/                  # Mongoose schemas (User, Document, Version, Comment, Activity, DocumentPreference)
│   │   ├── routes/                  # Express route definitions
│   │   ├── socket/                  # Socket.IO initialization + event handlers
│   │   ├── utils/                   # JWT helpers, password validation, logger, activity logger, AppError
│   │   ├── validators/             # Zod validation schemas
│   │   ├── app.ts                   # Express app setup
│   │   └── server.ts               # HTTP server + MongoDB + Socket init
│   └── package.json
│
├── README.md                        # This file
└── architecture.md                  # Detailed architecture & feature deep-dive
```

---

## Documentation

- **[architecture.md](./architecture.md)** — Detailed architecture, feature implementation explanations, and how every feature works under the hood
