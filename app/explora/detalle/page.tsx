"use client";

import React, { useState, useEffect, Suspense } from "react";
import Header from "@/components/Header/Header";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCart } from "@/context/CartContext";
import { doc, getDoc, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";
import styles from "./Detail.module.css";

const MOCK_HISTORICAL_DATA = [
  { date: "Ene", price: 420 },
  { date: "Feb", price: 450 },
  { date: "Mar", price: 480 },
  { date: "Abr", price: 460 },
  { date: "May", price: 490 },
  { date: "Jun", price: 520 },
];

function DetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { addToCart } = useCart();
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const [activeTab, setActiveTab] = useState("vendedores");
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    let unsubscribeHistory: (() => void) | undefined;
    let unsubscribeCard: (() => void) | undefined;

    const setupHistoryListener = (coll: string, docId: string, currentPrice: number) => {
      const historyRef = collection(db, coll, docId, "priceHistory");
      const q = query(historyRef, orderBy("date", "asc"));

      return onSnapshot(q, (snapshot) => {
        const historyData = snapshot.docs.map(h => {
          const d = h.data();
          const date = d.date?.toDate ? d.date.toDate() : (d.date ? new Date(d.date) : new Date());
          const hData = {
            date: date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
            time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            fullDate: date,
            price: d.price
          };
          return hData;
        });

        if (historyData.length > 0) {
          if (historyData.length === 1) {
             const weekAgo = new Date();
             weekAgo.setDate(weekAgo.getDate() - 7);
             setHistory([
               { date: weekAgo.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }), price: historyData[0].price * 0.95 },
               ...historyData
             ]);
          } else {
             setHistory(historyData);
          }
        } else {
          // Fallback if no history yet
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          setHistory([
            { date: weekAgo.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }), price: currentPrice * 0.95 },
            { date: "Hoy", price: currentPrice }
          ]);
        }
      });
    };

    const normalizeCard = (data: any, cardId: string) => {
      return {
        id: cardId,
        cardName: data.cardName || data.name || "Carta sin nombre",
        game: data.game || "Desconocido",
        condition: data.condition || data.rarity || "Near Mint",
        price: data.price || data.currentBid || 0,
        stock: data.stock || 1,
        imageUrl: data.imageUrl || data.image || "https://images.pokemontcg.io/base1/4_hires.png",
        sellerName: data.sellerName || "Vendedor Independiente",
        sellerId: data.sellerId || "unknown",
        isAuction: data.isAuction || false,
        createdAt: data.createdAt || null,
        expansion: data.set || data.expansion || "Colección Base",
        cardNumber: data.number || data.cardNumber || "S/N",
        language: data.language || "Español",
        finish: data.finish || "Normal",
        rarity: data.rarity || data.condition || "Rara"
      };
    };

    const init = async () => {
      setLoading(true);
      const targetId = String(id);

      // 1. Check Hardcoded Mocks
      const hardcodedMocks = [
        { id: "1", cardName: "Charizard G LV.X", game: "pokemon", condition: "Near Mint", price: 450000, stock: 2, imageUrl: "https://images.pokemontcg.io/dp4/121_hires.png", sellerName: "Admin" },
        { id: "2", cardName: "Black Lotus", game: "mtg", condition: "Mint", price: 25000000, stock: 1, imageUrl: "https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg", sellerName: "Collector" },
        { id: "3", cardName: "Monkey.D.Luffy (Gear 5)", game: "onepiece", condition: "Near Mint", price: 180000, stock: 5, imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP05/OP05-119_R.png", sellerName: "PirateStore" },
        { id: "4", cardName: "Aurelion Sol", game: "lor", condition: "Champion", price: 12000, stock: 10, imageUrl: "https://static.wikia.nocookie.net/leagueoflegends/images/1/1e/03MT087-full.png", sellerName: "RuneterraShop" }
      ];

      const foundH = hardcodedMocks.find(m => String(m.id) === targetId);
      if (foundH) {
        const c = normalizeCard(foundH, targetId);
        setCard(c);
        setHistory([
          { date: "7 d", price: c.price * 0.9 },
          { date: "Hoy", price: c.price }
        ]);
        setLoading(false);
        return;
      }

      // 2. Check LocalStorage (Simulations)
      const mInv = JSON.parse(localStorage.getItem("mock_inventory") || "[]");
      const mAuc = JSON.parse(localStorage.getItem("mock_auctions") || "[]");
      const foundM = [...mInv, ...mAuc].find(m => String(m.id) === targetId);
      
      if (foundM) {
        const c = normalizeCard(foundM, targetId);
        setCard(c);
        if (foundM.priceHistory && foundM.priceHistory.length > 0) {
           const hData = foundM.priceHistory.map((h: any) => ({
             date: new Date(h.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
             price: h.price
           }));
           setHistory(hData);
        } else {
           const weekAgo = new Date();
           weekAgo.setDate(weekAgo.getDate() - 7);
           setHistory([
             { date: weekAgo.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }), price: c.price * 0.95 },
             { date: "Hoy", price: c.price }
           ]);
        }
        setLoading(false);
        return;
      }

      // 3. Firestore Loop
      const collections = ["inventory", "auctions"];
      for (const colName of collections) {
        const docRef = doc(db, colName, targetId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const initialCard = normalizeCard(docSnap.data(), docSnap.id);
          setCard(initialCard);

          unsubscribeCard = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
              setCard(normalizeCard(snap.data(), snap.id));
            }
          });

          unsubscribeHistory = setupHistoryListener(colName, targetId, initialCard.price);
          setLoading(false);
          return;
        }
      }
      setLoading(false);
    };

    init();
    return () => {
      if (unsubscribeHistory) unsubscribeHistory();
      if (unsubscribeCard) unsubscribeCard();
    };
  }, [id]);

  const handleBuy = () => {
    if (!card) return;
    addToCart({
      id: card.id,
      cardName: card.cardName,
      game: card.game,
      price: card.price,
      sellerName: card.sellerName,
      sellerId: card.sellerId,
      imageUrl: card.imageUrl,
      quantity: 1
    });
    alert(`¡${card.cardName} añadido al carrito!`);
  };

  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const rotX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -10;
    const rotY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 10;
    
    setRotate({ x: rotX, y: rotY });
    setGlare({ x: xPct, y: yPct, opacity: 0.6 });
  };

  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Cargando...</div>;
  if (!card) return <div style={{ color: 'white', padding: '2rem' }}>Carta no encontrada.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <div className={styles.cardInfo}>
          <span className={styles.badge}>{card.game.toUpperCase()} • {card.condition}</span>
          <h1>{card.cardName}</h1>
          <p className={styles.meta}>Vendido por <strong>{card.sellerName}</strong></p>
        </div>
        <div className={styles.priceOverview}>
          <span>Precio del Vendedor</span>
          <strong className={styles.marketPrice}>${card.price.toLocaleString()}</strong>
          <span className={styles.trend}>Stock disponible: {card.stock}</span>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.chartSection}>
          <div 
            className={styles.imageGallery}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setRotate({x:0, y:0}); setGlare({...glare, opacity:0}); }}
            style={{ perspective: '1000px' }}
          >
             <div 
               className={styles.glareWrapper}
               style={{
                 transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                 transition: 'transform 0.1s ease'
               }}
             >
               <img src={card.imageUrl} alt={card.cardName} className={styles.detailImage} />
               <div 
                 className={styles.detailShine}
                 style={{
                   background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
                   opacity: glare.opacity
                 }}
               />
             </div>
          </div>

          <div className={styles.tabs} style={{ marginTop: '2rem' }}>
            <button className={activeTab === "vendedores" ? styles.activeTab : ""} onClick={() => setActiveTab("vendedores")}>Información de Venta</button>
            <button className={activeTab === "grafico" ? styles.activeTab : ""} onClick={() => setActiveTab("grafico")}>Historial de Precios</button>
          </div>

          {activeTab === "grafico" ? (
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)" 
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--accent-color)' }}
                    formatter={(value: any) => [`$${value.toLocaleString()}`, 'Precio']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return `Fecha: ${payload[0].payload.date} ${payload[0].payload.time || ''}`;
                      }
                      return `Fecha: ${label}`;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="var(--accent-color)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.sellerDetails}>
              <div className={styles.sellerCard}>
                <h3>Venta Directa</h3>
                <p>Estado: <strong>{card.condition}</strong></p>
                <button className={styles.mainBuyBtn} onClick={handleBuy}>Añadir al Carrito</button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.detailsCard}>
            <h3>Detalles Técnicos</h3>
            <div className={styles.attribute}><span>Juego</span><strong>{card.game.toUpperCase()}</strong></div>
            <div className={styles.attribute}><span>Condición</span><strong>{card.condition}</strong></div>
            <div className={styles.attribute}><span>Rareza</span><strong>{card.rarity}</strong></div>
            <div className={styles.attribute}><span>Expansión</span><strong>{card.expansion}</strong></div>
            <div className={styles.attribute}><span>Idioma</span><strong>{card.language}</strong></div>
            <div className={styles.attribute}><span>Acabado</span><strong>{card.finish}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardDetailPage() {
  return (
    <main className={styles.main}>
      <Header />
      <Suspense fallback={<div style={{ color: 'white' }}>Cargando sala...</div>}>
        <DetailContent />
      </Suspense>
    </main>
  );
}
