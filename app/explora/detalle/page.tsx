"use client";

import React, { useState, useEffect, Suspense } from "react";
import Header from "@/components/Header/Header";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";
import { MapPin, Info } from "lucide-react";
import { getDistanceInfo } from "@/lib/geo";
import { fetchMarketPrice, MarketPriceResult } from "@/lib/marketApi";
import styles from "./Detail.module.css";

const MOCK_HISTORICAL_DATA = [
  { date: "Ene", price: 420 },
  { date: "Feb", price: 450 },
  { date: "Mar", price: 480 },
  { date: "Abr", price: 460 },
  { date: "May", price: 490 },
  { date: "Jun", price: 520 },
];

const MOCK_GRADED_HISTORY = [
  { date: "Nov 24", psa10: 2000, cgc: 2200, bgs: 1900 },
  { date: "Dec 1", psa10: 1900, cgc: 2200, bgs: 1850 },
  { date: "Dec 8", psa10: 1750, cgc: 1800, bgs: 1700 },
  { date: "Dec 15", psa10: 1300, cgc: 1200, bgs: 1250 },
  { date: "Dec 22", psa10: 800, cgc: 750, bgs: 780 },
  { date: "Dec 29", psa10: 700, cgc: 650, bgs: 680 },
  { date: "Jan 5", psa10: 680, cgc: 600, bgs: 620 },
  { date: "Jan 12", psa10: 550, cgc: 500, bgs: 520 },
  { date: "Jan 19", psa10: 500, cgc: 450, bgs: 470 },
  { date: "Jan 26", psa10: 450, cgc: 400, bgs: 420 },
  { date: "Feb 2", psa10: 420, cgc: 380, bgs: 400 },
  { date: "Feb 9", psa10: 400, cgc: 360, bgs: 380 },
  { date: "Feb 16", psa10: 380, cgc: 350, bgs: 360 },
  { date: "Feb 23", psa10: 370, cgc: 340, bgs: 350 },
  { date: "Mar 2", psa10: 375, cgc: 345, bgs: 355 },
  { date: "Mar 9", psa10: 385, cgc: 355, bgs: 365 },
  { date: "Mar 19", psa10: 400, cgc: 370, bgs: 380 },
];

const MOCK_UNGRADED_HISTORY = [
  { date: "Nov 17", price: 200 },
  { date: "Nov 25", price: 120 },
  { date: "Dec 3", price: 80 },
  { date: "Dec 11", price: 75 },
  { date: "Dec 19", price: 70 },
  { date: "Dec 27", price: 65 },
  { date: "Jan 4", price: 50 },
  { date: "Jan 12", price: 48 },
  { date: "Jan 20", price: 45 },
  { date: "Jan 28", price: 43 },
  { date: "Feb 5", price: 42 },
  { date: "Feb 13", price: 40 },
  { date: "Feb 21", price: 38 },
  { date: "Mar 1", price: 37 },
  { date: "Mar 9", price: 38 },
  { date: "Mar 20", price: 45 },
];

function DetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { addToCart } = useCart();
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState("vendedores");
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [distanceInfo, setDistanceInfo] = useState<string | null>(null);
  const [marketRef, setMarketRef] = useState<MarketPriceResult | null>(null);

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
        rarity: data.rarity || data.condition || "Rara",
        sellerCity: data.sellerCity || "Santiago",
        // Extended Pokémon mechanics (from user reference)
        type: data.type || "Fire",
        hp: data.hp || "360",
        stage: data.stage || "Stage 2",
        attack1: data.attack1 || "[R][R] Inferno X (90x)",
        attack1Desc: data.attack1Desc || "Discard any amount of Fire Energy from among your Pokémon, and this attack does 90 damage for each card you discarded in this way.",
        weakness: data.weakness || "Wx2",
        retreatCost: data.retreatCost || "2"
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

  useEffect(() => {
    if (card) {
      const getMarket = async () => {
        const res = await fetchMarketPrice(card.game, card.cardName, card.expansion, card.cardNumber);
        setMarketRef(res);
      };
      getMarket();
    }
  }, [card?.cardName, card?.game]);

  useEffect(() => {
    if (card && userData) {
      const info = getDistanceInfo(userData.comuna, card.sellerCity);
      setDistanceInfo(info);
    }
  }, [card, userData]);

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
    <div className={styles.containerV2}>
      {/* 1. Cinematic Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div 
            className={styles.imageGalleryV2}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setRotate({x:0, y:0}); setGlare({...glare, opacity:0}); }}
          >
             <div 
               className={styles.glareWrapperV2}
               style={{
                 transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
               }}
             >
               <img src={card.imageUrl} alt={card.cardName} className={styles.heroImage} />
             </div>
          </div>

          <div className={styles.heroInfo}>
            <div className={styles.heroHeader}>
              <span className={styles.heroBadge}>{card.game.toUpperCase()}</span>
              <h1 className={styles.heroTitle}>{card.cardName}</h1>
              <div className={styles.heroMeta}>
                <span>{card.expansion}</span>
                <span className={styles.dotSeparator}>•</span>
                <span>#{card.cardNumber}</span>
                <span className={styles.dotSeparator}>•</span>
                <span className={styles.conditionBtn}>{card.condition}</span>
              </div>
            </div>

            <div className={styles.heroActionArea}>
              <div className={styles.heroPriceBlock}>
                 <span className={styles.priceLabel}>Precio de Venta</span>
                 <h2 className={styles.heroPrice}>${card.price.toLocaleString()}</h2>
                 {marketRef && (
                   <span className={styles.heroRefPrice}>Ref. Mercado: ${marketRef.price.toLocaleString()} ({marketRef.source})</span>
                 )}
              </div>
              <div className={styles.heroButtons}>
                 <button className={styles.buyBtnV2} onClick={handleBuy}>Comprar Ahora</button>
                 <button className={styles.cartBtnV2} onClick={handleBuy}>Añadir al Carrito</button>
              </div>
              <div className={styles.sellerMiniInfo}>
                 <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${card.sellerName}`} alt={card.sellerName} />
                 <div>
                    <p>Vendido por <strong>{card.sellerName}</strong></p>
                    <span>Ubicación: {card.sellerCity} {distanceInfo ? `(${distanceInfo})` : ""}</span>
                 </div>
              </div>
            </div>

            {/* Integrated Technical Attributes */}
            <div className={styles.miniTechGrid}>
               <div className={styles.miniTechItem}><span>HP</span><strong>{card.hp}</strong></div>
               <div className={styles.miniTechItem}><span>Stage</span><strong>{card.stage}</strong></div>
               <div className={styles.miniTechItem}><span>Tipo</span><strong>{card.type}</strong></div>
               <div className={styles.miniTechItem}><span>Retiro</span><strong>{card.retreatCost}</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Full Width Content Areas */}
      <div className={styles.contentSectionsV2}>
        
        {/* Market Analysis Full Width */}
        <section className={styles.fullWidthSection}>
           <div className={styles.sectionHeaderV2}>
              <h2>Analítica del Mercado Global</h2>
              <p>Seguimiento de precios real-time en las principales plataformas mundiales.</p>
           </div>
           
           <div className={styles.chartsGridV2}>
              <div className={styles.chartBoxV2}>
                 <div className={styles.chartHeaderV2}>
                    <h3>Tendencia Graduadas (PSA/CGC)</h3>
                    <div className={styles.chartLegendV2}>
                       <span style={{ color: '#00aaff' }}>● PSA 10</span>
                       <span style={{ color: '#ffd700' }}>● CGC Pristine</span>
                    </div>
                 </div>
                 <div className={styles.chartAreaV2}>
                    <ResponsiveContainer width="100%" height={250}>
                       <AreaChart data={MOCK_GRADED_HISTORY}>
                          <defs>
                             <linearGradient id="psaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00aaff" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#00aaff" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="1 1" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="date" fontSize={10} stroke="#444" axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} stroke="#444" axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                          <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #222' }} />
                          <Area type="monotone" dataKey="psa10" stroke="#00aaff" fill="url(#psaGrad)" strokeWidth={2} dot={false} />
                          <Area type="monotone" dataKey="cgc" stroke="#ffd700" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className={styles.chartBoxV2}>
                 <div className={styles.chartHeaderV2}>
                    <h3>Historial Carta Base (Market)</h3>
                 </div>
                 <div className={styles.chartAreaV2}>
                    <ResponsiveContainer width="100%" height={250}>
                       <AreaChart data={MOCK_UNGRADED_HISTORY}>
                          <defs>
                             <linearGradient id="marketGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00f2ea" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#00f2ea" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="1 1" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="date" fontSize={10} stroke="#444" axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} stroke="#444" axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                          <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #222' }} />
                          <Area type="monotone" dataKey="price" stroke="#00f2ea" fill="url(#marketGrad)" strokeWidth={3} dot={false} />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
        </section>

        {/* Technical Specification & Attack Section Full Width */}
        <section className={styles.fullWidthSection}>
           <div className={styles.sectionHeaderV2}>
              <h2>Especificaciones Técnicas</h2>
           </div>
           <div className={styles.specGridV2}>
              <div className={styles.specBoxV2}>
                 <h3>Mecánicas de Ataque</h3>
                 <div className={styles.attackDetailV2}>
                    <div className={styles.attackMetaV2}>
                       <span className={styles.attackCostV2}>{card.attack1.split(' ')[0]}</span>
                       <strong>{card.attack1.split(' ').slice(1).join(' ')}</strong>
                    </div>
                    <p>{card.attack1Desc}</p>
                 </div>
                 <div className={styles.weaknessRetreatV2}>
                    <div><span>Debilidad</span><strong>{card.weakness}</strong></div>
                    <div><span>Resistencia</span><strong>N/A</strong></div>
                    <div><span>Coste Retiro</span><strong>{card.retreatCost}</strong></div>
                 </div>
              </div>
              
              <div className={styles.specBoxV2}>
                 <h3>Detalles de Colección</h3>
                 <div className={styles.attrListV2}>
                    <div className={styles.attrItemV2}><span>Rareza</span><strong>{card.rarity}</strong></div>
                    <div className={styles.attrItemV2}><span>Idioma</span><strong>{card.language}</strong></div>
                    <div className={styles.attrItemV2}><span>Acabado</span><strong>{card.finish}</strong></div>
                    <div className={styles.attrItemV2}><span>Número</span><strong>{card.cardNumber}</strong></div>
                    <div className={styles.attrItemV2}><span>Expansión</span><strong>{card.expansion}</strong></div>
                 </div>
              </div>
           </div>
        </section>

        {/* Protection & Shipping Section Footer-style */}
        <section className={styles.protectionGridV2}>
           <div className={styles.protectItemV2}>
              <strong>🛡️ Black Protection</strong>
              <p>Protegemos tu dinero hasta que la carta esté en tus manos.</p>
           </div>
           <div className={styles.protectItemV2}>
              <strong>📦 Logística Premium</strong>
              <p>Envíos asegurados a todo Chile con seguimiento en tiempo real.</p>
           </div>
           <div className={styles.protectItemV2}>
              <strong>✨ Estado Garantizado</strong>
              <p>Nuestras guías de condición aseguran que recibes lo que esperas.</p>
           </div>
        </section>
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
