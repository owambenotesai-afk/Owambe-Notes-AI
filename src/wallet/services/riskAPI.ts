export const riskAPI = {
  // Mock blacklist of known malicious contracts or domains
  blacklistedContracts: [
    "0xbad0000000000000000000000000000000000000",
    "0xscam000000000000000000000000000000000000",
  ],
  blacklistedDomains: ["free-eth.com", "claim-airdrop.net", "ape-mint-now.xyz"],

  async checkContract(address: string): Promise<boolean> {
    // In production, interrogate an API like GoPlus Security or similar
    return this.blacklistedContracts.includes(address.toLowerCase());
  },

  async checkDomain(domain: string): Promise<boolean> {
    return this.blacklistedDomains.some((d) => domain.includes(d));
  },
};
