"use client";

import React, { useRef, useState, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { Camera, X, RefreshCw } from "lucide-react";
import styles from "./ScannerModal.module.css";

interface ScannerModalProps {
  onClose: () => void;
  onScanResult: (text: string) => void;
}

export default function ScannerModal({ onClose, onScanResult }: ScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("Centra la carta...");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setStatus("Error de cámara");
      }
    }
    startCamera();
    return () => {
      // Stop tracks on unmount
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isScanning) return;
    setIsScanning(true);
    setStatus("Analizando...");

    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    c.width = v.videoWidth;
    c.height = v.videoHeight;
    ctx.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg");
    setCapturedImage(dataUrl);

    try {
      const worker = await createWorker("spa+eng");
      const { data: { text } } = await worker.recognize(dataUrl);
      await worker.terminate();

      const words = text
        .split(/[\n\s,.;:]+/)
        .map(w => w.trim().replace(/[^a-zA-Z]/g, ""))
        .filter(w => w.length >= 4);

      if (words.length > 0) {
        onScanResult(words[0]);
        onClose();
      } else {
        setStatus("No se leyó nada claro");
        setIsScanning(false);
      }
    } catch (e) {
      setStatus("Error OCR");
      setIsScanning(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Escanear Carta</h3>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>

        <div className={styles.viewfinder}>
          {!capturedImage ? (
            <video ref={videoRef} autoPlay playsInline className={styles.video} />
          ) : (
            <img src={capturedImage} className={styles.video} alt="Captured" />
          )}
          <div className={styles.hud}>
             <div className={styles.scannerLine}></div>
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.status}>{status}</p>
          {!isScanning ? (
            <button onClick={capturedImage ? () => { setCapturedImage(null); setStatus("Centra la carta..."); } : handleCapture} className={styles.captureBtn}>
              {capturedImage ? <RefreshCw size={24} /> : <Camera size={24} />}
            </button>
          ) : (
            <div className={styles.spinner}></div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
