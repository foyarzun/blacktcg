"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/Header/Header";
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import styles from "./Admin.module.css";

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [auctionsEnabled, setAuctionsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingAuctions, setPendingAuctions] = useState<any[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const configRef = doc(db, "config", "global");
      const configDoc = await getDoc(configRef);
      if (configDoc.exists()) {
        setAuctionsEnabled(configDoc.data().auctionsEnabled);
      } else {
        await setDoc(configRef, { auctionsEnabled: false });
      }
      setLoading(false);
    };

    const fetchUserStats = async () => {
      setFetchingUsers(true);
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const salesSnap = await getDocs(collection(db, "sales"));
        
        const allSales = salesSnap.docs.map(d => d.data());
        
        const usersWithStats = usersSnap.docs.map(uDoc => {
          const uData = uDoc.data();
          const userSales = allSales.filter(s => s.sellerId === uData.uid);
          const totalVolume = userSales.reduce((acc, curr) => acc + (curr.total || 0), 0);
          const salesCount = userSales.length;
          
          return {
            id: uDoc.id,
            ...uData,
            totalVolume,
            salesCount
          };
        });

        // Sort by volume descending
        usersWithStats.sort((a, b) => b.totalVolume - a.totalVolume);
        setUsers(usersWithStats);
      } catch (error) {
        console.error("Error fetching user stats:", error);
      } finally {
        setFetchingUsers(false);
      }
    };

    const fetchPendingAuctions = async () => {
      try {
        const q = query(collection(db, "auctions"), where("status", "==", "pending_approval"));
        const snap = await getDocs(q);
        setPendingAuctions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching pending auctions:", error);
      }
    };

    fetchConfig();
    fetchUserStats();
    fetchPendingAuctions();
  }, []);

  const handleApproveAuction = async (auctionId: string) => {
    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        status: "active",
        approvedAt: serverTimestamp()
      });
      setPendingAuctions(prev => prev.filter(a => a.id !== auctionId));
      alert("Subasta autorizada con éxito.");
    } catch (error) {
      console.error("Error approving auction:", error);
    }
  };

  const handleRejectAuction = async (auctionId: string) => {
    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        status: "rejected"
      });
      setPendingAuctions(prev => prev.filter(a => a.id !== auctionId));
      alert("Subasta rechazada.");
    } catch (error) {
      console.error("Error rejecting auction:", error);
    }
  };

  const toggleAuctions = async () => {
    const configRef = doc(db, "config", "global");
    const newValue = !auctionsEnabled;
    await updateDoc(configRef, { auctionsEnabled: newValue });
    setAuctionsEnabled(newValue);
  };

  if (authLoading) return <div className={styles.main}><Header /><p>Verificando permisos...</p></div>;

  if (!isAdmin) {
    return (
      <main className={styles.main}>
        <Header />
        <div className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.title} style={{ color: '#ff4444' }}>Acceso Restringido</h1>
            <p>No tienes permisos de administrador para ver esta sección.</p>
            <p className={styles.hint}>Si eres el dueño del sitio, contacta a soporte para habilitar tu correo.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Panel de Administración</h1>
          <p className={styles.subtitle}>Gestión global de la plataforma.</p>
          
          <div className={styles.settingGroup}>
            <div className={styles.setting}>
              <div className={styles.settingInfo}>
                <h3>Módulo de Subastas</h3>
                <p>Habilita o deshabilita la participación en subastas en todo el sitio.</p>
              </div>
              <button 
                onClick={toggleAuctions} 
                className={auctionsEnabled ? styles.btnOn : styles.btnOff}
              >
                {loading ? "..." : (auctionsEnabled ? "MODO ON" : "MODO OFF")}
              </button>
            </div>
          </div>
          <p className={styles.hint}>Este cambio se reflejará instantáneamente en el menú para todos los usuarios.</p>
        </div>

        <div className={styles.card} style={{ marginTop: '2rem' }}>
          <h2 className={styles.sectionTitle}>Solicitudes de Subasta</h2>
          <p className={styles.subtitle}>Autoriza o rechaza nuevas subastas enviadas por vendedores.</p>
          
          {pendingAuctions.length === 0 ? (
            <p className={styles.emptyMsg}>No hay solicitudes pendientes.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Carta</th>
                    <th>Vendedor</th>
                    <th>Precio Base</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAuctions.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className={styles.auctionCell}>
                          <span className={styles.cardName}>{a.cardName}</span>
                          <span className={styles.gameName}>{a.game}</span>
                        </div>
                      </td>
                      <td>{a.sellerName}</td>
                      <td>${a.price?.toLocaleString()}</td>
                      <td>
                        <div className={styles.btnGroup}>
                          <button onClick={() => handleApproveAuction(a.id)} className={styles.btnApprove}>Autorizar</button>
                          <button onClick={() => handleRejectAuction(a.id)} className={styles.btnReject}>Rechazar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.card} style={{ marginTop: '2rem' }}>
          <h2 className={styles.sectionTitle}>Ranking de Vendedores</h2>
          <p className={styles.subtitle}>Usuarios registrados y su volumen de ventas.</p>

          {fetchingUsers ? (
            <p>Cargando estadísticas...</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Ventas</th>
                    <th>Volumen Total</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, index) => (
                    <tr key={u.id} className={index === 0 ? styles.topSeller : ""}>
                      <td>
                        <div className={styles.userCell}>
                          <span className={styles.userName}>{u.displayName || u.email?.split('@')[0]}</span>
                          <span className={styles.userEmail}>{u.email}</span>
                        </div>
                      </td>
                      <td><span className={styles.roleBadge}>{u.role || 'user'}</span></td>
                      <td>{u.salesCount}</td>
                      <td className={styles.volume}>${u.totalVolume?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
