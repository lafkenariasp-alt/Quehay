import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './theme';
import { Boton, s } from './ui';

export { Mascota } from './chefpu';
import { Mascota } from './chefpu';

// Globo de diálogo de la mascota
export function Globo({ texto, style }) {
  return (
    <View style={[{ backgroundColor: C.blanco, borderRadius: 20, borderWidth: 1.5, borderColor: C.linea, paddingVertical: 14, paddingHorizontal: 18, flexShrink: 1 }, style]}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.texto, lineHeight: 21 }}>{texto}</Text>
    </View>
  );
}

// Lo que gana quien crea su cuenta
export function PaqueteBienvenida() {
  const items = [
    ['ribbon-outline', 'Insignia de bienvenida para Chefpu'],
    ['flash-outline', '+30 XP para empezar'],
    ['star-outline', 'Título Fundador si estás entre los primeros 1.000'],
  ];
  return (
    <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.doradoTinte }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: C.ambarOscuro, letterSpacing: 0.5 }}>REGALO AL TERMINAR EL TUTORIAL CON CHEFPU</Text>
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
    <View style={{ flex: 1, backgroundColor: C.fondo, padding: 24, gap: 16, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Mascota tam={140} />
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.texto, textAlign: 'center', letterSpacing: -0.5 }}>{titulo}</Text>
        <Text style={[s.sub, { textAlign: 'center' }]}>{texto}</Text>
      </View>
      <PaqueteBienvenida />
      <Boton titulo="Crear mi cuenta" icono="gift-outline" onPress={onCrear} />
    </View>
  );
}
