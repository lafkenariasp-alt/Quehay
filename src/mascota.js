import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './theme';
import { Boton, s } from './ui';

// Mascota PROVISIONAL: una neverita con ojos. Se reemplaza cuando elijamos el diseño final.
export function Mascota({ tam = 96, accesorio = null }) {
  const ancho = tam * 0.74;
  const borde = Math.max(2, Math.round(tam / 32));
  const ojo = tam * 0.17;
  return (
    <View style={{ width: ancho, height: tam }} accessibilityLabel="Mascota de Qué Hay">
      <View style={{ flex: 1, borderRadius: tam * 0.16, backgroundColor: C.blanco, borderWidth: borde, borderColor: C.tomate, overflow: 'hidden' }}>
        <View style={{ height: tam * 0.32, backgroundColor: C.tomateTinte, borderBottomWidth: borde, borderBottomColor: C.tomate }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tam * 0.05 }}>
          <View style={{ flexDirection: 'row', gap: tam * 0.12 }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ width: ojo, height: ojo, borderRadius: ojo / 2, backgroundColor: C.texto, alignItems: 'flex-end' }}>
                <View style={{ width: ojo * 0.38, height: ojo * 0.38, borderRadius: ojo, backgroundColor: C.blanco, margin: ojo * 0.12 }} />
              </View>
            ))}
          </View>
          <View style={{ width: tam * 0.2, height: tam * 0.1, borderBottomLeftRadius: tam * 0.1, borderBottomRightRadius: tam * 0.1, backgroundColor: C.tomate }} />
        </View>
      </View>
      {/* manilla */}
      <View style={{ position: 'absolute', right: tam * 0.06, top: tam * 0.1, width: borde + 1, height: tam * 0.12, borderRadius: 2, backgroundColor: C.tomate }} />
      {accesorio === 'delantal_bienvenida' ? (
        <View style={{ position: 'absolute', bottom: -tam * 0.04, alignSelf: 'center', width: ancho * 0.62, height: tam * 0.26, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: tam * 0.08, borderBottomRightRadius: tam * 0.08, backgroundColor: C.dorado, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="restaurant" size={tam * 0.12} color={C.texto} />
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
        <Mascota tam={110} />
        <Text style={[s.titulo, { textAlign: 'center' }]}>{titulo}</Text>
        <Text style={[s.sub, { textAlign: 'center', fontSize: 15 }]}>{texto}</Text>
      </View>
      <PaqueteBienvenida />
      <Boton titulo="Crear mi cuenta" icono="gift-outline" onPress={onCrear} />
    </View>
  );
}
