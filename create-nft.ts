import {
    createNft,
    fetchDigitalAsset,
    mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

import {
    airdropIfRequired,
    getExplorerLink,
    getKeypairFromFile,
} from "@solana-developers/helpers";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

import {
    Connection,
    clusterApiUrl,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
    generateSigner,
    keypairIdentity,
    percentAmount,
    publicKey, // ✅ ADD THIS
} from "@metaplex-foundation/umi";

// ----------------------
// Setup connection
// ----------------------
const connection = new Connection(clusterApiUrl("devnet"));

// Load wallet
const user = await getKeypairFromFile();

// Airdrop SOL if needed
await airdropIfRequired(
    connection,
    user.publicKey,
    1 * LAMPORTS_PER_SOL,
    0.5 * LAMPORTS_PER_SOL
);

console.log("Loaded user:", user.publicKey.toBase58());

// ----------------------
// Setup UMI
// ----------------------
const umi = createUmi(clusterApiUrl("devnet"));
umi.use(mplTokenMetadata());

// Set identity
const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
umi.use(keypairIdentity(umiUser));

console.log("Set up Umi instance for user");

// ----------------------
// Collection Address
// ----------------------
const collectionAddress = publicKey(
    "3TNCmPTmfefHQRgs2Dwn5xbCvgnaC94rSBQKQa1Lfgey"
);

// ----------------------
// Create NFT
// ----------------------
console.log("Creating NFT...");

const mint = generateSigner(umi);
console.log(`\n🚀 Minting NFT...`);
console.log(`Mint Address: ${mint.publicKey.toString()}`);
console.log(`Track it on explorer: https://explorer.solana.com/address/${mint.publicKey.toString()}?cluster=devnet\n`);

const transaction = await createNft(umi, {
    mint,
    name: "My NFT",
    uri: "https://raw.githubusercontent.com/Nitin07u/Stoiclabs-NFT/main/nft2.json?v=2",
    sellerFeeBasisPoints: percentAmount(0),
    collection: {
        key: collectionAddress,
        verified: false,
    },
});

// 🔥 IMPORTANT: Send transaction with finalized commitment to ensure it lands
console.log("Sending transaction and waiting for FINALIZED commitment (this may take 15-30s)...");
await transaction.sendAndConfirm(umi, {
    send: { skipPreflight: true },
    confirm: { commitment: "finalized" },
});

// ⏳ Wait for devnet sync (very important)
await new Promise((resolve) => setTimeout(resolve, 2000));

// ----------------------
// Fetch NFT with Retry
// ----------------------
let createdNft;
const maxRetries = 10;

for (let i = 0; i < maxRetries; i++) {
    try {
        createdNft = await fetchDigitalAsset(umi, mint.publicKey);
        break; // Successfully fetched, exit the loop
    } catch (error: any) {
        if (
            error.name === "AccountNotFoundError" ||
            error.message?.includes("AccountNotFoundError")
        ) {
            console.log(`Account not found yet, retrying... (${i + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, 3000)); // wait 3s
        } else {
            throw error; // If it's a different error, throw immediately
        }
    }
}

if (!createdNft) {
    throw new Error("Failed to fetch NFT after multiple retries. The RPC is either extremely delayed or the transaction failed silently.");
}

// ----------------------
// Output result
// ----------------------
console.log(
    `📦 Created NFT! Address is ${getExplorerLink(
        "address",
        createdNft.mint.publicKey,
        "devnet"
    )}`
);
console.log("Reached NFT creation section");