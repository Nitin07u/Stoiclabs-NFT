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

import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

import {
    generateSigner,
    keypairIdentity,
    percentAmount,
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
const endpoint = clusterApiUrl("devnet");
const umi = createUmi(endpoint);
umi.use(mplTokenMetadata());

// Set identity
const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
umi.use(keypairIdentity(umiUser));

console.log("Set up Umi instance for user");


// ----------------------
// Create Collection NFT
// ----------------------
const collectionMint = generateSigner(umi);

const transaction = await createNft(umi, {
    mint: collectionMint,
    name: "My Collection",
    symbol: "STOIC",
    uri: "https://raw.githubusercontent.com/Nitin07u/Stoiclabs-NFT/main/collection.json",
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
});

// Send transaction
try {
    const { signature } = await transaction.sendAndConfirm(umi, {
        confirm: { commitment: "finalized" } // Use finalized to reduce sync issues
    });
    console.log("TX SUCCESS. Signature:", signature);
} catch (e) {
    console.error("TX FAILED:", e);
    process.exit(1);
}

console.log("Waiting for RPC to sync the new mint account...");

// Implement a robust retry mechanism (Best Practice)
let createdCollectionNft;
const maxRetries = 10;
const delayMs = 2000;

for (let retries = 0; retries < maxRetries; retries++) {
    try {
        createdCollectionNft = await fetchDigitalAsset(
            umi,
            collectionMint.publicKey
        );
        console.log(`\nSuccessfully fetched NFT after ${retries} retries.`);
        break; // Exit loop on success
    } catch (e: any) {
        if (e.name === "AccountNotFoundError" || String(e).includes("AccountNotFoundError") || String(e).includes("not found")) {
            process.stdout.write(`\rAsset not found yet, retrying in ${delayMs/1000}s... (${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
            console.error("\nUnexpected error while fetching:", e);
            throw e;
        }
    }
}

if (!createdCollectionNft) {
    console.error(`\nFailed to fetch the collection NFT after ${maxRetries} retries.`);
    process.exit(1);
}

// ----------------------
// Output result
// ----------------------
console.log(
    `\n🎉 Created collection! Address is ${getExplorerLink(
        "address",
        createdCollectionNft.mint.publicKey,
        "devnet"
    )}`
);