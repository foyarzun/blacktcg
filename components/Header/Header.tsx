"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ShoppingCart } from "lucide-react";
import styles from "./Header.module.css";

interface HeaderProps {
  isSticky?: boolean;
}

export default function Header({ isSticky = true }: HeaderProps) {
  const { user, userData, isAdmin, login, logout } = useAuth();
  const { cart } = useCart();
  const [auctionsEnabled, setAuctionsEnabled] = useState(false);

  useEffect(() => {
    const configRef = doc(db, "config", "global");
    const unsubscribe = onSnapshot(configRef, (doc) => {
      if (doc.exists()) {
        setAuctionsEnabled(doc.data().auctionsEnabled);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRoleSwitch = async () => {
    if (!user || !userData) return;

    let newRole = userData.role;

    if (isAdmin) {
      // Admin cycle: admin -> seller -> buyer -> admin
      if (userData.role === "admin") newRole = "seller";
      else if (userData.role === "seller") newRole = "buyer";
      else newRole = "admin";
    } else {
      // Normal user cycle: buyer -> seller -> buyer
      newRole = userData.role === "seller" ? "buyer" : "seller";
    }

    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { ...userData, role: newRole }, { merge: true });
  };

  return (
    <header className={`${styles.header} ${!isSticky ? styles.relative : ''}`}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logoContainer}>
          <Image
            src="/logo_home.png"
            alt="Black TCG Logo"
            width={120}
            height={40}
            className={styles.logo}
          />
        </Link>

        <div className={styles.menu}>
          {userData?.role === "admin" || (isAdmin && userData?.role !== "seller" && userData?.role !== "buyer") ? (
            <>
              <Link href="/admin">Panel Admin</Link>
              <Link href="/vendedor">Ventas Globales</Link>
              <Link href="/explora2">Marketplace</Link>
              {auctionsEnabled && <Link href="/subastas" className={styles.auctionLink}>Subastas</Link>}
            </>
          ) : userData?.role === "seller" ? (
            <>
              <Link href="/vendedor">Mi Panel</Link>
              <Link href="/perfil">Mi Perfil</Link>
              <Link href="/explora2">Explorar</Link>
              {auctionsEnabled && <Link href="/subastas" className={styles.auctionLink}>Subastas</Link>}
            </>
          ) : (
            <>
              <Link href="/explora2">Explorar</Link>
              {auctionsEnabled && <Link href="/subastas" className={styles.auctionLink}>Subastas</Link>}
            </>
          )}
          <Link href="/ayuda">Ayuda</Link>
        </div>

        <div className={styles.actions}>
          <Link href="/checkout" className={styles.cartIcon}>
            <ShoppingCart size={20} />
            {cart.length > 0 && <span className={styles.cartCount}>{cart.length}</span>}
          </Link>
          {user ? (
            <div className={styles.userSection}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.displayName || user.email}</span>
                <span
                  className={`${styles.roleBadge} ${userData?.role === 'admin' ? styles.adminBadge : ''}`}
                  onClick={handleRoleSwitch}
                  title="Haz clic para cambiar de rol"
                  role="button"
                >
                  Modo {userData?.role === "admin" ? "Admin" : userData?.role === "seller" ? "Vendedor" : "Comprador"}
                </span>
              </div>
              <button type="button" className={styles.logoutBtn} onClick={logout}>Cerrar Sesión</button>
            </div>
          ) : (
            <button type="button" className={styles.loginBtn} onClick={login}>Login con Google</button>
          )}
        </div>
      </nav>
    </header>
  );
}
