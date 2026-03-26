# Mindly: AI Career Coach (v2.0)

Mindly is a modern AI-powered interview preparation platform. This version features a complete architectural migration to a relational database and GraphQL for high performance and scalability.

## 🚀 Tech Stack
- **Frontend**: React (Vite 8), Tailwind CSS, Apollo Client 3
- **Backend**: Node.js, Express, Apollo Server 3
- **Database**: PostgreSQL (via Prisma ORM) — *SQLite used for local development*
- **Auth**: JWT-based authentication via GraphQL mutations

## 🛠️ Local Development

### 1. Backend Setup
1. Navigate to the server folder: `cd server`
2. Install dependencies: `npm install`
3. Generate Prisma client: `npx prisma generate`
4. Initialize the database: `npx prisma db push`
5. Start the server: `npm run start` (Runs on port 5000)

### 2. Frontend Setup
1. Navigate to the client folder: `cd client`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev` (Runs on port 5173)

## 🌐 Deployment
For free deployment instructions, refer to the [deployment_guide.md](file:///C:/Users/sanje/.gemini/antigravity/brain/c6081ad3-e043-4e00-99f6-02e9ff32bd65/deployment_guide.md).

### Quick Deployment Recommendation:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Supabase (PostgreSQL)

## 📝 Key Changes in v2.0
- **Unified API**: Replaced 10+ REST endpoints with a single `/graphql` endpoint.
- **Improved State**: Migrated `AuthContext` and `Dashboard` to use Apollo's smart caching.
- **Vite 8 Support**: Upgraded the build pipeline for faster development and production bundling.
- **De-hardcoded Logic**: Centralized interview prompts in `server/config/interviewPrompts.js`.

---
*Built with Mindly v2.0 Architecture.*
