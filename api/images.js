const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    const { file } = req.query;
    if (!file) return res.status(400).send('Missing file parameter');

    const id = file.split('.')[0];
    const MINTED_FILE = path.join(process.cwd(), 'data/minted_status.json');
    const IMAGES_DIR = path.join(process.cwd(), 'data/images');
    const HIDDEN_IMG = path.join(process.cwd(), 'data/hidden_image.jpg');

    let mintedIds = [];
    if (fs.existsSync(MINTED_FILE)) {
        mintedIds = JSON.parse(fs.readFileSync(MINTED_FILE, 'utf8'));
    }

    if (mintedIds.includes(id)) {
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
