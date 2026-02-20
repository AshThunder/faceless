const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
    try {
        const ids = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
        await kv.sadd('revealed_tokens', ...ids);

        const count = await kv.scard('revealed_tokens');

        res.status(200).json({
            status: "Success",
            message: "Tokens #1-20 have been force-revealed in the KV database.",
            total_revealed_in_db: count,
            next_steps: "Refresh OpenSea cache using the 'Refresh Metadata' button."
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
