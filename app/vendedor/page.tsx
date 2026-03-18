"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header/Header";
import { useAuth } from "@/context/AuthContext";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { searchCards, TcgSearchResult } from "@/lib/tcgApi";
import { REGIONES_CHILE } from "@/lib/chileData";
import { LayoutDashboard, Store, ClipboardList, Trash2, Tag, Clock, ShoppingBag, MapPin } from "lucide-react";
import styles from "./Vendedor.module.css";


export default function VendedorDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TcgSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TcgSearchResult | null>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [auctionsEnabled, setAuctionsEnabled] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cardName: "",
    game: "pokemon",
    price: "",
    stock: "1",
    condition: "Near Mint",
    listingType: "direct",
    durationHours: "24",
    imageUrl: "",
    language: "Español",
    finish: "Normal",
    cardNumber: "",
    expansion: "",
    region: "",
    sellerCity: "",
  });

  // Real-time synchronization
  useEffect(() => {
    const configRef = doc(db, "config", "global");
    const unsubConfig = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        setAuctionsEnabled(snap.data().auctionsEnabled);
      }
    });

    if (!user) return () => unsubConfig();

    const listeners: (() => void)[] = [];

    const setupListener = (collName: string, setData: (data: any[]) => void, typeLabel: string) => {
      const collRef = collection(db, collName);
      const q = query(collRef, where("sellerId", "==", user.uid));

      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        const items = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          type: typeLabel
        }));
        
        // Manual sort by createdAt (desc)
        items.sort((a: any, b: any) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
          return tB - tA;
        });

        setData(items);
      }, (error: any) => {
        console.error(`Error in snapshot listener for ${collName}:`, error);
      });

      listeners.push(unsubscribe);
    };

    // 1. Listen to Sales
    setupListener("sales", setRecentSales, "Venta");

    // 2. Listen to Inventory & Auctions for myListings
    const syncMyListings = () => {
      const qInv = query(collection(db, "inventory"), where("sellerId", "==", user.uid));
      const qAuc = query(collection(db, "auctions"), where("sellerId", "==", user.uid));

      const unsubInv = onSnapshot(qInv, (snapInv: any) => {
        const invItems = snapInv.docs.map((doc: any) => ({ id: doc.id, ...doc.data(), type: "Directo" }));
        
        onSnapshot(qAuc, (snapAuc: any) => {
          const aucItems = snapAuc.docs.map((doc: any) => ({ id: doc.id, ...doc.data(), type: "Subasta" }));
          
          let combined = [...invItems, ...aucItems];
          
          // Add Mocks if necessary
          if (user.uid === "mock-user-123") {
            const mInv = JSON.parse(localStorage.getItem("mock_inventory") || "[]");
            const mAuc = JSON.parse(localStorage.getItem("mock_auctions") || "[]");
            combined = [
              ...combined,
              ...mInv.map((i: any) => ({ ...i, id: i.id || `m-${Math.random()}`, type: "Directo (Sim)" })),
              ...mAuc.map((a: any) => ({ ...a, id: a.id || `m-${Math.random()}`, type: "Subasta (Sim)" }))
            ];
          }

          // Final Sort
          combined.sort((a: any, b: any) => {
            const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return tB - tA;
          });

          setMyListings(combined);
        });
      });
      listeners.push(unsubInv);
    };

    syncMyListings();

    return () => listeners.forEach(unsub => unsub());
  }, [user]);

  // Sync profile location initially
  useEffect(() => {
    if (userData && !formData.sellerCity) {
      setFormData(prev => ({
        ...prev,
        sellerCity: userData.comuna || "Santiago",
        region: userData.region || REGIONES_CHILE.find(r => r.communes.includes(userData.comuna))?.name || "Región Metropolitana de Santiago"
      }));
    }
  }, [userData]);

  // Search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        const results = await searchCards(formData.game, searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, formData.game]);

  const handleSelectCard = (card: TcgSearchResult) => {
    setSelectedCard(card);
    setFormData({
      ...formData,
      cardName: card.name,
      imageUrl: card.image,
      cardNumber: card.id,
      expansion: card.set || "",
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleStartEdit = (listing: any) => {
    setEditingId(listing.id);
    setEditingType(listing.type);
    setFormData({
      cardName: listing.cardName,
      game: listing.game,
      price: (listing.price || listing.startPrice).toString(),
      stock: (listing.stock || "1").toString(),
      condition: listing.condition,
      listingType: listing.type.includes("Subasta") ? "auction" : "direct",
      durationHours: listing.durationHours || "24",
      imageUrl: listing.imageUrl,
      language: listing.language || "Español",
      finish: listing.finish || "Normal",
      cardNumber: listing.cardNumber || "",
      expansion: listing.expansion || "",
      region: listing.region || "",
      sellerCity: listing.sellerCity || "",
    });
    setSelectedCard({
      id: listing.id,
      name: listing.cardName,
      image: listing.imageUrl,
      game: listing.game
    });
    setActiveTab("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingType(null);
    setFormData({
      cardName: "",
      game: "pokemon",
      price: "",
      stock: "1",
      condition: "Near Mint",
      listingType: "direct",
      durationHours: "24",
      imageUrl: "",
      language: "Español",
      finish: "Normal",
      cardNumber: "",
      expansion: "",
      region: userData?.region || "",
      sellerCity: userData?.comuna || "",
    });
    setSelectedCard(null);
  };

  const handleDelete = async (id: string, type: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta publicación?")) return;
    
    try {
      if (type.includes("(Sim)")) {
        const key = type.includes("Subasta") ? "mock_auctions" : "mock_inventory";
        const items = JSON.parse(localStorage.getItem(key) || "[]");
        const filtered = items.filter((it: any) => it.id !== id);
        localStorage.setItem(key, JSON.stringify(filtered));
      } else {
        const coll = type === "Subasta" ? "auctions" : "inventory";
        await deleteDoc(doc(db, coll, id));
      }
      alert("Publicación eliminada.");
      // Toggle tab back and forth to trigger refresh or just refetch
      const updatedListings = myListings.filter(l => l.id !== id);
      setMyListings(updatedListings);
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Error al eliminar.");
    }
  };

  const isProfileComplete = 
    userData?.nombre && 
    userData?.apellido && 
    userData?.calle && 
    userData?.comuna && 
    userData?.banco && 
    userData?.numeroCuenta;

  if (authLoading) return <div className={styles.main}><Header /><p>Cargando...</p></div>;

  if (!user || userData?.role !== "seller") {
    return (
      <main className={styles.main}>
        <Header />
        <div className={styles.unauthorized}>
          <div className={styles.unauthorizedCard}>
             <h2 className={styles.unauthorizedTitle}>Acceso Denegado</h2>
             <p>Solo los usuarios registrados como **Vendedores** pueden acceder a este panel.</p>
             <p className={styles.hint}>Puedes cambiar tu rol en el menú superior haciendo clic en tu perfil.</p>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProfileComplete) {
      alert("Debes completar tu perfil (especialmente los datos bancarios) antes de publicar.");
      return;
    }
    setLoading(true);
    try {
      const parsedPrice = Math.round(parseFloat(formData.price) || 0);
      const payload = {
        cardName: formData.cardName,
        game: formData.game,
        price: parsedPrice,
        stock: parseInt(formData.stock) || 1,
        condition: formData.condition,
        language: formData.language,
        finish: formData.finish,
        imageUrl: formData.imageUrl,
        cardNumber: formData.cardNumber,
        expansion: formData.expansion,
        sellerId: user.uid,
        sellerName: (userData?.nombre && userData?.apellido) 
          ? `${userData.nombre} ${userData.apellido}` 
          : (user.displayName || "Vendedor de Prueba"),
        sellerCity: formData.sellerCity || userData?.comuna || "Santiago",
        region: formData.region || userData?.region || "",
        createdAt: serverTimestamp(),
        status: "active",
      };

      if (editingId) {
        // Update Logic
        if (editingType?.includes("(Sim)")) {
          const key = editingType.includes("Subasta") ? "mock_auctions" : "mock_inventory";
          const items = JSON.parse(localStorage.getItem(key) || "[]");
          const idx = items.findIndex((it: any) => it.id === editingId);
          if (idx !== -1) {
            items[idx] = { 
              ...items[idx], 
              ...payload, 
              createdAt: items[idx].createdAt,
              price: parsedPrice,
              startPrice: editingType.includes("Subasta") ? parsedPrice : undefined
            };
            if (!items[idx].priceHistory) items[idx].priceHistory = [];
            items[idx].priceHistory.push({ price: parsedPrice, date: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(items));
          }
        } else {
          const coll = editingType === "Subasta" ? "auctions" : "inventory";
          const docRef = doc(db, coll, editingId);
          const updatePayload: any = { ...payload };
          delete updatePayload.createdAt; // Don't overwrite original date
          
          if (editingType === "Subasta") {
             updatePayload.startPrice = parsedPrice;
          }
          
          await updateDoc(docRef, updatePayload);
          // Record history only if price changed
          await addDoc(collection(db, coll, editingId, "priceHistory"), {
            price: parsedPrice,
            date: serverTimestamp()
          });
        }
        alert("¡Publicación actualizada con éxito!");
        handleCancelEdit();
      } else {
        // Create Logic
        if (user.uid === "mock-user-123") {
          const isAuction = formData.listingType === "auction";
          const storageKey = isAuction ? "mock_auctions" : "mock_inventory";
          
          const list = JSON.parse(localStorage.getItem(storageKey) || "[]");
          const newItem = {
            ...payload,
            id: `local-${Date.now()}`,
            createdAt: new Date().toISOString(),
            priceHistory: [
              { price: parsedPrice, date: new Date().toISOString() }
            ],
            ...(isAuction ? {
              startPrice: parsedPrice,
              currentBid: parsedPrice,
              endTime: new Date(Date.now() + parseInt(formData.durationHours) * 60 * 60 * 1000).toISOString(),
              isAuction: true
            } : {})
          };
          
          list.push(newItem);
          localStorage.setItem(storageKey, JSON.stringify(list));
          alert(`¡${isAuction ? "Subasta" : "Venta"} creada con éxito! (Simulación)`);
        } else {
          if (formData.listingType === "auction") {
            const docRef = await addDoc(collection(db, "auctions"), {
              ...payload,
              startPrice: parsedPrice,
              currentBid: parsedPrice,
              endTime: new Date(Date.now() + parseInt(formData.durationHours) * 60 * 60 * 1000),
            });
            // Add initial price history
            await addDoc(collection(db, "auctions", docRef.id, "priceHistory"), {
              price: parsedPrice,
              date: serverTimestamp()
            });
          } else {
            const docRef = await addDoc(collection(db, "inventory"), payload);
            // Add initial price history
            await addDoc(collection(db, "inventory", docRef.id, "priceHistory"), {
              price: parsedPrice,
              date: serverTimestamp()
            });
          }
          alert("¡Publicación creada con éxito!");
        }
        setFormData({ 
          cardName: "", 
          game: "pokemon", 
          price: "", 
          stock: "1", 
          condition: "Near Mint", 
          listingType: "direct", 
          durationHours: "24", 
          imageUrl: "", 
          language: "Español", 
          finish: "Normal", 
          cardNumber: "", 
          expansion: "",
          region: userData?.region || "",
          sellerCity: userData?.comuna || ""
        });
        setSelectedCard(null);
      }
    } catch (error) {
      console.error("Error creation:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <Header />
      
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <h1 className={styles.title}>Panel de Vendedor</h1>
          <p className={styles.subtitle}>Bienvenido, {userData?.nombre || user.displayName}. Gestiona tu inventario y ventas.</p>
        </div>

        <div className={styles.tabs}>
           <button 
             type="button"
             className={`${styles.tabBtn} ${activeTab === "dashboard" ? styles.activeTab : ""}`}
             onClick={() => setActiveTab("dashboard")}
           >
             <LayoutDashboard size={18} /> Resumen y Publicar
           </button>
           <button 
             type="button"
             className={`${styles.tabBtn} ${activeTab === "inventory" ? styles.activeTab : ""}`}
             onClick={() => setActiveTab("inventory")}
           >
             <Store size={18} /> Mis Publicaciones ({myListings.length})
           </button>
        </div>

        {activeTab === "dashboard" ? (
          <div className={styles.grid}>

            {/* Upload Section */}
            <div className={styles.formCard} style={{ gridColumn: 'span 2' }}>
              {!isProfileComplete ? (
                <div className={styles.completeProfileWarning}>
                  <h3 className={styles.cardTitle}>⚠️ Perfil Incompleto</h3>
                  <p>Para poder publicar cartas y recibir los pagos de tus ventas, es un requisito legal completar tus datos personales y bancarios.</p>
                  <Link 
                    href="/perfil"
                    className={styles.submitBtn} 
                  >
                    Ir a Mi Perfil ahora
                  </Link>
                </div>
              ) : (
                <>
                  <h3 className={styles.cardTitle}>{editingId ? "Editar Publicación" : "Nueva Publicación"}</h3>
                  <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.row}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Juego</label>
                        <select 
                          className={styles.select}
                          value={formData.game}
                          onChange={(e) => {
                            setFormData({...formData, game: e.target.value});
                            setSelectedCard(null);
                            setSearchResults([]);
                          }}
                        >
                          <option value="pokemon">Pokémon</option>
                          <option value="mtg">Magic: The Gathering</option>
                          <option value="yugioh">Yu-Gi-Oh!</option>
                          <option value="onepiece">One Piece</option>
                          <option value="lor">Legends of Runeterra</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Tipo de Publicación</label>
                        <select 
                          className={styles.select}
                          value={formData.listingType}
                          onChange={(e) => setFormData({...formData, listingType: e.target.value})}
                        >
                          <option value="direct">Venta Directa</option>
                          {auctionsEnabled && <option value="auction">Subasta</option>}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Buscar Carta</label>
                      <div className={styles.searchWrapper}>
                        <input 
                          className={styles.input}
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Nombre de la carta..." 
                        />
                        {isSearching && <span className={styles.searchingSpin}>🔍</span>}
                        {searchResults.length > 0 && (
                          <div className={styles.searchResults}>
                            {searchResults.map(card => (
                              <div key={card.id} className={styles.resultItem} onClick={() => handleSelectCard(card)}>
                                <img src={card.image} alt={card.name} />
                                <div className={styles.resultInfo}>
                                  <strong>{card.name}</strong>
                                  <span>{card.set}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedCard && (
                      <div className={styles.selectedCard}>
                        <img src={selectedCard.image} alt={selectedCard.name} />
                        <div className={styles.selectedInfo}>
                          <h4>{selectedCard.name}</h4>
                          <button type="button" onClick={() => setSelectedCard(null)} className={styles.changeBtn}>Cambiar</button>
                        </div>
                      </div>
                    )}

                    <div className={styles.row}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Estado</label>
                        <select 
                          className={styles.select}
                          value={formData.condition}
                          onChange={(e) => setFormData({...formData, condition: e.target.value})}
                        >
                          <option value="Mint">Impecable (Mint)</option>
                          <option value="Near Mint">Casi Nueva (NM)</option>
                          <option value="Played">Usada (Played)</option>
                          <option value="Damaged">Dañada</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Stock</label>
                        <input 
                          className={styles.input}
                          type="number"
                          value={formData.stock}
                          onChange={(e) => setFormData({...formData, stock: e.target.value})}
                          min="1"
                        />
                      </div>
                    </div>

                    <div className={styles.row}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Idioma</label>
                        <select 
                          className={styles.select}
                          value={formData.language}
                          onChange={(e) => setFormData({...formData, language: e.target.value})}
                        >
                          <option value="Español">Español</option>
                          <option value="Inglés">Inglés</option>
                          <option value="Japonés">Japonés</option>
                          <option value="Portugués">Portugués</option>
                          <option value="Chino">Chino</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Acabado</label>
                        <select 
                          className={styles.select}
                          value={formData.finish}
                          onChange={(e) => setFormData({...formData, finish: e.target.value})}
                        >
                          <option value="Normal">Normal</option>
                          <option value="Foil">Foil / Holo</option>
                          <option value="Reverse Foil">Reverse Foil</option>
                          <option value="Full Art">Full Art / Alt Art</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.row}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Precio (CLP)</label>
                        <input 
                          className={styles.input}
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          placeholder="0"
                          step="1"
                        />
                      </div>
                      {(formData.listingType === "auction" || editingType === "Subasta") && (
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Duración (Horas)</label>
                          <select 
                            className={styles.select}
                            value={formData.durationHours}
                            onChange={(e) => setFormData({...formData, durationHours: e.target.value})}
                          >
                            <option value="12">12 Horas</option>
                            <option value="24">24 Horas</option>
                            <option value="48">48 Horas</option>
                            <option value="72">72 Horas</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className={styles.row}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}><MapPin size={14} /> Región</label>
                        <select 
                          className={styles.select}
                          value={formData.region}
                          onChange={(e) => setFormData({...formData, region: e.target.value, sellerCity: ""})}
                          required
                        >
                          <option value="">Selecciona región</option>
                          {REGIONES_CHILE.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Comuna / Ciudad</label>
                        <select 
                          className={styles.select}
                          value={formData.sellerCity}
                          onChange={(e) => setFormData({...formData, sellerCity: e.target.value})}
                          required
                          disabled={!formData.region}
                        >
                          <option value="">{formData.region ? "Selecciona comuna" : "Primero elige región"}</option>
                          {formData.region && REGIONES_CHILE.find(r => r.name === formData.region)?.communes.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.btnGroup}>
                      <button type="submit" className={styles.submitBtn} disabled={loading || !selectedCard} style={{ flex: 2 }}>
                        {loading ? "Procesando..." : (editingId ? "Actualizar Publicación" : "Publicar Ahora")}
                      </button>
                      {editingId && (
                        <button type="button" className={styles.deleteBtn} onClick={handleCancelEdit} style={{ flex: 1, marginTop: '1rem', justifyContent: 'center' }}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Recent Sales Section */}
            <div className={styles.salesCard} style={{ gridColumn: 'span 2' }}>
              <h1 className={styles.cardTitle}><ShoppingBag size={18} /> Ventas Recientes</h1>
              <div className={styles.salesList}>
                {recentSales.length === 0 ? (
                  <p className={styles.emptyMsg}>Aún no has realizado ventas.</p>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Carta</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSales.map((sale: any) => (
                        <tr key={sale.id}>
                          <td>{sale.cardName}</td>
                          <td>{sale.quantity}</td>
                          <td>${sale.price}</td>
                          <td><span className={styles.statusBadge}>{sale.status}</span></td>
                          <td>{sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString() : 'Hoy'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.inventorySection}>
             <div className={styles.inventorySummary}>
                <div className={styles.inventoryStat}>
                   <span>Total Publicado</span>
                   <strong>{myListings.length}</strong>
                </div>
                <div className={styles.inventoryStat}>
                   <span>Activos</span>
                   <strong style={{ color: '#00ff00' }}>{myListings.filter(l => l.status === "active").length}</strong>
                </div>
             </div>

             <div className={styles.tableWrapper}>
                <table className={styles.table}>
                   <thead>
                      <tr>
                         <th>Miniatura</th>
                         <th>Carta</th>
                         <th>Tipo</th>
                         <th>Precio/Base</th>
                         <th>Stock</th>
                         <th>Acciones</th>
                      </tr>
                   </thead>
                   <tbody>
                      {myListings.map((listing) => (
                         <tr key={listing.id}>
                            <td>
                               <img src={listing.imageUrl} alt={listing.cardName} className={styles.listingImg} />
                            </td>
                            <td>
                               <strong>{listing.cardName}</strong>
                               <div style={{ fontSize: '0.75rem', color: '#666' }}>
                                 {listing.game.toUpperCase()} • {listing.condition} • {listing.language} • {listing.finish}
                               </div>
                            </td>
                            <td>
                               <span className={styles.typeBadge}>
                                  {listing.type}
                               </span>
                            </td>
                            <td>${listing.price || listing.startPrice}</td>
                            <td>{listing.stock || "-"}</td>
                             <td>
                                <div className={styles.btnGroup}>
                                   <button 
                                     className={styles.editBtn}
                                     onClick={() => handleStartEdit(listing)}
                                   >
                                      <Tag size={14} /> Editar
                                   </button>
                                   <button 
                                     className={styles.deleteBtn}
                                     onClick={() => handleDelete(listing.id, listing.type)}
                                   >
                                      <Trash2 size={14} /> Eliminar
                                   </button>
                                </div>
                             </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                {myListings.length === 0 && <p className={styles.emptyMsg}>No tienes publicaciones activas.</p>}
             </div>
          </div>
        )}
      </div>
    </main>
  );
}
