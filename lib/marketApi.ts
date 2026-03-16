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

    // 3. One Piece (optcgapi.com)
    if (gameType === "onepiece") {
      // Priority 1: Search by Card ID if valid
      if (number && number !== "S/N" && number.includes("-")) {
        try {
          const response = await fetch(`https://www.optcgapi.com/api/sets/card/${number}/`);
          if (response.ok) {
            const data = await response.json();
            if (data && (data.market_price || data.inventory_price)) {
              const refPrice = data.market_price || data.inventory_price;
              return {
                price: Math.round(refPrice * 950),
                source: "OPTCG API (USD)",
                currency: "CLP"
              };
            }
          }
        } catch (e) {
          console.warn("Error fetching by card ID, trying name search...");
        }
      }
      
      // Priority 2: Search by Name
      try {
        const response = await fetch(`https://www.optcgapi.com/api/sets/filtered/?card_name=${encodeURIComponent(name)}`);
        if (response.ok) {
          const data = await response.json();
          // The API returns a list for filtered results
          const results = Array.isArray(data) ? data : (data.results || []);
          const card = results[0];
          if (card && (card.market_price || card.inventory_price)) {
            const refPrice = card.market_price || card.inventory_price;
            return {
              price: Math.round(refPrice * 950),
              source: "OPTCG API (USD)",
              currency: "CLP"
            };
          }
        }
      } catch (e) {
        console.error("Error fetching One Piece price by name:", e);
      }
    }

    return null;

  } catch (error) {
    console.error("Error fetching market price:", error);
    return null;
  }
}
