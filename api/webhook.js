const fs = require('fs');
const path = require('path');

// NOTE: In a real production environment with high traffic, 
// you should use a database like Redis or Supabase instead of a file.
// For a 4,000 NFT drop, this is a starting point.

module.exports = (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { webhook_id, event } = req.body;

    // Simple validation (you should use a secret key from Alchemy in production)
    if (!event || !event.activity) {
        return res.status(400).send('Invalid webhook event');
    }

    const MINTED_FILE = path.join(process.cwd(), 'data/minted_status.json');
    let mintedIds = [];
    if (fs.existsSync(MINTED_FILE)) {
        mintedIds = JSON.parse(fs.readFileSync(MINTED_FILE, 'utf8'));
    }

    event.activity.forEach(activity => {
        // Alchemy Transfer events
        if (activity.fromAddress === '0x0000000000000000000000000000000000000000') {
            const tokenId = parseInt(activity.erc721TokenId, 16).toString();
            if (!mintedIds.includes(tokenId)) {
                mintedIds.push(tokenId);
                console.log(`Revealed Token ID: ${tokenId}`);
            }
        }
    });

    // Save back (Note: Vercel files are temporary. A DB is better for long term)
    fs.writeFileSync(MINTED_FILE, JSON.stringify(mintedIds));

    res.status(200).send('Webhook processed');
};
