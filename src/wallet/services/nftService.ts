export interface NFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  name: string;
  collectionName: string;
  imageUrl: string;
  description: string;
  type: "ERC721" | "ERC1155";
}

export const nftService = {
  async getNFTs(address: string, chainId: string): Promise<NFT[]> {
    // Mocking Alchemy / Moralis response
    // IN PRODUCTION: fetch(`https://eth-mainnet.g.alchemy.com/nft/v3/${API_KEY}/getNFTsForOwner?owner=${address}`)
    return [
      {
        id: "1",
        tokenId: "1337",
        contractAddress: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        name: "Bored Ape #1337",
        collectionName: "Bored Ape Yacht Club",
        imageUrl:
          "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?q=80&w=500&auto=format&fit=crop", // Stock image placeholder for BAYC
        description: "Bored Ape Yacht Club NFT",
        type: "ERC721",
      },
      {
        id: "2",
        tokenId: "42",
        contractAddress: "0xed5af388653567af2f388e6224dc7c4b3241c544",
        name: "Azuki #42",
        collectionName: "Azuki",
        imageUrl:
          "https://images.unsplash.com/photo-1618335824177-3e8bc8ee16c4?q=80&w=500&auto=format&fit=crop", // Stock placeholder
        description: "Azuki avatar",
        type: "ERC721",
      },
    ];
  },

  resolveIPFS(url: string): string {
    if (!url) return "";
    if (url.startsWith("ipfs://")) {
      return url.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    return url;
  },
};
