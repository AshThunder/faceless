const fs = require('fs');
const path = require('path');
const { kv } = require('@vercel/kv');
const { ethers } = require('ethers');

module.exports = async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing token ID' });

    const METADATA_DIR = path.join(process.cwd(), 'data/json');
    const HIDDEN_FILE = path.join(process.cwd(), 'hidden_metadata.json');
    const hiddenMetadata = JSON.parse(fs.readFileSync(HIDDEN_FILE, 'utf8'));

    // Support the user's specific placeholder name if it exists in the contract
    hiddenMetadata.name = "The Whispering Veil";

    // 1. Check if token is revealed in KV database (Fast Track)
    let isRevealed = await kv.sismember('revealed_tokens', id);
    let revealSource = isRevealed ? 'kv' : 'none';

    // 2. If not in KV, check the blockchain directly (Safety Net)
    if (!isRevealed) {
        const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
        const CONTRACT = process.env.CONTRACT_ADDRESS;
        const NETWORK = process.env.NETWORK; // e.g., 'base-mainnet'

        if (ALCHEMY_KEY && CONTRACT) {
            try {
                // CORRECTED Alchemy mapping (v2 uses full network-type subdomains)
                let rpcUrl;
                if (NETWORK === 'base-sepolia') {
                    rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`;
                } else {
                    // Default to base-mainnet for stability
                    rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
                }

                const provider = new ethers.JsonRpcProvider(rpcUrl);

                // Minimal ABI for ownerOf
                const abi = ["function ownerOf(uint256 tokenId) view returns (address)"];
                const contract = new ethers.Contract(CONTRACT, abi, provider);

                // Use BigInt to avoid any floating point or string issues
                const tokenId = BigInt(id);
                const owner = await contract.ownerOf(tokenId);

                if (owner && owner !== ethers.ZeroAddress) {
                    isRevealed = true;
                    revealSource = 'blockchain';
                    // Cache it in KV so we don't have to RPC check again
                    await kv.sadd('revealed_tokens', id);
                    console.log(`Token #${id} revealed via live blockchain check.`);
                }
            } catch (err) {
                // If ownerOf reverts, the token likely isn't minted yet.
                console.log(`Token #${id} check failed or not minted: ${err.message}`);
            }
        }
    }

    if (isRevealed) {
        const filePath = path.join(METADATA_DIR, `${id}.json`);
        if (fs.existsSync(filePath)) {
            const meta = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Rewrite the image URL to be absolute for OpenSea
            const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
            meta.image = `${baseUrl}/images/${id}.jpg`;

            res.setHeader('X-Reveal-Source', revealSource);
            return res.json(meta);
        }
    }

    // 3. Default to hidden
    res.setHeader('X-Reveal-Source', revealSource);
    res.json(hiddenMetadata);
};
