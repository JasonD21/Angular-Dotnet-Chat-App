# Real-Time Chat App — Angular + ASP.NET Core

A full-stack real-time chat application with authenticated users, persistent messages, and live delivery over WebSockets.

**Frontend:** Angular 20 · Angular Material · Tailwind CSS v4 · SignalR client
**Backend:** ASP.NET Core (.NET 9) · SignalR · EF Core + SQL Server · ASP.NET Identity + JWT

## Features

- **User accounts** — registration and login via ASP.NET Core Identity, issued a JWT by a dedicated token service
- **Real-time messaging** — SignalR hub broadcasts messages instantly to connected clients across chat rooms
- **Authenticated WebSockets** — the JWT is forwarded to hub connections via the `access_token` query string, so SignalR connections are authorized just like HTTP requests
- **Message persistence** — EF Core with SQL Server; pending migrations are applied automatically at startup
- **Video chat** — a dedicated SignalR hub handles video call signaling between peers
- **Modern Angular frontend** — standalone Angular 20 app with Angular Material components and Tailwind CSS v4

## Architecture
┌─────────────────────┐ HTTPS (REST) ┌──────────────────────────┐
│ Angular 20 client │ ──────────────────────────► │ ASP.NET Core (.NET 9) │
│ Material + Tailwind│ │ Minimal API endpoints │
│ SignalR JS client │ ◄────── WebSockets ───────► │ ChatHub · VideoChatHub │
└─────────────────────┘ (JWT via access_token) │ Identity + JWT auth │
│ EF Core ──► SQL Server │
└──────────────────────────┘

Notable implementation details:

- **JWT over WebSockets.** Browsers can't send Authorization headers on WebSocket upgrade requests, so the backend's `JwtBearerEvents.OnMessageReceived` reads the token from the query string for any request hitting `/hubs`, letting `[Authorize]` work uniformly across REST and SignalR.
- **Self-migrating database.** On startup the API resolves the `AppDbContext` and calls `Database.Migrate()`, so a fresh clone reaches a working schema with no manual EF commands.
- **Minimal APIs with endpoint extensions.** Account routes are grouped in a `MapAccountEndpoint()` extension rather than MVC controllers.

## Getting started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org) and the Angular CLI (`npm i -g @angular/cli`)
- SQL Server (LocalDB, Express, or a container)

### 1. Backend

```bash
cd backend
```

In `appsettings.json` (or user secrets), set:

- `ConnectionStrings:DefaultConnection` — your SQL Server connection string
- `JWTSetting:SecurityKey` — a long random secret for signing tokens

Then:

```bash
dotnet restore
dotnet run
```

Migrations apply automatically on first run. Note the API URL printed in the console.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`. CORS on the backend is preconfigured for this origin.

## Project structure
├── backend/ ASP.NET Core API — hubs, endpoints, Identity, EF Core, migrations
├── frontend/ Angular 20 app — components, SignalR service, Material UI
└── fullstackAngularDotnetChatApp.sln

## Roadmap

- Refresh tokens (currently access-token only)
- Typing indicators and online presence
- Unit and integration tests

## Acknowledgements

Started from a tutorial foundation, then extended with JWT-authenticated hubs, ASP.NET Identity, EF Core persistence, and video chat signaling.
