## Broke by 30

An interactive financial-life simulation for SteelHacks. The Xtract demo turns a public financial source into a traceable, realistic life event.

### News to Life Event demo

Open `/xtract`, then scan, select a document, and run Xtract. Each generated scenario carries its signal ID, evidence excerpt, publication, headline, date, and original URL.

- Live ingestion currently uses the public BLS RSS feed.
- If the feed is unavailable, the UI explicitly switches to cached, dated public-source demo documents in `data/demoNews.ts`; it never labels them live.
- Add `NVIDIA_API_KEY` (and optionally `NVIDIA_MODEL`) to use NVIDIA/Nemotron structured extraction. Without it—or after an API failure—the deterministic, keyword-based extractor preserves a reliable demo path.
- New sources implement `NewsSource` in `lib/news/types.ts`, keeping RSS, government releases, manual text, and future GDELT adapters independent of extraction and scenario generation.

The generated event intentionally remains a standalone typed object for clean handoff into the game engine once the owned game files are implemented.

## Development

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
