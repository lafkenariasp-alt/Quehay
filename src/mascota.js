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
