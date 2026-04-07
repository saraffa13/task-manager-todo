# TaskNest

Full-stack nested To-Do app built with Next.js 14 (App Router), MongoDB/Mongoose, NextAuth, and Tailwind.

## Features
- Email/password auth (NextAuth Credentials + bcrypt + JWT sessions)
- Workspaces shown as Excel-style tabs at the bottom
- Infinitely nested tasks with collapse/expand
- Cascade complete/uncomplete (parent <-> children)
- Cascade delete
- Mobile-first responsive UI

## Setup

```bash
cp .env.example .env.local
# fill in MONGODB_URI and NEXTAUTH_SECRET (run: openssl rand -base64 32)
npm install
npm run dev
```

Open http://localhost:3000 — sign up, log in, and start nesting tasks.

## Stack
Next.js 14 · TypeScript · MongoDB/Mongoose · NextAuth.js v4 · Tailwind CSS · bcryptjs
