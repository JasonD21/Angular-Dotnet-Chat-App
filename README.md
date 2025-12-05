# Angular-Dotnet-Chat-App

A full-stack real-time chat application built with **Angular** (frontend) and **.NET / ASP.NET Core** (backend).  
This project demonstrates integration with SignalR, real-time messaging, support for multiple chat rooms, basic user interactions, and provides a foundation for further enhancements (e.g. authentication, persistence, UI improvements).

## 🚀 Features

- Real-time message exchange between clients via SignalR
- Support for multiple chat rooms / channels
- Simple UI built with Angular for sending/receiving messages and switching between rooms
- Clean separation between frontend and backend (Angular client + ASP.NET Core server)
- Easy to extend: you can plug in authentication, database storage, user lists, typing indicators, etc.

## 📁 Repository Structure

```text
/ (root)
│
├── backend/                 # ASP.NET Core server (SignalR hub, APIs, etc.)
│
├── frontend/                # Angular client app
│
├── .gitignore
├── fullstackAngularDotnetChatApp.sln   # .NET solution file
└── README.md                # This file
```

- **backend/** — contains the .NET project that hosts the SignalR hub, handles the real-time messaging logic, and serves as the API/server side.
- **frontend/** — contains the Angular application which connects to the backend SignalR hub and provides the chat UI.

## ✅ Prerequisites

Before running the application, make sure you have the following installed:

- [.NET SDK (version X or later)] — required for the backend
- [Node.js & npm] — required for the frontend
- [Angular CLI] (if you plan to build or modify the Angular client)

> _If you followed a specific tutorial, ensure your .NET SDK and Angular CLI versions match the tutorial’s versions for best compatibility._

## 🔧 Setup & Run

1. **Clone the repository**

   ```bash
   git clone https://github.com/JasonD21/Angular-Dotnet-Chat-App.git
   cd Angular-Dotnet-Chat-App
   ```

2. **Start the backend (ASP.NET Core server)**

   ```bash
   cd backend
   dotnet restore
   dotnet run
   ```

   This should start the server (e.g. on `https://localhost:5431` or whichever URL/port is configured).

3. **Install and start the frontend (Angular client)**

   Open a new terminal:

   ```bash
   cd frontend
   npm install
   npm start           # or `ng serve`, as defined in package.json
   ```

   This launches the Angular app (e.g. on `http://localhost:4200`), which should connect to the running backend.

   > **Note:** If backend and frontend run on different ports/domains, ensure CORS or proxy configuration is properly set to allow SignalR and HTTP requests.

4. **Use the app**

   - Open your browser and navigate to the Angular app URL (e.g. `http://localhost:4200`).
   - Join or create a chat room (if room functionality is implemented).
   - Send messages — they should appear in real time in all connected clients.

## 🛠️ How It Works (High-Level Architecture)

- The backend hosts a SignalR hub which acts as the central message broker. Clients connect to this hub.
- When a client sends a message (via the Angular UI), the message is sent to the SignalR hub.
- The hub then broadcasts the message to all connected clients (or clients in the same room), enabling real-time updates.
- The Angular frontend subscribes to SignalR events and updates the UI whenever a new message arrives.

This approach allows decoupling between UI and server logic, making it easier to extend (e.g. add user authentication, persistent chat history, multiple rooms, admin/moderation, etc.).

## 📦 Dependencies & Technologies

- **Frontend:** Angular, TypeScript, HTML/CSS
- **Backend:** ASP.NET Core (C#), SignalR
- **Communication:** WebSockets (via SignalR) for real-time messaging
- **Project Structure:** Separated projects for backend and frontend to keep concerns modular
