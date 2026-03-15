"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Hammer, Clock, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./AuctionCard.module.css";

interface Props {
  auction: any;
}

const AuctionCard: React.FC<Props> = ({ auction }) => {
  const { user, login } = useAuth();
  const [timeLeft, setTimeLeft] = useState("");
  const [isEndingSoon, setIsEndingSoon] = useState(false);

  useEffect(() => {
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

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      setIsEndingSoon(distance < 300000);
    }, 1000);

    return () => clearInterval(timer);
  }, [auction.endTime]);

  return (
    <Link href={`/subastas/sala?id=${auction.id}`} className={`${styles.card} ${isEndingSoon ? styles.endingSoon : ""}`}>
      <div className={styles.imageWrapper}>
        <img src={auction.imageUrl} alt={auction.cardName} className={styles.cardImg} />
        <div className={styles.timer}>
          <Clock size={14} /> {timeLeft}
        </div>
      </div>
      
      <div className={styles.info}>
        <div className={styles.header}>
          <h3 className={styles.name}>{auction.cardName}</h3>
          <span className={styles.game}>{auction.game.toUpperCase()}</span>
        </div>
        
        <div className={styles.bidSection}>
          <div className={styles.bidInfo}>
            <span className={styles.label}>Oferta Actual</span>
            <strong className={styles.price}>${auction.currentBid?.toLocaleString()}</strong>
          </div>
          <div className={styles.bidAction}>
            <Hammer size={18} className={styles.hammer} />
          </div>
        </div>
        
        <div className={styles.footer}>
           {auction.highestBidderName ? (
             <div className={styles.bidder}>
               <Trophy size={12} /> {auction.highestBidderName}
             </div>
           ) : (
             <span className={styles.noBids}>Sin ofertas</span>
           )}
        </div>
      </div>
    </Link>
  );
};

export default AuctionCard;
