"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/Header/Header";
import AuctionCard from "@/components/AuctionCard/AuctionCard";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./Subastas.module.css";

export default function SubastasPage() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [localAuctions, setLocalAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firestore Auctions
    const q = query(collection(db, "auctions"), where("status", "==", "active"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeAuctions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAuctions(activeAuctions);
      setLoading(false);
    });

    // Local/Mock Auctions
    const saved = localStorage.getItem("mock_auctions");
    if (saved) {
      setLocalAuctions(JSON.parse(saved));
    }

    return () => unsubscribe();
  }, []);

  const allAuctions = [...auctions, ...localAuctions];

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Subastas en Vivo</h1>
          <p>Compite en tiempo real por las piezas más exclusivas.</p>
        </div>

        {loading ? (
          <div className={styles.empty}><h3>Cargando subastas...</h3></div>
        ) : allAuctions.length === 0 ? (
          <div className={styles.empty}>
            <h3>No hay subastas activas en este momento.</h3>
            <p>Vuelve pronto para participar.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {allAuctions.map(auction => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
