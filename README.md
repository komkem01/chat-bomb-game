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
CRON_SECRET=vGwamd156Ps0w0LAHyOAlVFL5UM3Poyz
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
- Each round runs on a 10-minute timer. If time expires with zero eliminations, the server auto-closes the round and announces “ทุกคนเก่งมากที่ยังอยู่รอด”.

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
| POST | `/api/rooms/cleanup` | Delete `CLOSED` rooms and cascade messages older than the retention window |
| GET | `/api/cron` | Vercel Cron hook that calls the cleanup service (accepts optional `?days=` override) |

## Environment Variables

See step 3 above for the required variables. The runtime will fail to start if `DATABASE_URL` is missing.

## Development

- \`npm run dev\`: Start development server
- \`npm run build\`: Build for production
- \`npm run start\`: Start production server
- \`npm run lint\`: Run ESLint
- \`npm run type-check\`: Run TypeScript checking

## Automated Data Cleanup

- Closed rooms become eligible for deletion once their `updated_at` is at least 24 hours old (default grace period of 1 day).
- Schedule a recurring job (e.g., Vercel Cron) that hits the dedicated `GET /api/cron` endpoint to purge expired rooms and their cascading messages/players. This route proxies to the same cleanup service and accepts an optional `?days=` query string.
- A default cron entry is already defined in `vercel.json`, running daily at 10:00 UTC:

	```json
	{
		"crons": [
			{
				"path": "/api/cron",
				"schedule": "0 10 * * *"
			}
		]
	}
	```

- Protect the endpoint by setting `CRON_SECRET` and sending requests with `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret` header) — requests without the secret are rejected whenever the env var is present. When running locally without `CRON_SECRET`, the endpoint stays open for manual testing.
- Manual invocations can still `POST` to `/api/rooms/cleanup` and override the retention window by sending a JSON body such as `{ "days": 3 }`, or `{ "days": 0 }` to delete every closed room immediately.

### Edge Function ping example

```ts
// supabase/functions/chat-bomb-cleanup/index.ts
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? 'vGwamd156Ps0w0LAHyOAlVFL5UM3Poyz';

Deno.serve(async (req) => {
	const authHeader = req.headers.get('authorization');
	if (authHeader !== `Bearer ${CRON_SECRET}`) {
		return new Response('Unauthorized', { status: 401 });
	}

	const response = await fetch('https://<your-vercel-domain>/api/cron', {
		headers: {
			Authorization: `Bearer ${CRON_SECRET}`,
		},
	});

	return new Response(await response.text(), { status: response.status });
});
```

### Supabase cron (pg_net) example

```sql
select
	cron.schedule(
		'chat-bomb-cleanup',
		'*/5 * * * *', -- every 5 minutes (tweak as needed)
		$$
		select
			net.http_post(
				url := 'https://<your-vercel-domain>/api/cron',
				headers := jsonb_build_object(
					'Authorization', 'Bearer vGwamd156Ps0w0LAHyOAlVFL5UM3Poyz'
				),
				body := '{}'::jsonb
			);
		$$
	);
```

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