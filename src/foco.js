import React, { createContext, useContext, useEffect, useRef } from 'react';
import { View, Dimensions } from 'react-native';

// Registro de "focos": elementos que el tutorial puede resaltar o que Chefpu señala.
// Cada <Foco id="..."> mide su posición real en la ventana; el tutorial la lee de aquí.
const elementos = new Map(); // id -> { ref, asegurar }
const rects = new Map();     // id -> { x, y, w, h }
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f());

export const focos = {
  existe: (id) => elementos.has(id),
  rect: (id) => rects.get(id) || null,
  suscribir: (f) => { oyentes.add(f); return () => oyentes.delete(f); },
  medir(id) {
    const e = elementos.get(id);
    if (!e?.ref.current?.measureInWindow) return;
    e.ref.current.measureInWindow((x, y, w, h) => {
      if (!w && !h) return;
      const prev = rects.get(id);
      if (prev && prev.x === x && prev.y === y && prev.w === w && prev.h === h) return;
      rects.set(id, { x, y, w, h });
      avisar();
    });
  },
  // Lleva el elemento a la vista si está dentro de una lista que se desplaza
  asegurarVisible(id) { elementos.get(id)?.asegurar?.(); },
};

// Las pantallas con scroll comparten su ScrollView para poder llevar un foco a la vista
export const ScrollCtx = createContext(null);

export function Foco({ id, style, children }) {
  const ref = useRef(null);
  const scroll = useContext(ScrollCtx);
  useEffect(() => {
    const asegurar = () => {
      if (!scroll?.ref.current || !ref.current) return;
      ref.current.measureInWindow((x, y, w, h) => {
        const alto = Dimensions.get('window').height;
        if (y < 90 || y + h > alto - 140) {
          scroll.ref.current.scrollTo({ y: Math.max(0, scroll.offset.current + y - alto * 0.3), animated: true });
        }
      });
    };
    elementos.set(id, { ref, asegurar });
    avisar();
    return () => { elementos.delete(id); rects.delete(id); avisar(); };
  }, [id, scroll]);
  return (
    <View ref={ref} collapsable={false} style={style} onLayout={() => focos.medir(id)}>
      {children}
    </View>
  );
}
