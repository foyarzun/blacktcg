export interface MarketPriceResult {
  price: number;
  source: string;
  currency: string;
}

export async function fetchMarketPrice(game: string, name: string, expansion?: string, number?: string): Promise<MarketPriceResult | null> {
  try {
    const gameType = game.toLowerCase();

    // 1. Magic The Gathering (Scryfall)
    if (gameType === "mtg") {
      const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
      if (!response.ok) return null;
      const data = await response.ok ? await response.json() : null;
      if (data?.prices?.usd) {
        // Simple conversion USD to CLP (approx 950 for demo)
        const usdPrice = parseFloat(data.prices.usd);
        return {
          price: Math.round(usdPrice * 950),
          source: "Scryfall (USD)",
          currency: "CLP"
        };
      }
    }

    // 2. Pokemon (Pokemon TCG API)
    if (gameType === "pokemon") {
      let query = `name:"${name}"`;
      if (number && number !== "S/N") query += ` number:"${number}"`;
      
      const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=1`);
      if (!response.ok) return null;
      const data = await response.json();
      const card = data.data?.[0];
      
      if (card?.tcgplayer?.prices?.holofoil?.market) {
        return {
          price: Math.round(card.tcgplayer.prices.holofoil.market * 950),
          source: "TCGPlayer (USD)",
          currency: "CLP"
        };
      } else if (card?.tcgplayer?.prices?.normal?.market) {
        return {
          price: Math.round(card.tcgplayer.prices.normal.market * 950),
          source: "TCGPlayer (USD)",
          currency: "CLP"
        };
      }
    }

    // 3. Fallback / Mock for others (One Piece, LoR)
    // In a real app, you'd use specific APIs for OP or Lor.
    // For now, let's return a simulated price based on the current price +/- 10%
    return null;

  } catch (error) {
    console.error("Error fetching market price:", error);
    return null;
  }
}
