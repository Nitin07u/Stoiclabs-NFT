import {
    mplTokenMetadata,
    verifyCollectionV1,
    findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";

import {
    airdropIfRequired,
    getExplorerLink,
    getKeypairFromFile,
} from "@solana-developers/helpers";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

import {
    keypairIdentity,
    publicKey,
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
// Addresses
// ----------------------
const collectionAddress = publicKey(
    "3TNCmPTmfefHQRgs2Dwn5xbCvgnaC94rSBQKQa1Lfgey"
);

const nftAddress = publicKey(
    "3pKZ8SAawhk1vwKu2LvrfBGtwSLRDKDBzosSsJatzArZ"
);

// ----------------------
// Verify NFT
// ----------------------
console.log("Verifying NFT...");

const transaction = verifyCollectionV1(umi, {
    metadata: findMetadataPda(umi, { mint: nftAddress }),
    collectionMint: collectionAddress,
    // authority is OPTIONAL — defaults to umi.identity (set via keypairIdentity)
});

// ✅ SEND TX
await transaction.sendAndConfirm(umi);

// ----------------------
// Output
// ----------------------
console.log(
    `✅ NFT ${nftAddress} verified in collection ${collectionAddress}`
);

console.log(
    `🔗 Explorer: ${getExplorerLink(
        "address",
        nftAddress,
        "devnet"
    )}`
);