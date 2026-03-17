"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header/Header";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, MapPin, Landmark, Save, ShoppingBag } from "lucide-react";
import styles from "./Perfil.module.css";

import { REGIONES_CHILE } from "@/lib/chileData";

const BANCOS_CHILE = [
  "Banco Estado", "Banco de Chile", "Santander", "BCI", "Scotiabank",
  "Itaú", "Banco Falabella", "Banco Security", "Banco Ripley", "Banco Internacional"
].sort();

const TIPOS_CUENTA = [
  "Cuenta Corriente", "Cuenta Vista / RUT", "Cuenta de Ahorro", "Cuenta Pro"
];

export default function PerfilPage() {
  const { user, userData, loading: authLoading, updateUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"perfil" | "compras">("perfil");
  const [orders, setOrders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    calle: "",
    numero: "",
    comuna: "",
    region: "",
    banco: "",
    tipoCuenta: "",
    numeroCuenta: "",
    rutCuenta: "",
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        nombre: userData.nombre || userData.displayName?.split(" ")[0] || "",
        apellido: userData.apellido || userData.displayName?.split(" ").slice(1).join(" ") || "",
        email: userData.email || "",
        calle: userData.calle || "",
        numero: userData.numero || "",
        comuna: userData.comuna || "",
        region: userData.region || REGIONES_CHILE.find(r => r.communes.includes(userData.comuna))?.name || "",
        banco: userData.banco || "",
        tipoCuenta: userData.tipoCuenta || "",
        numeroCuenta: userData.numeroCuenta || "",
        rutCuenta: userData.rutCuenta || "",
      });
    }
  }, [userData]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "orders"),
          where("buyerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    if (activeTab === "compras") {
      fetchOrders();
    }
  }, [user, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateUserData(formData);
      alert("¡Perfil actualizado con éxito!");
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      alert("Hubo un error al guardar los datos.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className={styles.main}><Header /><p>Cargando...</p></div>;

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Mi Cuenta</h1>
            <p className={styles.subtitle}>Gestiona tus datos personales y revisa tu actividad.</p>
          </div>

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "perfil" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("perfil")}
            >
              <User size={16} /> Datos de Perfil
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "compras" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("compras")}
            >
              <ShoppingBag size={16} /> Mis Compras
            </button>
          </div>

          {activeTab === "perfil" ? (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Datos Personales</h3>
                <div className={styles.grid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nombre</label>
                    <input
                      className={styles.input}
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Andres" required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Apellido</label>
                    <input
                      className={styles.input}
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      placeholder="Ej: Soto" required
                    />
                  </div>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Correo Electrónico</label>
                    <input
                      className={styles.input}
                      type="email"
                      value={formData.email}
                      placeholder="email@ejemplo.com" disabled
                    />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Dirección de Residencia</h3>
                <div className={styles.grid}>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Calle</label>
                    <input
                      className={styles.input}
                      value={formData.calle}
                      onChange={(e) => setFormData({ ...formData, calle: e.target.value })}
                      placeholder="Ej: Av. Las Américas" required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Número</label>
                    <input
                      className={styles.input}
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="123" required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Región</label>
                    <select
                      className={styles.select}
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value, comuna: "" })}
                      required
                    >
                      <option value="">Selecciona una región</option>
                      {REGIONES_CHILE.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Comuna / Ciudad</label>
                    <select
                      className={styles.select}
                      value={formData.comuna}
                      onChange={(e) => setFormData({ ...formData, comuna: e.target.value })}
                      required
                      disabled={!formData.region}
                    >
                      <option value="">
                        {!formData.region ? "Selecciona región primero" : "Selecciona una comuna"}
                      </option>
                      {formData.region && REGIONES_CHILE.find(r => r.name === formData.region)?.communes.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Datos Bancarios</h3>
                <div className={styles.grid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Banco</label>
                    <select
                      className={styles.select}
                      value={formData.banco}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                      required
                    >
                      <option value="">Selecciona un banco</option>
                      {BANCOS_CHILE.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tipo de Cuenta</label>
                    <select
                      className={styles.select}
                      value={formData.tipoCuenta}
                      onChange={(e) => setFormData({ ...formData, tipoCuenta: e.target.value })}
                      required
                    >
                      <option value="">Selecciona tipo</option>
                      {TIPOS_CUENTA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Número de Cuenta</label>
                    <input
                      className={styles.input}
                      value={formData.numeroCuenta}
                      onChange={(e) => setFormData({ ...formData, numeroCuenta: e.target.value })}
                      placeholder="00000000" required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className={styles.saveBtn} disabled={loading}>
                <Save size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                {loading ? "Guardando..." : "Guardar Perfil"}
              </button>
            </form>
          ) : (
            <div className={styles.ordersSection}>
              {orders.length === 0 ? (
                <div className={styles.emptyMsg}>
                  <ShoppingBag size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p>Aún no has realizado ninguna compra.</p>
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Productos</th>
                        <th>Total</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Recién'}</td>
                          <td>
                            <strong>{order.items?.length} cartas</strong>
                            <span className={styles.orderItems}>
                              {order.items?.map((it: any) => it.cardName).join(", ")}
                            </span>
                          </td>
                          <td style={{ fontWeight: 'bold' }}>${order.total?.toLocaleString()}</td>
                          <td><span className={styles.statusBadge}>{order.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
