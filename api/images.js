const fs = require('fs');
const path = require('path');
const { kv } = require('@vercel/kv');
const { ethers } = require('ethers');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { file } = req.query;
    if (!file) return res.status(400).send('Missing file parameter');

    const id = file.split('.')[0];
    const IMAGES_DIR = path.join(process.cwd(), 'data/images');
    const HIDDEN_IMG = path.join(process.cwd(), 'data/hidden_image.jpg');

    // 1. Check if token is revealed in KV database (Fast Track)
    let isRevealed = await kv.sismember('revealed_tokens', id);

    // 2. If not in KV, check the blockchain directly (Safety Net)
    if (!isRevealed) {
        const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
        const CONTRACT = process.env.CONTRACT_ADDRESS;
        const NETWORK = process.env.NETWORK; // e.g., 'base-mainnet'

        if (ALCHEMY_KEY && CONTRACT) {
            try {
                // CORRECTED Alchemy mapping
                let rpcUrl;
                if (NETWORK === 'base-sepolia') {
                    rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`;
                } else {
                    rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
                }

                const provider = new ethers.JsonRpcProvider(rpcUrl);
                const abi = ["function ownerOf(uint256 tokenId) view returns (address)"];
                const contract = new ethers.Contract(CONTRACT, abi, provider);

                const owner = await contract.ownerOf(id);
                if (owner && owner !== ethers.ZeroAddress) {
                    isRevealed = true;
                    // Cache it in KV
                    await kv.sadd('revealed_tokens', id);
                }
            } catch (err) {
                console.log(`Token #${id} image check failed or not minted: ${err.message}`);
            }
        }
    }

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
