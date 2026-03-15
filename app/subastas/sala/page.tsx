"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header/Header";
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Clock, Hammer, User, ArrowLeft, Trophy, Zap } from "lucide-react";
import styles from "../SubastaDetail.module.css";

function SalaContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user, login } = useAuth();
  const router = useRouter();
  
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!id) return;
    let unsubscribe: any = () => {};

    const fetchAuction = async () => {
      const docRef = doc(db, "auctions", id);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setAuction({ id: docSnap.id, ...docSnap.data() });
          setLoading(false);
        } else {
          const savedRows = localStorage.getItem("mock_auctions");
          if (savedRows) {
            const list = JSON.parse(savedRows);
            const found = list.find((a: any) => String(a.id) === id);
            if (found) {
              setAuction(found);
              setLoading(false);
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      });
    };

    fetchAuction();
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!auction) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = auction.endTime?.toDate 
        ? auction.endTime.toDate().getTime() 
        : new Date(auction.endTime).getTime();
      
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft("FINALIZADA");
        clearInterval(timer);
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [auction]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    setGlarePosition({ x: xPercent, y: yPercent });
    setRotation({ y: (xPercent - 50) / 2, x: -(yPercent - 50) / 2 });
  };

  const handleBid = async (amount: number) => {
    if (!user) { login(); return; }
    if (!id) return;

    if (id.startsWith("local-")) {
        const savedRows = localStorage.getItem("mock_auctions");
        if (savedRows) {
            const list = JSON.parse(savedRows);
            const idx = list.findIndex((a: any) => String(a.id) === id);
            if (idx !== -1) {
                list[idx].currentBid += amount;
                list[idx].highestBidder = user.uid;
                list[idx].highestBidderName = user.displayName;
                if (!list[idx].priceHistory) list[idx].priceHistory = [];
                list[idx].priceHistory.push({ price: list[idx].currentBid, date: new Date().toISOString() });
                localStorage.setItem("mock_auctions", JSON.stringify(list));
                setAuction({...list[idx]});
            }
        }
        return;
    }

    try {
      const auctionRef = doc(db, "auctions", id);
      const newBid = auction.currentBid + amount;
      await updateDoc(auctionRef, {
        currentBid: newBid,
        highestBidder: user.uid,
        highestBidderName: user.displayName || "Comprador Anónimo",
      });
      // Recording history
      await addDoc(collection(db, "auctions", id, "priceHistory"), {
        price: newBid,
        date: serverTimestamp()
      });
    } catch (error) {
      console.error("Error bidding:", error);
    }
  };

  if (loading) return <div className={styles.loading}>Entrando a la Sala...</div>;
  if (!auction) return <div className={styles.error}>La subasta no existe.</div>;

  return (
    <div className={styles.container}>
      <button onClick={() => router.back()} className={styles.backBtn}><ArrowLeft size={20} /> Volver</button>
      <div className={styles.layout}>
        <div className={styles.cardArea}>
          <div className={styles.cardContainer} onMouseMove={handleMouseMove} onMouseLeave={() => setRotation({x:0, y:0})} style={{ transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}>
            <img src={auction.imageUrl} alt={auction.cardName} className={styles.cardImage} />
            <div className={styles.glare} style={{ background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.4) 0%, transparent 60%)` }} />
          </div>
        </div>
        <div className={styles.biddingArea}>
          <div className={styles.headerInfo}>
            <span className={styles.badge}><Zap size={14} /> Subasta en Vivo</span>
            <h1 className={styles.title}>{auction.cardName}</h1>
            <p className={styles.seller}>Vendedor: <strong>{auction.sellerName}</strong></p>
          </div>
          <div className={styles.statusGrid}>
            <div className={styles.statusCard}>
              <Clock size={20} className={styles.icon} />
              <div><span className={styles.label}>Tiempo Restante</span><strong className={timeLeft === "FINALIZADA" ? styles.expired : styles.time}>{timeLeft}</strong></div>
            </div>
            <div className={styles.statusCard}>
              <Trophy size={20} className={styles.iconGold} />
              <div><span className={styles.label}>Oferta Actual</span><strong className={styles.price}>${auction.currentBid?.toLocaleString()}</strong></div>
            </div>
          </div>
          <div className={styles.bidHistory}>
            <h3><User size={18} /> Líder de la Subasta</h3>
            {auction.highestBidderName ? (<div className={styles.leaderInfo}><strong>{auction.highestBidderName}</strong><span>Va ganando la puja</span></div>) : (<p className={styles.noBids}>Sin ofertas aún.</p>)}
          </div>
          <div className={styles.actionPanel}>
             <div className={styles.bidButtons}>
                <button className={styles.bidBtn} onClick={() => handleBid(500)} disabled={timeLeft === "FINALIZADA"}>+$500</button>
                <button className={styles.bidBtn} onClick={() => handleBid(2000)} disabled={timeLeft === "FINALIZADA"}>+$2,000</button>
                <button className={`${styles.bidBtn} ${styles.primaryBid}`} onClick={() => handleBid(5000)} disabled={timeLeft === "FINALIZADA"}><Hammer size={18} /> PUJAR +$5,000</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubastaDetail() {
  return (
    <main className={styles.main}>
      <Header />
      <Suspense fallback={<div style={{ color: 'white' }}>Cargando sala...</div>}>
        <SalaContent />
      </Suspense>
    </main>
  );
}
