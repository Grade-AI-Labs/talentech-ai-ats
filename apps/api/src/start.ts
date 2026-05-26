import { buildServer } from './server.js';

async function main(): Promise<void> {
  const app = await buildServer({ logger: true });
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ port, host });
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
