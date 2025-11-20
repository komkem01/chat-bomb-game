# Chat Bomb: Tactical Edition

เกมวางระเบิดคำศัพท์แบบ Real-time ที่ใช้ Next.js, TypeScript และ Supabase PostgreSQL

## Features

- 🎮 Real-time multiplayer word game
- 💣 Dynamic bomb word system
- 🔥 Live chat with elimination mechanics
- 🎯 Room-based gameplay (6-digit codes)
- 📱 Responsive design with Tailwind CSS
- ⚡ Fast and reliable with Supabase PostgreSQL (Node.js backend running on Vercel)
- 🌏 Thai language support

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Font Awesome icons
- **Database**: Supabase PostgreSQL (direct Postgres connection via Node.js)
- **Real-time**: Supabase Realtime subscriptions
- **Deployment**: Vercel-ready

## Quick Start

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/komkem01/chat-bomb-game.git
cd chat-bomb-game
\`\`\`

### 2. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Configure Database & Environment Variables

1. Go to [Supabase](https://supabase.com) (or use the provided cluster) and run the SQL in `database/schema.sql` to create the schema
2. Create a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://<user>:<password>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

`DATABASE_URL` is consumed only by the server-side API routes, while the `NEXT_PUBLIC_*` values are used for realtime subscriptions.

### 4. Run the development server
\`\`\`bash
npm run dev
\`\`\`

Visit [http://localhost:3000](http://localhost:3000) to start playing!

## Database Schema

The game uses 3 main tables:

- **rooms**: Game rooms with bomb word settings
- **room_players**: Players in each room with elimination status
- **messages**: Chat messages with boom detection

## How to Play

1. **Enter your name** to join the game lobby
2. **Create a room** or **join existing room** with 6-digit code
3. **Set trap word**: Room owner sets a secret word and hint
4. **Chat carefully**: Avoid using the bomb word or get eliminated!
5. **Last player standing wins** 🏆

## Game Mechanics

- Players chat in real-time
- If someone types the bomb word, they're eliminated instantly
- Eliminated players can still watch but can't chat
- Room owner can close the game anytime
- Games can be reset for multiple rounds

## Deployment

- The included `vercel.json` opts each `app/api/*` route into the Node.js 18 runtime.
- Add your `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables inside the Vercel dashboard.
- Run `npm run build` locally to ensure the app compiles, then push to the `main` branch or connect your GitHub repo to Vercel for automatic deployments.

## Backend API Overview

All mutations hit serverless endpoints (so secrets never reach the browser):

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/rooms` | Create a new room and register the host |
| POST | `/api/rooms/join` | Join an existing room |
| GET | `/api/rooms/[roomId]` | Fetch room snapshot (room + players + chat) |
| POST | `/api/rooms/[roomId]/settings` | Host defines the trap word and hint |
| POST | `/api/messages` | Send a chat message (server evaluates boom condition) |
| POST | `/api/rooms/[roomId]/close` | Close the room (host only) |
| POST | `/api/rooms/[roomId]/reset` | Reset the room back to `IDLE` |

## Environment Variables

See step 3 above for the required variables. The runtime will fail to start if `DATABASE_URL` is missing.

## Development

- \`npm run dev\`: Start development server
- \`npm run build\`: Build for production
- \`npm run start\`: Start production server
- \`npm run lint\`: Run ESLint
- \`npm run type-check\`: Run TypeScript checking

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Made with ❤️ by [komkem01](https://github.com/komkem01)