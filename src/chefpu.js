import React from 'react';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './theme';

// Chefpu, el pudú chef de Qué Hay (versión Clásico), con sus expresiones.
// Las imágenes viven en el repositorio (assets/) y se cargan por URL para que funcionen en Snack y Expo Go.
const BASE = 'https://raw.githubusercontent.com/lafkenariasp-alt/Quehay/main/assets';
const IMG = {
  cuerpo: `${BASE}/chefpu_clasico.png`,   // cuerpo entero, feliz (bienvenida, registro)
  feliz: `${BASE}/chefpu_cara.png`,       // cara: guías y avisos
  pensando: `${BASE}/chefpu_pensando.png`, // elegir ingredientes, sin resultados
  celebrando: `${BASE}/chefpu_celebrando.png`, // logros, regalo, tutorial completado
  triste: `${BASE}/chefpu_triste.png`,     // errores
};
const TEXTO = { feliz: 'feliz', pensando: 'pensando', celebrando: 'celebrando', triste: 'triste' };

// tam: alto en puntos. Sin expresión: desde 100 pt muestra el cuerpo entero, en chico la cara.
export function Mascota({ tam = 96, accesorio = null, expresion = null }) {
  const src = expresion ? IMG[expresion] : (tam >= 100 ? IMG.cuerpo : IMG.feliz);
  return (
    <View style={{ width: tam, height: tam }} accessible accessibilityRole="image"
      accessibilityLabel={`Chefpu, el pudú chef${expresion ? `, ${TEXTO[expresion]}` : ''}`}>
      <Image source={{ uri: src }} style={{ width: tam, height: tam }} resizeMode="contain" />
      {accesorio === 'delantal_bienvenida' ? (
        // Insignia del regalo de bienvenida
        // fuera de la cara: esquina inferior derecha, chica y corrida hacia afuera
        <View style={{ position: 'absolute', right: -Math.max(6, tam * 0.1), bottom: -Math.max(4, tam * 0.04), width: Math.max(20, tam * 0.22), height: Math.max(20, tam * 0.22), borderRadius: 999,
          backgroundColor: C.dorado, borderWidth: 2, borderColor: C.blanco, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="ribbon" size={Math.max(11, tam * 0.12)} color={C.texto} />
        </View>
      ) : null}
    </View>
  );
}
