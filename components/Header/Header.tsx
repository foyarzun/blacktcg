"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, Menu, X, ChevronRight } from "lucide-react";
import styles from "./Header.module.css";

interface HeaderProps {
  isSticky?: boolean;
  isFixed?: boolean;
}

export default function Header({ isSticky = true, isFixed = false }: HeaderProps) {
  const { user, userData, isAdmin, login, logout } = useAuth();
  const { cart } = useCart();
  const [auctionsEnabled, setAuctionsEnabled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <header className={`${styles.header} ${!isSticky ? styles.relative : ''} ${isFixed ? styles.fixed : ''}`}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logoContainer} onClick={() => setIsMenuOpen(false)}>
          <Image
            src="/logo_home.png"
            alt="Black TCG Logo"
            width={100}
            height={32}
            className={styles.logo}
          />
        </Link>

        {/* Desktop Menu */}
        <div className={styles.menu}>
          {userData?.role === "admin" || (isAdmin && userData?.role !== "seller" && userData?.role !== "buyer") ? (
            <>
              <Link href="/admin">Panel Admin</Link>
              <Link href="/vendedor">Ventas Globales</Link>
              <Link href="/explora2">Explorar</Link>
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

        <div className={styles.rightSection}>
          <Link href="/checkout" className={styles.cartIcon}>
            <ShoppingCart size={20} />
            {cart.length > 0 && <span className={styles.cartCount}>{cart.length}</span>}
          </Link>

          <div className={styles.desktopAuth}>
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

          <button
            className={styles.menuToggle}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`${styles.mobileOverlay} ${isMenuOpen ? styles.mobileOverlayOpen : ''}`}>
        <div className={styles.mobileNav}>
          {user && (
            <div className={styles.mobileUserHeader}>
              <div className={styles.mobileUserInfo}>
                <p className={styles.mobileUserName}>{user.displayName || user.email}</p>
                <div
                  className={`${styles.roleBadge} ${userData?.role === 'admin' ? styles.adminBadge : ''}`}
                  onClick={handleRoleSwitch}
                >
                  Modo {userData?.role === "admin" ? "Admin" : userData?.role === "seller" ? "Vendedor" : "Comprador"}
                </div>
              </div>
            </div>
          )}

          <div className={styles.mobileLinks}>
            {userData?.role === "admin" || (isAdmin && userData?.role !== "seller" && userData?.role !== "buyer") ? (
              <>
                <Link href="/admin" onClick={() => setIsMenuOpen(false)}>Panel Admin <ChevronRight size={16} /></Link>
                <Link href="/vendedor" onClick={() => setIsMenuOpen(false)}>Ventas Globales <ChevronRight size={16} /></Link>
                <Link href="/explora2" onClick={() => setIsMenuOpen(false)}>Marketplace <ChevronRight size={16} /></Link>
                {auctionsEnabled && <Link href="/subastas" onClick={() => setIsMenuOpen(false)} className={styles.auctionLink}>Subastas <ChevronRight size={16} /></Link>}
              </>
            ) : userData?.role === "seller" ? (
              <>
                <Link href="/vendedor" onClick={() => setIsMenuOpen(false)}>Mi Panel <ChevronRight size={16} /></Link>
                <Link href="/perfil" onClick={() => setIsMenuOpen(false)}>Mi Perfil <ChevronRight size={16} /></Link>
                <Link href="/explora2" onClick={() => setIsMenuOpen(false)}>Explorar <ChevronRight size={16} /></Link>
                {auctionsEnabled && <Link href="/subastas" onClick={() => setIsMenuOpen(false)} className={styles.auctionLink}>Subastas <ChevronRight size={16} /></Link>}
              </>
            ) : (
              <>
                <Link href="/explora2" onClick={() => setIsMenuOpen(false)}>Explorar <ChevronRight size={16} /></Link>
                {auctionsEnabled && <Link href="/subastas" onClick={() => setIsMenuOpen(false)} className={styles.auctionLink}>Subastas <ChevronRight size={16} /></Link>}
              </>
            )}
            <Link href="/ayuda" onClick={() => setIsMenuOpen(false)}>Ayuda <ChevronRight size={16} /></Link>
          </div>

          <div className={styles.mobileFooter}>
            {user ? (
              <button onClick={() => { logout(); setIsMenuOpen(false); }} className={styles.logoutBtnMobile}>
                Cerrar Sesión
              </button>
            ) : (
              <button onClick={() => { login(); setIsMenuOpen(false); }} className={styles.loginBtnMobile}>
                Login con Google
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
