"use client";

import React, { useState } from "react";
import Header from "@/components/Header/Header";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { CreditCard, ShieldCheck, Truck } from "lucide-react";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./Checkout.module.css";

export default function CheckoutPage() {
  const { cart, total, clearCart, removeFromCart } = useCart();
  const { user, login } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      alert("Debes iniciar sesión para completar la compra.");
      login();
      return;
    }
    
    setIsProcessing(true);
    try {
      // 1. Crear Orden en Firestore
      const orderRef = await addDoc(collection(db, "orders"), {
        buyerId: user.uid,
        buyerEmail: user.email,
        items: cart,
        total: total,
        status: "paid",
        createdAt: serverTimestamp(),
      });

      // 2. Actualizar Inventario y Registrar Ventas Individuales
      for (const item of cart) {
        // Registrar la venta para el vendedor
        await addDoc(collection(db, "sales"), {
          orderId: orderRef.id,
          sellerId: item.sellerId || "unknown", // Asegurarse de que el sellerId esté en CartItem
          cardName: item.cardName,
          price: item.price,
          quantity: item.quantity,
          createdAt: serverTimestamp(),
          status: "completed"
        });

        // Reducir Stock
        if (item.id.length > 5) { 
          const docRef = doc(db, "inventory", item.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const currentStock = docSnap.data().stock || 0;
            await updateDoc(docRef, {
              stock: Math.max(0, currentStock - item.quantity),
              status: currentStock - item.quantity <= 0 ? "sold" : "active"
            });
          }
        }
      }

      setIsSuccess(true);
      clearCart();
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      alert("Hubo un error al procesar el pago. Por favor intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <main className={styles.main}>
        <Header />
        <div className={styles.successContainer}>
          <div className={styles.successCard}>
            <ShieldCheck size={80} color="#ffd700" />
            <h1 className={styles.successTitle}>¡Pago Exitoso!</h1>
            <p className={styles.successMsg}>Tu orden ha sido procesada. Recibirás un correo con los detalles.</p>
            <button className={styles.backBtn} onClick={() => window.location.href = "/"}>
              Volver al Inicio
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>Tu Carrito</h1>
        
        <div className={styles.content}>
          <div className={styles.cartList}>
            {cart.length === 0 ? (
              <p className={styles.empty}>Tu carrito está vacío.</p>
            ) : (
              cart.map(item => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemName}>{item.cardName}</h3>
                    <p className={styles.itemSub}>{item.sellerName} • {item.game.toUpperCase()}</p>
                  </div>
                  <div className={styles.itemPrice}>
                    <span className={styles.itemPriceValue}>${item.price}</span>
                    <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)}>Eliminar</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.summary}>
            <h3 className={styles.summaryTitle}>Resumen de Compra</h3>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>${total}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Envío</span>
              <span>Gratis</span>
            </div>
            <hr className={styles.divider} />
            <div className={styles.totalRowMain}>
              <span>Total</span>
              <span>${total}</span>
            </div>

            <button 
              className={styles.payBtn} 
              disabled={cart.length === 0 || isProcessing}
              onClick={handlePayment}
            >
              {isProcessing ? "Procesando..." : "Proceder al Pago"}
            </button>

            <div className={styles.badges}>
              <span><CreditCard size={14} /> Pago Seguro</span>
              <span><Truck size={14} /> Envío Asegurado</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
