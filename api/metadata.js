const fs = require('fs');
const path = require('path');
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing token ID' });

    const METADATA_DIR = path.join(process.cwd(), 'data/json');
    const HIDDEN_FILE = path.join(process.cwd(), 'hidden_metadata.json');
    const hiddenMetadata = JSON.parse(fs.readFileSync(HIDDEN_FILE, 'utf8'));

    // 1. Check if token is revealed in KV database
    const isRevealed = await kv.sismember('revealed_tokens', id);

    if (isRevealed) {
        const filePath = path.join(METADATA_DIR, `${id}.json`);
        if (fs.existsSync(filePath)) {
            const meta = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Rewrite the image URL to be absolute for OpenSea
            const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
            meta.image = `${baseUrl}/images/${id}.jpg`;

            return res.json(meta);
        }
    }

    // 2. Default to hidden
    res.json(hiddenMetadata);
};
