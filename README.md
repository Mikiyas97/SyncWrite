# SyncWrite

A collaborative document editor built with React, TypeScript, Express, MongoDB, Socket.IO, and Firebase authentication. SyncWrite supports real-time editing presence, version history, comments, sharing, and document management.

## Features

- User authentication with email/password and Google sign-in
- Document creation, renaming, duplication, and deletion
- Document favorites and pinning per user for organized workspace navigation
- Interactive dashboard stat cards (All Documents, Owned by me, Shared with me, Favorites, Pinned)
- Real-time collaboration using Socket.IO
- Presence awareness for active document collaborators
- Document comments and threaded replies
- Version history and manual restore
- Activity feed and audit logging for document edits and collaboration actions
- Collaborator sharing with role-based access control
- REST API backend with validation, authentication, and logging
- Tailwind CSS-powered dashboard and editor UI

## Architecture

SyncWrite is split into two main apps:

- `client/`: React + Vite frontend
- `server/`: Express + TypeScript backend with Socket.IO

### Client

- React Router for navigation
- Tailwind CSS for styling
- Axios for HTTP requests
- Socket.IO client for live collaboration
- Firebase for auth and token management
- Custom hooks for auth, documents, and sockets

### Server

- Express REST API with route validation using Zod
- MongoDB models for users, documents, comments, and versions
- Socket.IO for collaborative document rooms and presence updates
- JWT authentication for both HTTP and WebSocket flows
- Rate limiting for auth endpoints
- Central error handling and request logging

## Folder Structure

```
SyncWrite/
├─ client/                # React application
│  ├─ public/
│  ├─ src/
│  │  ├─ api/             # Axios and socket client setup
│  │  ├─ components/      # UI components and page layout
│  │  ├─ config/          # Firebase configuration
│  │  ├─ features/        # auth context and feature-level state
│  │  ├─ hooks/           # reusable hooks
│  │  ├─ pages/           # route pages
│  │  ├─ routes/          # protected route wrappers
│  │  ├─ services/        # API service wrappers
│  │  ├─ types/           # shared TypeScript types
│  │  └─ utils/           # misc helpers
├─ server/                # Express API server
│  ├─ src/
│  │  ├─ config/          # Firebase admin and environment config
│  │  ├─ controllers/     # route handler logic
│  │  ├─ middleware/      # auth, validation, error handling
│  │  ├─ models/          # Mongoose schemas
│  │  ├─ routes/          # Express routers
│  │  ├─ socket/          # Socket.IO event handling
│  │  ├─ utils/           # logging, JWT, app error classes
│  │  └─ validators/      # Zod request schemas
│  ├─ package.json
│  └─ tsconfig.json
└─ README.md
```

## Prerequisites

- Node.js 20+ (or compatible LTS)
- npm
- MongoDB instance
- Firebase project with service account credentials

## Installation

```bash
# From repository root
cd SyncWrite

# Install dependencies for server and client
cd server
npm install

cd ../client
npm install
```

## Environment Variables

### Server

Create `server/.env` with:

```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/syncwrite
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
```

> Note: If the Firebase private key contains newlines, preserve them as `\n` sequences.

### Client

Create `client/.env` with your Firebase settings:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Local Development

### Start backend

```bash
cd server
npm run dev
```

### Start frontend

```bash
cd client
npm run dev
```

Then open the Vite app at the displayed URL, typically `http://localhost:5173`.

## Testing

There is no automated test suite configured yet. For manual verification:

- Register/login a user
- Create or duplicate a document
- Open the editor and type content
- Invite collaborators and verify presence updates
- Create comments and resolve threads
- Create versions and restore prior snapshots

## Database Schema

### User

The user model includes:

- `name`: string
- `email`: string
- `password`: hashed string
- `avatarColor`: string
- `isGoogleUser`: boolean
- timestamps

### Document

Fields:

- `title`: string
- `content`: mixed JSON for rich text state
- `owner`: ObjectId -> User
- `collaborators`: array of { user, role }
- `lastOpenedBy`: array of { user, openedAt }
- `createdAt`, `updatedAt`

Indexes:

- `owner`
- `collaborators.user`
- `updatedAt` descending

### Comment

Fields:

- `document`: ObjectId -> Document
- `author`: ObjectId -> User
- `content`: string
- `parentComment`: ObjectId -> Comment | null
- `isResolved`: boolean
- `resolvedBy`, `resolvedAt`
- timestamps

Indexes:

- `{ document: 1, createdAt: 1 }`
- `{ parentComment: 1 }`

### Version

Fields:

- `document`: ObjectId -> Document
- `versionNumber`: number
- `title`: string
- `content`: mixed JSON
- `createdBy`: ObjectId -> User
- `source`: enum(`manual`, `auto`, `restore`)
- timestamps

Indexes:

- `{ document: 1, versionNumber: -1 }`

### DocumentPreference

Per-user document preferences (favorites & pinned):

- `user`: ObjectId -> User
- `document`: ObjectId -> Document
- `isPinned`: boolean
- `isFavorite`: boolean
- `createdAt`, `updatedAt`

Unique index: `{ user: 1, document: 1 }`

### Activity

Audit log and document activity feed:

- `document`: ObjectId -> Document
- `user`: ObjectId -> User
- `action`: string (e.g. `document_created`, `title_updated`, `collaborator_added`)
- `details`: Record<string, any>
- `createdAt`, `updatedAt`

Indexes:

- `{ document: 1, createdAt: -1 }`

## REST API Documentation

### Auth

- `POST /api/auth/register`
  - Body: `{ name, email, password }`
  - Response: authenticated user and tokens

- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Response: authenticated user and tokens

- `POST /api/auth/google-login`
  - Body: `{ token }`
  - Response: authenticated user and tokens

- `POST /api/auth/refresh`
  - Body: none
  - Requires: `refresh_token` cookie
  - Response: new access token set as a cookie and current user profile

- `POST /api/auth/logout`
  - Body: none
  - Response: success

- `GET /api/auth/me`
  - Auth: cookie or Bearer token
  - Response: current user profile

### Documents

All document routes require authentication and a valid JWT.

- `POST /api/documents`
  - Body: `{ title? }`
  - Creates a new document.
  - Response: created document.

- `GET /api/documents`
  - Returns user documents and shared documents.

- `GET /api/documents/:id`
  - Returns the document by ID.

- `PATCH /api/documents/:id/rename`
  - Body: `{ title }`
  - Renames the document.

- `POST /api/documents/:id/duplicate`
  - Duplicates the document and returns the new copy.

- `PATCH /api/documents/:id/content`
  - Body: `{ content }`
  - Updates document content.

- `DELETE /api/documents/:id`
  - Deletes the document.

### Document Preferences

- `PATCH /api/documents/:id/favorite`
  - Toggles favorite status for the document for the requesting user.

- `PATCH /api/documents/:id/pin`
  - Toggles pin status for the document for the requesting user.

### Document Activity Feed

- `GET /api/documents/:id/activity`
  - Returns recent audit log activity items for the document.

### Collaborators

- `POST /api/documents/:id/collaborators`
  - Body: `{ userId, role }`
  - Adds a collaborator.

- `GET /api/documents/:id/collaborators`
  - Lists collaborators.

- `PATCH /api/documents/:id/collaborators/:userId`
  - Body: `{ role }`
  - Updates collaborator role.

- `DELETE /api/documents/:id/collaborators/:userId`
  - Removes a collaborator.

### Comments

- `GET /api/documents/:id/comments`
  - Returns comments for a document.

- `POST /api/documents/:id/comments`
  - Body: `{ content, parentComment? }`
  - Creates a comment or reply.

- `POST /api/documents/:id/comments/:commentId/replies`
  - Body: `{ content }`
  - Adds a reply.

- `PATCH /api/documents/:id/comments/:commentId/resolve`
  - Resolves or reopens a comment thread.

- `DELETE /api/documents/:id/comments/:commentId`
  - Deletes a comment.

### Versions

- `GET /api/documents/:id/versions`
  - Lists version history.

- `POST /api/documents/:id/versions`
  - Creates a manual version snapshot.

- `GET /api/documents/:id/versions/:versionId`
  - Gets a version by ID.

- `POST /api/documents/:id/versions/:versionId/restore`
  - Restores a version snapshot.

### Users

- `GET /api/users/search?query=...`
  - Searches users by name or email for sharing.

## Socket.IO Event Documentation

### Connection

- Connect to the server with cookies carrying the authentication JWT.
- Socket middleware verifies `access_token` or `jwt` from cookies.

### Client → Server

- `document:join`
  - Payload: `{ documentId }`
  - Joins the document room and verifies access.
  - Ack: `{ success: boolean, error?: string }`

- `document:leave`
  - Payload: `{ documentId }`
  - Leaves the document room and broadcasts presence.

- `document:content`
  - Payload: `{ documentId, content }`
  - Sends content updates to other room members.
  - Only owner/editors are allowed to broadcast.

### Server → Client

- `document:content`
  - Broadcasts live content updates to collaborators in the room.
  - Payload: `{ content, userId }`

- `presence:update`
  - Broadcasts active collaborators in the document room.
  - Payload: `UserPresence[]`

## Security Decisions

- JWT required for all protected REST routes and Socket.IO connections.
- `express-rate-limit` protects login and registration endpoints.
- Zod validation enforces request shape and prevents malformed input.
- CORS is restricted to `CLIENT_URL`.
- MongoDB indexes support scoped queries and activity sorting.
- Socket middleware checks token type and user existence before allowing room access.
- Owner and collaborator roles are checked before allowing document edits.

## Deployment

1. Build the frontend:

```bash
cd client
npm run build
```

2. Build the backend:

```bash
cd server
npm run build
```

3. Deploy the server with environment variables set.

4. Serve the frontend build from a static host or configure the backend to serve `client/dist`.

## Known Limitations

- No automated tests yet.
- Versioning is manual only; automatic snapshot creation is not implemented.
- Comments are stored separately from editor content and may not sync with complex editor state.
- Real-time collaboration is limited to broadcasting content updates; there is no OT/CRDT merge conflict resolution.
- Firebase authentication is only used for login flows; the backend still relies on JWT cookies.

## Technical Trade-offs

- Chose Socket.IO for faster real-time collaboration with room-based events rather than WebRTC or polling.
- Used MongoDB mixed content storage for flexibility with TipTap editor state, instead of a strict document model.
- Stored comment threads in separate documents to simplify moderation and indexing.
- Kept backend and frontend separate for easier local development, at the cost of additional deployment configuration.

## Getting Help

If you run into issues, verify your `.env` files, MongoDB connectivity, and that the client and server apps are running on matching ports.
