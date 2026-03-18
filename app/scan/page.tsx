"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Header from "@/components/Header/Header";
import { createWorker } from "tesseract.js";
import { searchCards, TcgSearchResult } from "@/lib/tcgApi";
import { Camera, RefreshCw, Search, X } from "lucide-react";
import styles from "./Scan.module.css";
import Link from "next/link";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("Listo para escanear");
  const [results, setResults] = useState<TcgSearchResult[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [lastWords, setLastWords] = useState<string[]>([]);

  // Startup camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setStatus("Error al acceder a la cámara. Verifica los permisos.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    setStatus("Capturando imagen...");

    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to video feed
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    
    // Save visual snapshot
    const dataUrl = c.toDataURL("image/jpeg");
    setCapturedImage(dataUrl);

    setStatus("Analizando texto con IA...");

    try {
      // Step 2: OCR
      const worker = await createWorker('spa+eng'); // Detect Spanish and English
      const { data: { text } } = await worker.recognize(dataUrl);
      await worker.terminate();

      // Clean text to find potential names (Word > 3 chars, split by line/space)
      const words = text
        .split(/[\n\s,.;:]+/)
        .map(w => w.trim().replace(/[^a-zA-Z]/g, ''))
        .filter(w => w.length >= 4);
      
      const potentialNames = [...new Set(words)].slice(0, 5); // Take top 5 unique words
      setLastWords(potentialNames);

      if (potentialNames.length === 0) {
        setStatus("No se detectó texto claro. Intenta acercar la carta.");
        setIsScanning(false);
        return;
      }

      setStatus(`Buscando coincidencias para "${potentialNames[0]}"...`);
      
      const combinedResults: TcgSearchResult[] = [];
      // Try searching with the most prominent word
      const searchRes = await searchCards("pokemon", potentialNames[0]);
      const mtgRes = await searchCards("mtg", potentialNames[0]);
      const ygoRes = await searchCards("yugioh", potentialNames[0]);

      setResults([...searchRes, ...mtgRes, ...ygoRes]);
      
      if (searchRes.length === 0 && mtgRes.length === 0 && ygoRes.length === 0) {
        setStatus("No se encontraron cartas con este nombre.");
      } else {
        setStatus(`¡Encontradas ${searchRes.length + mtgRes.length + ygoRes.length} cartas!`);
      }
    } catch (error) {
      console.error("Scan error:", error);
      setStatus("Ocurrió un error durante el escaneo.");
    } finally {
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setResults([]);
    setLastWords([]);
    setStatus("Listo para escanear");
  };

  return (
    <main className={styles.main}>
      <Header />
      
      <div className={styles.scannerContainer}>
        {!capturedImage ? (
          <div className={styles.videoWrapper}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className={styles.videoFeed}
            />
            <div className={styles.hudOverlay}>
              <div className={styles.focusFrame}></div>
              <div className={styles.scanningLine}></div>
            </div>
            <div className={styles.statusOnVideo}>{status}</div>
          </div>
        ) : (
          <div className={styles.videoWrapper}>
            <img src={capturedImage} alt="Capture" className={styles.videoFeed} />
            <div className={styles.capturedOverlay}>
               <button onClick={resetScanner} className={styles.closeBtn}><X size={24} /></button>
            </div>
          </div>
        )}

        <div className={styles.controls}>
          {!isScanning ? (
            <button 
              className={styles.scanBtn} 
              onClick={capturedImage ? resetScanner : handleCapture}
              title={capturedImage ? "Volver a intentar" : "Escanear ahora"}
            >
              {capturedImage ? <RefreshCw size={32} /> : <div className={styles.scanBtnInner} />}
            </button>
          ) : (
            <div className={styles.loader}>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
            </div>
          )}
          <p className={styles.statusText}>{status}</p>
        </div>

        {(results.length > 0 || lastWords.length > 0) && (
          <section className={styles.resultsSection}>
            <h3 className={styles.cardTitle}>Cartas Encontradas</h3>
            {results.length > 0 ? (
              <div className={styles.cardGrid}>
                {results.slice(0, 8).map((card, idx) => (
                  <Link 
                    href={`/explora/detalle?id=${card.id}`} 
                    key={`${card.id}-${idx}`}
                    className={styles.cardItem}
                  >
                    <img src={card.image} alt={card.name} />
                    <div className={styles.cardName}>{card.name}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyResults}>
                 <p>No encontramos cartas exactas, pero detectamos: {lastWords.join(", ")}</p>
                 <Link href={`/explora2?query=${lastWords[0]}`} className={styles.searchAgainBtn}>
                   Buscar manualmente
                 </Link>
              </div>
            )}
          </section>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      {/* Footer Instructions */}
      <div className={styles.instructions}>
        <p>Centra la carta en el recuadro dorado y asegúrate de tener buena luz para mayor precisión.</p>
      </div>
    </main>
  );
}
