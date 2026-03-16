export interface TcgSearchResult {
  id: string;
  name: string;
  image: string;
  set?: string;
  rarity?: string;
  game: string;
}

export const searchCards = async (game: string, query: string): Promise<TcgSearchResult[]> => {
  if (!query || query.length < 3) return [];

  try {
    switch (game) {
      case "pokemon": {
        // Using TCGdex for Pokemon (Fast and no key)
        const response = await fetch(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(query)}`);
        const data = await response.json();
        // TCGdex returns a list of card summaries
        return data.slice(0, 10).map((card: any) => ({
          id: card.id,
          name: card.name,
          image: `${card.image}/low.jpg`,
          game: "pokemon"
        }));
      }

      case "mtg": {
        // Using Scryfall for Magic
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.status === 404) return [];
        return data.data.slice(0, 10).map((card: any) => ({
          id: card.id,
          name: card.name,
          image: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal,
          set: card.set_name,
          rarity: card.rarity,
          game: "mtg"
        }));
      }

      case "yugioh": {
        // Using YGOPRODeck for Yu-Gi-Oh
        const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.error || !data.data) return [];
        return data.data.slice(0, 10).map((card: any) => ({
          id: card.id.toString(),
          name: card.name,
          image: card.card_images[0].image_url,
          set: card.card_sets?.[0]?.set_name,
          rarity: card.card_sets?.[0]?.set_rarity,
          game: "yugioh"
        }));
      }

      case "onepiece": {
        try {
          const response = await fetch(`https://www.optcgapi.com/api/sets/filtered/?card_name=${encodeURIComponent(query)}`);
          if (!response.ok) throw new Error("API fail");
          const data = await response.json();
          // The API returns a list or an object with results
          const results = Array.isArray(data) ? data : (data.results || []);
          
          return results.slice(0, 10).map((card: any) => ({
            id: card.card_set_id || card.card_id || Math.random().toString(),
            name: card.card_name || "Desconocida",
            image: card.card_image || card.image_url || "",
            set: card.set_name || card.card_set_id?.split("-")[0],
            rarity: card.rarity,
            game: "onepiece"
          }));
        } catch (e) {
          console.error("One Piece Search Error:", e);
          return [];
        }
      }

      default:
        return [];
    }
  } catch (error) {
    console.error(`Error searching ${game} cards:`, error);
    return [];
  }
};
