import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './theme';

export function Pantalla({ children, scroll = true, pie = null }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={s.contenido}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets // iPhone: desplaza para que el teclado no tape el campo que escribes
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[s.contenido, { flex: 1 }]}>{children}</View>
      )}
      {pie ? <View style={s.pie}>{pie}</View> : null}
    </View>
  );
}

export function Encabezado({ titulo, sub, onVolver, derecha }) {
  return (
    <View style={s.encabezado}>
      {onVolver ? (
        <Pressable onPress={onVolver} hitSlop={10} style={s.volver} accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={26} color={C.texto} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={s.titulo}>{titulo}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
      {derecha}
    </View>
  );
}

export function Seccion({ titulo, color = C.texto, derecha, children }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={s.filaEntre}>
        <Text style={[s.seccion, { color }]}>{titulo}</Text>
        {derecha}
      </View>
      {children}
    </View>
  );
}

export function Boton({ titulo, onPress, tipo = 'principal', icono, cargando, deshabilitado, style }) {
  const estilos = {
    principal: { bg: C.tomate, fg: C.blanco, borde: C.tomate },
    secundario: { bg: C.blanco, fg: C.tomate, borde: C.tomate },
    neutro: { bg: C.blanco, fg: C.texto, borde: C.linea },
  }[tipo];
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      style={({ pressed }) => [
        s.boton,
        { backgroundColor: estilos.bg, borderColor: estilos.borde, opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={estilos.fg} />
      ) : (
        <>
          {icono ? <Ionicons name={icono} size={18} color={estilos.fg} /> : null}
          <Text style={[s.botonTexto, { color: estilos.fg }]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ texto, activo, onPress, icono }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, activo && { backgroundColor: C.tomateTinte, borderColor: C.tomate }]}
    >
      {icono ? <Ionicons name={icono} size={14} color={activo ? C.tomateOscuro : C.texto} /> : null}
      <Text style={[s.chipTexto, activo && { color: C.tomateOscuro }]}>{texto}</Text>
    </Pressable>
  );
}

// Casilla de inventario (estilo taller de Dofus)
export function Casilla({ nombre, estado = 'tengo', detalle, onPress, onLongPress, ancho = '23%' }) {
  const e = {
    tengo: { bg: C.verdeTinte, borde: C.verde, fg: C.verdeOscuro, estilo: 'solid' },
    falta: { bg: C.ambarTinte, borde: C.ambar, fg: C.ambarOscuro, estilo: 'dashed' },
    vence: { bg: C.ambarTinte, borde: C.ambar, fg: C.ambarOscuro, estilo: 'solid' },
    vacia: { bg: C.blanco, borde: '#CBBBA5', fg: C.suave, estilo: 'dashed' },
  }[estado];
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[s.casilla, { width: ancho, backgroundColor: e.bg, borderColor: e.borde, borderStyle: e.estilo }]}
    >
      {estado === 'vacia' ? (
        <Ionicons name="add" size={22} color={e.fg} />
      ) : (
        <>
          <Text style={[s.casillaTexto, { color: e.fg }]} numberOfLines={2}>{nombre}</Text>
          {detalle ? <Text style={[s.casillaDetalle, { color: e.fg }]} numberOfLines={1}>{detalle}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export function Grilla({ children }) {
  return <View style={s.grilla}>{children}</View>;
}

export function Tarjeta({ children, style, onPress }) {
  const Comp = onPress ? Pressable : View;
  return <Comp onPress={onPress} style={[s.tarjeta, style]}>{children}</Comp>;
}

export function Estrellas({ valor = 0, tam = 14, onCambiar }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={!onCambiar} onPress={() => onCambiar && onCambiar(n)} hitSlop={4}>
          <Ionicons name={n <= Math.round(valor) ? 'star' : 'star-outline'} size={tam} color={C.dorado} />
        </Pressable>
      ))}
    </View>
  );
}

export function Vacio({ icono = 'restaurant-outline', texto }) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 32 }}>
      <Ionicons name={icono} size={40} color="#B9A68E" />
      <Text style={[s.sub, { textAlign: 'center' }]}>{texto}</Text>
    </View>
  );
}

export function Cargando() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.fondo }}>
      <ActivityIndicator color={C.tomate} size="large" />
    </View>
  );
}

export const s = StyleSheet.create({
  contenido: { padding: 20, gap: 20, paddingBottom: 32 },
  pie: { padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.linea, backgroundColor: C.fondo },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  volver: { width: 36, height: 44, justifyContent: 'center', marginLeft: -8 },
  titulo: { fontSize: 26, fontWeight: '700', color: C.texto },
  sub: { fontSize: 13, fontWeight: '600', color: C.suave },
  seccion: { fontSize: 19, fontWeight: '700' },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boton: { minHeight: 52, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  botonTexto: { fontSize: 16, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.linea, backgroundColor: C.blanco },
  chipTexto: { fontSize: 13, fontWeight: '700', color: C.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  casilla: { height: 68, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, gap: 2 },
  casillaTexto: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  casillaDetalle: { fontSize: 11, fontWeight: '600' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tarjeta: { backgroundColor: C.blanco, borderRadius: 18, borderWidth: 1, borderColor: C.linea, padding: 14, gap: 10 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: C.linea, backgroundColor: C.blanco, paddingHorizontal: 14, fontSize: 15, color: C.texto },
  etiqueta: { fontSize: 14, fontWeight: '800', color: C.texto },
});
