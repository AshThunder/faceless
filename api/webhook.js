const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { event } = req.body;

    if (!event || !event.activity) {
        return res.status(400).send('Invalid webhook event');
    }

    const revealedThisBatch = [];

    for (const activity of event.activity) {
        // Alchemy Transfer events from Mint (0x0 address)
        if (activity.fromAddress === '0x0000000000000000000000000000000000000000') {
            const tokenId = parseInt(activity.erc721TokenId, 16).toString();
            revealedThisBatch.push(tokenId);
            console.log(`Reveal queued for Token ID: ${tokenId}`);
        }
    }

    if (revealedThisBatch.length > 0) {
        // 1. Atomic add to KV set
        await kv.sadd('revealed_tokens', ...revealedThisBatch);

        // 2. Proactively trigger OpenSea Metadata Refresh (if key provided)
        const openseaKey = process.env.OPENSEA_API_KEY;
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const network = process.env.NETWORK || 'base'; // Default to base

        if (openseaKey && contractAddress) {
            for (const tokenId of revealedThisBatch) {
                try {
                    await fetch(`https://api.opensea.io/api/v2/chain/${network}/contract/${contractAddress}/nfts/${tokenId}/refresh`, {
                        method: 'POST',
                        headers: {
                            'X-API-KEY': openseaKey,
                            'accept': 'application/json'
                        }
                    });
                    console.log(`OpenSea refresh triggered for token ${tokenId}`);
                } catch (err) {
                    console.error(`Failed to trigger OpenSea refresh for ${tokenId}:`, err);
                }
            }
        }
    }

    res.status(200).send('Webhook processed');
};
