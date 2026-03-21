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
    <div className={styles.container}>
      <div className={styles.topSection}>
        <div className={styles.cardInfo}>
          <span className={styles.badge}>{card.game.toUpperCase()} • {card.condition}</span>
          <h1>{card.cardName}</h1>
          <p className={styles.meta}>
            Vendido por <strong>{card.sellerName}</strong>
            {distanceInfo && (
              <span className={styles.distanceBadge}>
                <MapPin size={12} /> {distanceInfo}
              </span>
            )}
          </p>
        </div>
        <div className={styles.priceOverview}>
          <span>Precio del Vendedor</span>
          <strong className={styles.marketPrice}>${card.price.toLocaleString()}</strong>
          <span className={styles.trend}>Stock disponible: {card.stock}</span>
          {marketRef && (
            <div className={styles.referencePrice}>
              <Info size={12} />
              <span>Ref. Mercado: <strong>${marketRef.price.toLocaleString()}</strong> ({marketRef.source})</span>
            </div>
          )}
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
              <h3>Historial de Precios Locales (Blackcards)</h3>
              <ResponsiveContainer width="100%" height={300}>
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
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="var(--accent-color)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.sellerDetails}>
              <div className={styles.sellerCard}>
                <h3>Venta Directa</h3>
                <p>Estado: <strong>{card.condition}</strong></p>
                <div className={styles.sellerMainAction}>
                   <div className={styles.priceTag}>
                      <span>Precio Unitario</span>
                      <strong>${card.price.toLocaleString()}</strong>
                   </div>
                   <button className={styles.mainBuyBtn} onClick={handleBuy}>Añadir al Carrito</button>
                </div>
              </div>

              {/* Technical Details Section (Mockup 1) */}
              <div className={styles.techDetailsBox}>
                 <div className={styles.techHeader}>
                    <Info size={18} />
                    <h3>Details</h3>
                    <span className={styles.reportBtn}>Report a problem</span>
                 </div>
                 <div className={styles.techGrid}>
                    <div className={styles.techItem}><span>Card Type:</span><strong>{card.type}</strong></div>
                    <div className={styles.techItem}><span>HP:</span><strong>{card.hp}</strong></div>
                    <div className={styles.techItem}><span>Stage:</span><strong>{card.stage}</strong></div>
                    <div className={styles.techItem} style={{ gridColumn: 'span 2' }}>
                       <span>Attack 1:</span>
                       <strong className={styles.attackName}>{card.attack1}</strong>
                       <p className={styles.attackDesc}>{card.attack1Desc}</p>
                    </div>
                    <div className={styles.techItem}><span>Weakness:</span><strong>{card.weakness}</strong></div>
                    <div className={styles.techItem}><span>Retreat Cost:</span><strong>{card.retreatCost}</strong></div>
                    <div className={styles.techItem}><span>Rarity:</span><strong>{card.rarity}</strong></div>
                    <div className={styles.techItem}><span>Card Number:</span><strong>{card.cardNumber}</strong></div>
                 </div>
              </div>
            </div>
          )}
          
          {/* Global Market Analytics */}
          <div className={styles.analyticsSection}>
             <h2 className={styles.analyticsTitle}>Analítica de Mercado Global</h2>
             
             <div className={styles.analyticsGrid}>
                {/* Graded History (Mockup 2) */}
                <div className={styles.analyticsCard}>
                   <div className={styles.analyticsHeader}>
                      <div className={styles.iconHistory} />
                      <h3>Graded Price History</h3>
                   </div>
                   <div className={styles.chartWrapper}>
                      <ResponsiveContainer width="100%" height={300}>
                         <AreaChart data={MOCK_GRADED_HISTORY}>
                            <CartesianGrid strokeDasharray="1 1" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" fontSize={10} stroke="#666" />
                            <YAxis fontSize={10} stroke="#666" />
                            <Tooltip 
                               contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                               labelStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="psa10" stroke="#00aaff" fill="#00aaff" fillOpacity={0.1} strokeWidth={2} name="PSA 10" />
                            <Area type="monotone" dataKey="cgc" stroke="#ffd700" fill="#ffd700" fillOpacity={0.1} strokeWidth={2} name="CGC Pristine" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                   <div className={styles.analyticsLegend}>
                      <span style={{ color: '#00aaff' }}>● PSA 10</span>
                      <span style={{ color: '#ffd700' }}>● CGC Pristine</span>
                   </div>
                </div>

                {/* Ungraded History (Mockup 3) */}
                <div className={styles.analyticsCard}>
                   <div className={styles.analyticsHeader}>
                      <div className={styles.iconHistory} />
                      <h3>Ungraded Price History</h3>
                   </div>
                   <div className={styles.chartWrapper}>
                      <ResponsiveContainer width="100%" height={300}>
                         <AreaChart data={MOCK_UNGRADED_HISTORY}>
                            <CartesianGrid strokeDasharray="1 1" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" fontSize={10} stroke="#666" />
                            <YAxis fontSize={10} stroke="#666" />
                            <Tooltip 
                               contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                               labelStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="price" stroke="#00f2ea" fill="#00f2ea" fillOpacity={0.2} strokeWidth={3} name="Market" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.detailsCard}>
            <h3>Información Adicional</h3>
            <div className={styles.attribute}><span>Juego</span><strong>{card.game.toUpperCase()}</strong></div>
            <div className={styles.attribute}><span>Condición</span><strong>{card.condition}</strong></div>
            <div className={styles.attribute}><span>Rareza</span><strong>{card.rarity}</strong></div>
            <div className={styles.attribute}><span>Expansión</span><strong>{card.expansion}</strong></div>
            <div className={styles.attribute}><span>Idioma</span><strong>{card.language}</strong></div>
            <div className={styles.attribute}><span>Acabado</span><strong>{card.finish}</strong></div>
          </div>

          <div className={styles.shippingCard}>
             <h3>Envío y Seguridad</h3>
             <div className={styles.shippingFeature}>
                <strong>🛡️ Black Protection</strong>
                <p>Tu dinero está seguro hasta que recibas la carta.</p>
             </div>
             <div className={styles.shippingFeature}>
                <strong>📦 Envío Certificado</strong>
                <p>Opciones de Starken o Chilexpress disponibles.</p>
             </div>
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
