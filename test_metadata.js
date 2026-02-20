const fs = require('fs');
const path = require('path');

// Mock req and res
const req = { query: { id: '1' }, headers: { host: 'localhost:3000' } };
const res = {
    json: (data) => console.log(JSON.stringify(data, null, 2)),
    status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data) })
};

// Mock KV
const kv = {
    sismember: async () => true // Simulate revealed
};

// Use the local function
const metadataFunc = async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing token ID' });

    const METADATA_DIR = path.join(__dirname, 'data/json');
    const HIDDEN_FILE = path.join(__dirname, 'hidden_metadata.json');
    const hiddenMetadata = JSON.parse(fs.readFileSync(HIDDEN_FILE, 'utf8'));

    const isRevealed = await kv.sismember('revealed_tokens', id);

    if (isRevealed) {
        const filePath = path.join(METADATA_DIR, `${id}.json`);
        if (fs.existsSync(filePath)) {
            const meta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
            meta.image = `${baseUrl}/images/${id}.jpg`;
            return res.json(meta);
        }
    }
    res.json(hiddenMetadata);
};

metadataFunc(req, res);
