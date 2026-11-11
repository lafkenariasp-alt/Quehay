import React, { createContext, useContext } from 'react';

// Sesión, perfil y navegación compartidos por toda la app
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// Ingredientes que el usuario "tiene", considerando genéricos:
// si tiene "Carne" también calza con "Pollo", y viceversa.
export function tieneIngrediente(ing, setTengo, padresDeTengo) {
  if (setTengo.has(ing.id)) return true;
  if (ing.padre_id && setTengo.has(ing.padre_id)) return true;
  if (padresDeTengo.has(ing.id)) return true;
  return false;
}

export function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [a, m, d] = fecha.split('-').map(Number);
  const f = new Date(a, m - 1, d);
  return Math.round((f - hoy) / 86400000);
}

export function textoVence(dias) {
  if (dias === null) return null;
  if (dias < 0) return 'Vencido';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `${dias} días`;
}
