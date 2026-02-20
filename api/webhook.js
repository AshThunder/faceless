const { kv } = require('@vercel/kv');
const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { event } = req.body;

    if (!event || !event.activity) {
        return res.status(400).send('Invalid webhook event');
    }

    const revealedThisBatch = [];
    const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    const NETWORK = process.env.NETWORK; // e.g., 'base' or 'base-sepolia'

    // Map internal network names to OpenSea chain identifiers
    const networkMap = {
        'base-mainnet': 'base',
        'base-sepolia': 'base_sepolia',
        'ethereum': 'ethereum',
        'mainnet': 'ethereum'
    };

    const osChain = networkMap[NETWORK] || NETWORK;

    for (const activity of event.activity) {
        if (activity.fromAddress === '0x0000000000000000000000000000000000000000') {
            const tokenId = parseInt(activity.erc721TokenId, 16).toString();
            revealedThisBatch.push(tokenId);
            console.log(`Reveal queued for Token ID: ${tokenId}`);

            // Optional: Tell OpenSea to refresh this token immediately
            if (OPENSEA_API_KEY && CONTRACT_ADDRESS && osChain) {
                try {
                    await axios.post(
                        `https://api.opensea.io/v2/chain/${osChain}/contract/${CONTRACT_ADDRESS}/nfts/${tokenId}/refresh`,
                        {},
                        {
                            headers: {
                                'accept': 'application/json',
                                'X-API-KEY': OPENSEA_API_KEY
                            }
                        }
                    );
                    console.log(`OpenSea refresh triggered for #${tokenId}`);
                } catch (err) {
                    console.error(`OpenSea refresh failed for #${tokenId}:`, err.response?.data || err.message);
                }
            }
        }
    }

    if (revealedThisBatch.length > 0) {
        await kv.sadd('revealed_tokens', ...revealedThisBatch);
    }

    res.status(200).send('Webhook processed');
};
