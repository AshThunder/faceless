const fs = require('fs');
const path = require('path');
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
    const { file } = req.query;
    if (!file) return res.status(400).send('Missing file parameter');

    const id = file.split('.')[0];
    const IMAGES_DIR = path.join(process.cwd(), 'data/images');
    const HIDDEN_IMG = path.join(process.cwd(), 'data/hidden_image.jpg');

    // Check if token is revealed in KV database
    const isRevealed = await kv.sismember('revealed_tokens', id);

    if (isRevealed) {
        const imgPath = path.join(IMAGES_DIR, file);
        if (fs.existsSync(imgPath)) {
            res.setHeader('Content-Type', 'image/jpeg');
            return res.send(fs.readFileSync(imgPath));
        }
    }

    // Default to hidden
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(fs.readFileSync(HIDDEN_IMG));
};
