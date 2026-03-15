"use client";

import React from "react";
import styles from "./SearchFilters.module.css";

interface Props {
  game: string;
}

const SearchFilters: React.FC<Props> = ({ game }) => {
  return (
    <div className={styles.filters}>
      {game === "pokemon" && (
        <>
          <div className={styles.filterItem}>
            <label>Tipo</label>
            <select><option>Agua</option><option>Fuego</option><option>Planta</option></select>
          </div>
          <div className={styles.filterItem}>
            <label>Rareza</label>
            <select><option>Común</option><option>Rara</option><option>Secret Rare</option></select>
          </div>
        </>
      )}

      {game === "mtg" && (
        <>
          <div className={styles.filterItem}>
            <label>Color</label>
            <div className={styles.colorPills}>
              <span className={styles.pillW}>W</span>
              <span className={styles.pillU}>U</span>
              <span className={styles.pillB}>B</span>
              <span className={styles.pillR}>R</span>
              <span className={styles.pillG}>G</span>
            </div>
          </div>
          <div className={styles.filterItem}>
            <label>Costo de Maná</label>
            <input type="number" placeholder="CMC" />
          </div>
        </>
      )}

      {game === "onepiece" && (
        <>
          <div className={styles.filterItem}>
            <label>Atributo</label>
            <select><option>Strike</option><option>Slash</option><option>Special</option></select>
          </div>
          <div className={styles.filterItem}>
            <label>Poder</label>
            <input type="number" step="1000" />
          </div>
        </>
      )}

      {game === "lor" && (
        <>
          <div className={styles.filterItem}>
            <label>Región</label>
            <select><option>Demacia</option><option>Freljord</option><option>Ionia</option><option>Targon</option></select>
          </div>
        </>
      )}
    </div>
  );
};

export default SearchFilters;
