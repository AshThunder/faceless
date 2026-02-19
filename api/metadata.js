const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing token ID' });

    const MINTED_FILE = path.join(process.cwd(), 'data/minted_status.json');
    const METADATA_DIR = path.join(process.cwd(), 'data/json');
    const HIDDEN_FILE = path.join(process.cwd(), 'hidden_metadata.json');

    const hiddenMetadata = JSON.parse(fs.readFileSync(HIDDEN_FILE, 'utf8'));

    // Check if token is minted
    let mintedIds = [];
    if (fs.existsSync(MINTED_FILE)) {
        mintedIds = JSON.parse(fs.readFileSync(MINTED_FILE, 'utf8'));
    }

    if (mintedIds.includes(id)) {
        const filePath = path.join(METADATA_DIR, `${id}.json`);
        if (fs.existsSync(filePath)) {
            const meta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return res.json(meta);
        }
    }

    // Default to hidden
    res.json(hiddenMetadata);
};
