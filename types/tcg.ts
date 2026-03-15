export type TCGType = "pokemon" | "mtg" | "onepiece" | "lor";

export interface TcgCard {
  id: string;
  name: string;
  image: string;
  game: TCGType;
  rarity: string;
  price: number;
  stock: number;
  details: {
    // Pokemon
    type?: string;
    hp?: number;
    // MTG
    colors?: string[];
    manaCost?: string;
    // One Piece
    power?: number;
    attribute?: string;
    // LoR
    region?: string;
    attack?: number;
    health?: number;
  };
}

export interface SellerListing {
  id: string;
  cardId: string;
  sellerName: string;
  sellerCity: string;
  price: number;
  condition: string;
  proximity?: number; // Calculated field
}
