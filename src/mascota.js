import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './theme';
import { Boton, s } from './ui';

// Chefpu, el pudú chef de Qué Hay (versión Clásico).
// Las imágenes viven en el repositorio (assets/) y se cargan por URL para que funcionen en Snack y Expo Go.
const BASE = 'https://raw.githubusercontent.com/lafkenariasp-alt/Quehay/main/assets';
const CHEFPU = { cuerpo: `${BASE}/chefpu_clasico.png`, cara: `${BASE}/chefpu_cara.png` };

// tam: alto en puntos. Bajo 100 se usa solo la cara, que se lee mejor en chico.
export function Mascota({ tam = 96, accesorio = null, cuerpo }) {
  const usarCuerpo = cuerpo ?? tam >= 100;
  return (
    <View style={{ width: tam, height: tam }} accessible accessibilityRole="image" accessibilityLabel="Chefpu, el pudú chef">
      <Image source={{ uri: usarCuerpo ? CHEFPU.cuerpo : CHEFPU.cara }} style={{ width: tam, height: tam }} resizeMode="contain" />
      {accesorio === 'delantal_bienvenida' ? (
        // Insignia del regalo de bienvenida
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: Math.max(22, tam * 0.26), height: Math.max(22, tam * 0.26), borderRadius: 999,
          backgroundColor: C.dorado, borderWidth: 2, borderColor: C.blanco, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="ribbon" size={Math.max(12, tam * 0.14)} color={C.texto} />
        </View>
      ) : null}
    </View>
  );
}

// Globo de diálogo de la mascota
export function Globo({ texto, style }) {
  return (
    <View style={[{ backgroundColor: C.blanco, borderRadius: 16, borderWidth: 1, borderColor: C.linea, paddingVertical: 10, paddingHorizontal: 14, flexShrink: 1 }, style]}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: C.texto, lineHeight: 21 }}>{texto}</Text>
    </View>
  );
}

// Lo que gana quien crea su cuenta
export function PaqueteBienvenida() {
  const items = [
    ['shirt-outline', 'Delantal exclusivo para tu mascota'],
    ['flash-outline', '+30 XP de regalo para empezar'],
    ['file-tray-stacked-outline', 'Tus ingredientes guardados en tu nevera'],
    ['ribbon-outline', 'Título Fundador si estás entre los primeros 1.000'],
  ];
  return (
    <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.doradoTinte }}>
      <Text style={[s.etiqueta, { color: C.ambarOscuro }]}>Tu paquete de bienvenida</Text>
      {items.map(([icono, texto]) => (
        <View key={texto} style={s.fila}>
          <Ionicons name={icono} size={20} color={C.ambarOscuro} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: C.texto }}>{texto}</Text>
        </View>
      ))}
    </View>
  );
}

// Pantalla para invitados en secciones que requieren cuenta
export function PideCuenta({ titulo, texto, onCrear }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, padding: 24, gap: 18, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Mascota tam={150} />
        <Text style={[s.titulo, { textAlign: 'center' }]}>{titulo}</Text>
        <Text style={[s.sub, { textAlign: 'center', fontSize: 15 }]}>{texto}</Text>
      </View>
      <PaqueteBienvenida />
      <Boton titulo="Crear mi cuenta" icono="gift-outline" onPress={onCrear} />
    </View>
  );
}
