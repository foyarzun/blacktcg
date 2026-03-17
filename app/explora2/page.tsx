"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header/Header";
import TcgCard from "@/components/TcgCard/TcgCard";
import { TcgCard as TcgCardType } from "@/types/tcg";
import { REGIONES_CHILE } from "@/lib/chileData";
import { MapPin, Filter, Layers, ListFilter } from "lucide-react";
import styles from "./Explora2.module.css";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MOCK_CARDS: TcgCardType[] = [
  {
    id: "m1",
    name: "Charizard G LV.X",
    game: "pokemon",
    rarity: "Ultra Rare",
    price: 45000,
    stock: 2,
    image: "https://images.pokemontcg.io/dp4/121_hires.png",
    details: { type: "Fire", hp: 120 }
  },
  {
    id: "m2",
    name: "Monkey.D.Luffy (Gear 5)",
    game: "onepiece",
    rarity: "Secret Rare",
    price: 180000,
    stock: 5,
    image: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP05/OP05-119_R.png",
    details: { power: 12000, attribute: "Strike" }
  }
];

function Explora2Content() {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [regionFilter, setRegionFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [dbInventory, setDbInventory] = useState<TcgCardType[]>([]);
  const [dbAuctions, setDbAuctions] = useState<TcgCardType[]>([]);
  const [auctionsEnabled, setAuctionsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const gameParam = searchParams.get("game");
    if (gameParam) {
      setFilter(gameParam);
    }
  }, [searchParams]);

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

  const allCards = [
    ...MOCK_CARDS,
    ...dbInventory,
    ...(auctionsEnabled ? [...dbAuctions] : [])
  ];

  let processedCards = allCards;

  if (filter !== "all") {
    processedCards = processedCards.filter(c => c.game === filter);
  }

  if (regionFilter !== "all") {
    const selectedRegion = REGIONES_CHILE.find(r => r.name === regionFilter);
    if (selectedRegion) {
      processedCards = processedCards.filter((c: any) => 
        selectedRegion.communes.includes(c.sellerCity)
      );
    }
  }

  if (cityFilter !== "all") {
    processedCards = processedCards.filter((c: any) => c.sellerCity === cityFilter);
  }

  processedCards.sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    return 0;
  });

  return (
    <main className={styles.main}>
      <Header isFixed={true} />
      
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label><Layers size={14} style={{ marginRight: '6px' }} /> Juego</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={styles.select}>
            <option value="all">Todos los Juegos</option>
            <option value="pokemon">Pokémon TCG</option>
            <option value="mtg">Magic: The Gathering</option>
            <option value="onepiece">One Piece</option>
            <option value="yugioh">Yu-Gi-Oh!</option>
            <option value="lor">Legends of Runeterra</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label><MapPin size={14} style={{ marginRight: '6px' }} /> Región</label>
          <select 
            value={regionFilter} 
            onChange={(e) => {
              setRegionFilter(e.target.value);
              setCityFilter("all");
            }} 
            className={styles.select}
          >
            <option value="all">Todas las Regiones</option>
            {REGIONES_CHILE.map(region => (
              <option key={region.name} value={region.name}>{region.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Comuna / Ciudad</label>
          <select 
            value={cityFilter} 
            onChange={(e) => setCityFilter(e.target.value)} 
            className={styles.select}
            disabled={regionFilter === "all"}
          >
            <option value="all">
              {regionFilter === "all" ? "Selecciona región" : "Todas las Ciudades"}
            </option>
            {regionFilter !== "all" && REGIONES_CHILE.find(r => r.name === regionFilter)?.communes.map(comuna => (
              <option key={comuna} value={comuna}>{comuna}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label><ListFilter size={14} style={{ marginRight: '6px' }} /> Ordenar</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.select}>
            <option value="recent">Más Recientes</option>
            <option value="price_asc">Precio: Menor a Mayor</option>
            <option value="price_desc">Precio: Mayor a Menor</option>
          </select>
        </div>
      </div>

      <div className={styles.pageBodyLayout}>
        <aside className={styles.adSidebar}>
          Publicidad / Auspiciadores
        </aside>

        <div className={styles.contentArea}>
          <div className={styles.headerSection}>
            <h1 className={styles.pageTitle}>Explora el Catálogo</h1>
            <p className={styles.resultCount}>{processedCards.length} cartas disponibles para ti</p>
          </div>

          {loading ? (
            <div className={styles.loading}>Sincronizando catálogo...</div>
          ) : (
            <div className={styles.grid}>
              {processedCards.map(card => (
                <TcgCard key={card.id} card={card} />
              ))}
            </div>
          )}
        </div>

        <aside className={styles.adSidebar}>
          Publicidad / Auspiciadores
        </aside>
      </div>
    </main>
  );
}

export default function Explora2Page() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '2rem' }}>Cargando catálogo...</div>}>
      <Explora2Content />
    </Suspense>
  );
}
