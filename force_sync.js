const { kv } = require('@vercel/kv');

async function sync() {
    console.log('Force-syncing reveal status for tokens 1-20...');
    const ids = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
    await kv.sadd('revealed_tokens', ...ids);
    console.log('Sync complete! Tokens 1-20 are now marked as REVEALED in your database.');
}

sync().catch(console.error);
