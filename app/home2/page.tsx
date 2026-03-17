"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header/Header";
import Link from "next/link";
import { doc, onSnapshot, addDoc, collection, serverTimestamp, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Send } from "lucide-react";
import styles from "./home2.module.css";

export default function Home2() {
  const [auctionsEnabled, setAuctionsEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [latestCards, setLatestCards] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const configRef = doc(db, "config", "global");
    const unsubConfig = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        setAuctionsEnabled(snap.data().auctionsEnabled);
      }
    });

    const q = query(collection(db, "inventory"), where("status", "==", "active"), orderBy("createdAt", "desc"), limit(5));
    const unsubLatest = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLatestCards(items);
    });

    return () => {
      unsubConfig();
      unsubLatest();
    };
  }, []);

  useEffect(() => {
    if (latestCards.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % latestCards.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [latestCards]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await addDoc(collection(db, "subscriptions"), {
        email,
        createdAt: serverTimestamp()
      });
      setSubscribed(true);
      setEmail("");
      alert("¡Gracias por suscribirte!");
    } catch (error) {
      console.error("Error subscribing:", error);
    }
  };

  const Separator = () => (
    <div className={styles.separatorContainer}>
      <img src="/separator.jpg" alt="Separator" className={styles.separatorImg} />
    </div>
  );

  return (
    <main className={styles.main}>
      <Header />
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <video autoPlay muted loop playsInline className={styles.heroVideo}>
            <source src="/hero_animated.mp4" type="video/mp4" />
          </video>
          <div className={styles.heroOverlay}></div>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>BLACK TCG</h1>
            <p className={styles.subtitle}>El destino premium para coleccionistas.</p>
            <div className={styles.ctaGroup}>
              <Link href="/explora2" className={styles.primaryBtn}>Explorar</Link>
              <Link href="/vendedor" className={styles.secondaryBtn}>Vender</Link>
            </div>
          </div>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.sliderHeader}>
            <h3>Novedades Recientes</h3>
            <div className={styles.slideDots}>
              {latestCards.map((_, i) => (
                <span key={i} className={`${styles.dot} ${currentSlide === i ? styles.activeDot : ''}`} />
              ))}
            </div>
          </div>
          <div className={styles.sliderContainer}>
            {latestCards.length > 0 ? (
              latestCards.map((card, index) => (
                <Link 
                  href={`/explora/detalle?id=${card.id}`}
                  key={card.id} 
                  className={`${styles.slide} ${currentSlide === index ? styles.activeSlide : ''}`}
                >
                  <div className={styles.slideImageWrapper}>
                    <img src={card.imageUrl || "https://images.pokemontcg.io/base1/4_hires.png"} alt={card.cardName} />
                  </div>
                  <div className={styles.slideInfo}>
                    <span className={styles.slideGame}>{card.game?.toUpperCase()}</span>
                    <h4>{card.cardName}</h4>
                    <p className={styles.slidePrice}>${card.price?.toLocaleString()}</p>
                    <span className={styles.slideSeller}>por {card.sellerName || "Individual"}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className={styles.noSlides}>
                <p>Cargando últimas joyitas...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Separator />

      <section className={styles.featuredSellers}>
        <h2 className={styles.sectionTitle}>Vendedores Destacados</h2>
        <div className={styles.sellersGrid}>
          {[
            { name: "Premium Collectibles", rating: 4.9, sales: 1250, img: "https://api.dicebear.com/7.x/initials/svg?seed=PC" },
            { name: "La Cueva del TCG", rating: 4.8, sales: 850, img: "https://api.dicebear.com/7.x/initials/svg?seed=LC" },
            { name: "Global Cards Store", rating: 5.0, sales: 120, img: "https://api.dicebear.com/7.x/initials/svg?seed=GC" },
            { name: "Admin Alpha", rating: 4.7, sales: 2100, img: "https://api.dicebear.com/7.x/initials/svg?seed=AA" }
          ].map((seller, idx) => (
            <div key={idx} className={styles.sellerCard}>
              <img src={seller.img} alt={seller.name} className={styles.sellerImg} />
              <h3>{seller.name}</h3>
              <div className={styles.sellerStats}>
                <span>⭐ {seller.rating}</span>
                <span>📦 {seller.sales} ventas</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className={styles.tcgSection}>
        <h2 className={styles.sectionTitle}>Explora por TCG</h2>
        <div className={styles.tcgGrid}>
          {[
            { name: "Pokémon TCG", id: "pokemon", color: "#ffcb05", bg: "rgba(255, 203, 5, 0.1)" },
            { name: "Magic: The Gathering", id: "mtg", color: "#607d8b", bg: "rgba(96, 125, 139, 0.1)" },
            { name: "One Piece Card Game", id: "onepiece", color: "#e91e63", bg: "rgba(233, 30, 99, 0.1)" },
            { name: "Legends of Runeterra", id: "lor", color: "#9c27b0", bg: "rgba(156, 39, 176, 0.1)" }
          ].map((game) => (
            <Link 
              key={game.id} 
              href={`/explora2?game=${game.id}`} 
              className={styles.tcgBox}
              style={{ borderColor: game.color, backgroundColor: game.bg }}
            >
              <h3>{game.name}</h3>
              <p>Ver Catálogo →</p>
            </Link>
          ))}
        </div>
      </section>

      <Separator />

      <section className={styles.newsletter}>
        <div className={styles.newsletterContent}>
          <h2>Únete a la Élite</h2>
          <p>Recibe noticias de lanzamientos, subastas exclusivas y ofertas limitadas directamente en tu correo.</p>
          {!subscribed ? (
            <form onSubmit={handleSubscribe} className={styles.subForm}>
              <input 
                type="email" 
                placeholder="tu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit">
                <Send size={18} /> Suscribirme
              </button>
            </form>
          ) : (
            <div className={styles.successMsg}>✨ ¡Ya estás en la lista! Revisa tu correo pronto.</div>
          )}
        </div>
      </section>
    </main>
  );
}
