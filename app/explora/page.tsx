"use client";

import React, { useState } from "react";
import Header from "@/components/Header/Header";
import TcgCard from "@/components/TcgCard/TcgCard";
import SearchFilters from "@/components/SearchFilters/SearchFilters";
import { TcgCard as TcgCardType } from "@/types/tcg";
import styles from "./Explora.module.css";

const MOCK_CARDS: TcgCardType[] = [
  {
    id: "1",
    name: "Charizard G LV.X",
    game: "pokemon",
    rarity: "Ultra Rare",
    price: 450.0,
    stock: 2,
    image: "https://images.pokemontcg.io/dp4/121_hires.png",
    details: { type: "Fire", hp: 120 }
  },
  {
    id: "2",
    name: "Black Lotus",
    game: "mtg",
    rarity: "Mythic Rare",
    price: 25000.0,
    stock: 1,
    image: "https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
    details: { manaCost: "0", colors: ["Colorless"] }
  },
  {
    id: "3",
    name: "Monkey.D.Luffy (Gear 5)",
    game: "onepiece",
    rarity: "Secret Rare",
    price: 180.0,
    stock: 5,
    image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP05/OP05-119_R.png",
    details: { power: 12000, attribute: "Strike" }
  },
  {
    id: "4",
    name: "Aurelion Sol",
    game: "lor",
    rarity: "Champion",
    price: 12.0,
    stock: 10,
    image: "https://static.wikia.nocookie.net/leagueoflegends/images/1/1e/03MT087-full.png",
    details: { region: "Targon", attack: 10, health: 10 }
  }
];

import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const COMUNAS_CHILE = [
  "Santiago", "Las Condes", "Providencia", "Viña del Mar", "Valparaíso",
  "Concepción", "Antofagasta", "La Serena", "Temuco", "Puerto Montt", "Puerto Varas",
  "Rancagua", "Talca", "Arica", "Iquique", "Chillán", "Puente Alto", "Maipú", "La Florida"
].sort();

export default function ExploraPage() {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [cityFilter, setCityFilter] = useState("all");
  const [dbInventory, setDbInventory] = useState<TcgCardType[]>([]);
  const [dbAuctions, setDbAuctions] = useState<TcgCardType[]>([]);
  const [localInventory, setLocalInventory] = useState<TcgCardType[]>([]);
  const [localAuctions, setLocalAuctions] = useState<TcgCardType[]>([]);
  const [auctionsEnabled, setAuctionsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const configRef = doc(db, "config", "global");
    const unsubConfig = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        setAuctionsEnabled(snap.data().auctionsEnabled);
      }
    });

    const qInv = query(collection(db, "inventory"), where("status", "==", "active"));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().cardName,
        ...doc.data(),
        price: doc.data().price || 0,
        rarity: doc.data().condition || "Desconocida",
        image: doc.data().imageUrl || "https://images.pokemontcg.io/base1/4_hires.png",
        sellerCity: doc.data().sellerCity || "Santiago",
        game: doc.data().game || "pokemon",
        stock: doc.data().stock || 1,
        details: {}
      })) as unknown as TcgCardType[];
      setDbInventory(items);
      setLoading(false);
    });

    const qAuc = query(collection(db, "auctions"), where("status", "==", "active"));
    const unsubAuc = onSnapshot(qAuc, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().cardName,
        ...doc.data(),
        game: doc.data().game || "pokemon",
        stock: doc.data().stock || 1,
        price: doc.data().currentBid || doc.data().price || 0,
        rarity: "SUBASTA - " + (doc.data().condition || "N/A"),
        image: doc.data().imageUrl || "https://images.pokemontcg.io/base1/4_hires.png",
        sellerCity: doc.data().sellerCity || "Santiago",
        details: { isAuction: true }
      })) as unknown as TcgCardType[];
      setDbAuctions(items);
    });

    return () => {
      unsubConfig();
      unsubInv();
      unsubAuc();
    };
  }, []);

  // Load Local/Mock Inventory & Auctions
  React.useEffect(() => {
    const savedInv = localStorage.getItem("mock_inventory");
    if (savedInv) {
      const items = JSON.parse(savedInv).map((item: any) => ({
        ...item,
        name: item.cardName,
        game: item.game || "pokemon",
        stock: item.stock || 1,
        rarity: item.condition,
        image: item.imageUrl,
        sellerCity: item.sellerCity || "Santiago",
        details: {}
      })) as unknown as TcgCardType[];
      setLocalInventory(items);
    }

    const savedAuc = localStorage.getItem("mock_auctions");
    if (savedAuc) {
      const items = JSON.parse(savedAuc).map((item: any) => ({
        ...item,
        name: item.cardName,
        game: item.game || "pokemon",
        stock: item.stock || 1,
        rarity: "SUBASTA - " + item.condition,
        image: item.imageUrl,
        sellerCity: item.sellerCity || "Santiago",
        details: { isAuction: true }
      })) as unknown as TcgCardType[];
      setLocalAuctions(items);
    }
  }, []);

  const allCards = [
    ...MOCK_CARDS,
    ...dbInventory,
    ...localInventory,
    ...(auctionsEnabled ? [...dbAuctions, ...localAuctions] : [])
  ];

  // Filtering Logic
  let processedCards = allCards;

  if (filter !== "all") {
    processedCards = processedCards.filter(c => c.game === filter);
  }

  if (cityFilter !== "all") {
    processedCards = processedCards.filter((c: any) => c.sellerCity === cityFilter);
  }

  // Sorting Logic
  processedCards.sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    // For "recent", we'd need a createdAt field, using ID or mock sorting for now
    return 0;
  });

  return (
    <main className={styles.main}>
      <Header />

      <div className={styles.container}>
        <div className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Filtros</h2>

          <div className={styles.filterGroup}>
            <label>Juego</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className={styles.select}>
              <option value="all">Todos</option>
              <option value="pokemon">Pokémon TCG</option>
              <option value="mtg">Magic: The Gathering</option>
              <option value="onepiece">One Piece</option>
              <option value="yugioh">Yu-Gi-Oh!</option>
              <option value="lor">Legends of Runeterra</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Ordenar por</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.select}>
              <option value="recent">Más Recientes</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Ciudad (Vendedor)</label>
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={styles.select}>
              <option value="all">Todas las ciudades</option>
              {COMUNAS_CHILE.map(comuna => (
                <option key={comuna} value={comuna}>{comuna}</option>
              ))}
            </select>
          </div>

          <SearchFilters game={filter} />
        </div>

        <div className={styles.content}>
          <div className={styles.toolbar}>
            <h1 className={styles.pageTitle}>Explora el Catálogo</h1>
            <p className={styles.resultCount}>{processedCards.length} cartas encontradas</p>
          </div>

          <div className={styles.grid}>
            {processedCards.map(card => (
              <TcgCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
