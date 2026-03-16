"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import styles from "./TcgCard.module.css";
import { TcgCard as TcgCardType } from "@/types/tcg";

interface Props {
  card: TcgCardType;
}

const TcgCard: React.FC<Props> = ({ card }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = (mouseX / width) * 100;
    const yPct = (mouseY / height) * 100;

    const rotateX = ((mouseY - height / 2) / (height / 2)) * -15;
    const rotateY = ((mouseX - width / 2) / (width / 2)) * 15;

    setRotate({ x: rotateX, y: rotateY });
    setGlare({ x: xPct, y: yPct, opacity: 0.6 });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setGlare(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <Link href={`/explora/detalle?id=${card.id}`} className={styles.cardLink}>
      <div 
        className={styles.perspective}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          ref={cardRef}
          className={styles.card}
          style={{
            transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          }}
        >
          <div className={styles.imageContainer}>
            <img src={card.image} alt={card.name} className={styles.cardImage} />
            
            {/* Holographic Shine Layer */}
            <div 
              className={styles.shine} 
              style={{
                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
                opacity: glare.opacity
              }}
            />

            {/* Holographic Foil Layer */}
            <div 
              className={styles.foil}
              style={{
                backgroundPosition: `${glare.x}% ${glare.y}%`,
                opacity: glare.opacity * 0.5
              }}
            />
          </div>

          <div className={styles.cardInfo}>
            <h3 className={styles.cardName}>{card.name}</h3>
            <div className={styles.cardFooter}>
              <span className={styles.rarity}>{card.rarity}</span>
              <span className={styles.price}>${card.price.toLocaleString('es-CL')}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default TcgCard;
