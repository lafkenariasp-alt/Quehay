import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView, Image, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './theme';
import { Mascota } from './chefpu';
import { ScrollCtx } from './foco';
import { efecto } from './sonido';

export function Pantalla({ children, scroll = true, pie = null }) {
  const ref = React.useRef(null);
  const offset = React.useRef(0);
  const ctx = React.useMemo(() => ({ ref, offset }), []);
  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      {scroll ? (
        <ScrollCtx.Provider value={ctx}>
          <ScrollView
            ref={ref}
            onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={32}
            contentContainerStyle={s.contenido}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets // iPhone: desplaza para que el teclado no tape el campo que escribes
          >
            {children}
          </ScrollView>
        </ScrollCtx.Provider>
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
        <Pressable onPress={onVolver} hitSlop={10} style={s.volver} accessibilityRole="button" accessibilityLabel="Volver">
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
    verde: { bg: C.verde, fg: C.blanco, borde: C.verde },
  }[tipo];
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!(deshabilitado || cargando), busy: !!cargando }}
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
          {icono ? <Ionicons name={icono} size={20} color={estilos.fg} /> : null}
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
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ selected: !!activo }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={[s.chip, activo && { backgroundColor: C.tomate }]}
    >
      {icono ? <Ionicons name={icono} size={15} color={activo ? C.blanco : C.texto} /> : null}
      <Text style={[s.chipTexto, activo && { color: C.blanco }]}>{texto}</Text>
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
    vacia_nombre: { bg: C.blanco, borde: C.linea, fg: C.texto, estilo: 'solid' }, // opción sin elegir
  }[estado];
  const dice = { tengo: 'lo tienes', falta: 'te falta', vence: 'por vencer', vacia: '', vacia_nombre: 'no lo tienes' }[estado];
  const etiqueta = estado === 'vacia' ? 'Agregar ingrediente' : [nombre, dice, detalle].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress || onLongPress ? 'button' : 'text'}
      accessibilityLabel={etiqueta}
      accessibilityState={estado === 'vacia_nombre' || (estado === 'tengo' && onPress) ? { selected: estado === 'tengo' } : undefined}
      accessibilityHint={onLongPress ? 'Mantén presionado para más opciones' : undefined}
      style={({ pressed }) => [s.casilla, { width: ancho, backgroundColor: e.bg, borderColor: e.borde, borderStyle: e.estilo, borderWidth: estado === 'tengo' || estado === 'vence' ? 2 : 1.5, opacity: pressed ? 0.8 : 1 }]}
    >
      {estado === 'vacia' ? (
        <Ionicons name="add" size={22} color={e.fg} />
      ) : (
        <>
          <Text style={[s.casillaTexto, { color: e.fg }]} numberOfLines={3} maxFontSizeMultiplier={1.6}>{nombre}</Text>
          {detalle ? <Text style={[s.casillaDetalle, { color: e.fg }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>{detalle}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export function Grilla({ children }) {
  return <View style={s.grilla}>{children}</View>;
}

export function Tarjeta({ children, style, onPress }) {
  if (!onPress) return <View style={[s.tarjeta, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [s.tarjeta, style, pressed && { opacity: 0.9 }]}>
      {children}
    </Pressable>
  );
}

export function Estrellas({ valor = 0, tam = 14, onCambiar }) {
  const n = Math.round(valor);
  // Solo lectura: VoiceOver lee "Nota 4 de 5" una vez, no cinco íconos
  if (!onCambiar) {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }} accessible accessibilityLabel={`Nota ${n} de 5`}>
        {[1, 2, 3, 4, 5].map((k) => (
          <Ionicons key={k} name={k <= n ? 'star' : 'star-outline'} size={tam} color={C.estrella} />
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="radiogroup" accessibilityLabel="Tu nota">
      {[1, 2, 3, 4, 5].map((k) => (
        <Pressable key={k} onPress={() => onCambiar(k)} hitSlop={6}
          accessibilityRole="radio" accessibilityLabel={`${k} ${k === 1 ? 'estrella' : 'estrellas'}`} accessibilityState={{ checked: k === n }}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={k <= n ? 'star' : 'star-outline'} size={Math.max(tam, 28)} color={C.estrella} />
        </Pressable>
      ))}
    </View>
  );
}

export function Avatar({ url, nombre = '?', tam = 44, borde = C.linea }) {
  const iniciales = nombre.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const base = { width: tam, height: tam, borderRadius: tam / 2, borderWidth: tam > 60 ? 3 : 1, borderColor: borde, backgroundColor: C.superficie };
  return url ? (
    <Image source={{ uri: url }} style={base} />
  ) : (
    <View style={[base, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: tam * 0.34, fontWeight: '800', color: C.tomateOscuro }}>{iniciales}</Text>
    </View>
  );
}

export function Vacio({ icono = 'restaurant-outline', texto }) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 32 }}>
      <Mascota tam={96} expresion="pensando" />
      <Text style={[s.sub, { textAlign: 'center', fontSize: 15 }]}>{texto}</Text>
    </View>
  );
}

// Cuando algo no carga: mensaje claro y botón para reintentar
export function ErrorCarga({ mensaje, onReintentar, onVolver }) {
  React.useEffect(() => { efecto('error'); }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: C.fondo }}>
      <Mascota tam={120} expresion="triste" />
      <Text style={[s.etiqueta, { textAlign: 'center', fontSize: 17 }]}>No pudimos cargar esto</Text>
      <Text style={[s.sub, { textAlign: 'center' }]}>{mensaje || 'Revisa tu conexión a internet e intenta de nuevo.'}</Text>
      <Boton titulo="Reintentar" icono="refresh" onPress={onReintentar} style={{ alignSelf: 'stretch' }} />
      {onVolver ? <Boton tipo="neutro" titulo="Volver" onPress={onVolver} style={{ alignSelf: 'stretch' }} /> : null}
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

// Tarjeta de receta del lienzo: foto a la izquierda, datos y estado a la derecha.
// estado: 'ya' (verde, tienes todo) | 'falta' (ámbar) | null
export function TarjetaReceta({ titulo, foto, meta, estado = null, detalle, abajo, onPress }) {
  const borde = estado === 'ya' ? C.verde : estado === 'falta' ? C.ambar : C.linea;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={[titulo, meta, detalle].filter(Boolean).join(', ')}
      style={({ pressed }) => [s.tarjetaReceta, { borderColor: borde, borderWidth: estado ? 2 : 1.5, opacity: pressed ? 0.9 : 1 }]}>
      {foto ? (
        <Image source={{ uri: foto }} style={s.tarjetaRecetaFoto} />
      ) : (
        <View style={[s.tarjetaRecetaFoto, { alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="restaurant-outline" size={26} color="#B9A68E" />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: C.texto }}>{titulo}</Text>
        {meta ? <Text style={{ fontSize: 13, color: C.suave }}>{meta}</Text> : null}
        {abajo}
        {estado === 'ya' ? <Pastilla texto={detalle || 'Tienes todo'} fondo={C.verdeTinte} color={C.verde} icono="checkmark" /> : null}
        {estado === 'falta' ? <Pastilla texto={detalle || 'Te falta 1'} fondo={C.ambarTinte} color={C.ambarOscuro} /> : null}
      </View>
    </Pressable>
  );
}

export function Pastilla({ texto, fondo = C.doradoTinte, color = C.ambarOscuro, icono }) {
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: fondo }}>
      {icono ? <Ionicons name={icono} size={13} color={color} /> : null}
      <Text style={{ fontSize: 12, fontWeight: '800', color }}>{texto}</Text>
    </View>
  );
}

// Fila de interruptor del lienzo: texto (y explicación) a la izquierda, switch a la derecha
export function Interruptor({ texto, sub, valor, onCambiar, icono }) {
  return (
    <View style={[s.fila, { gap: 12, minHeight: 44 }]}>
      {icono ? <Ionicons name={icono} size={20} color={C.texto} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.texto }}>{texto}</Text>
        {sub ? <Text style={{ fontSize: 13, color: C.suave }}>{sub}</Text> : null}
      </View>
      <Switch value={valor} onValueChange={onCambiar} trackColor={{ true: C.verde, false: '#B5A694' }} accessibilityLabel={texto} />
    </View>
  );
}

export const s = StyleSheet.create({
  contenido: { padding: 24, gap: 16, paddingBottom: 32 },
  pie: { padding: 16, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: C.linea, backgroundColor: C.fondo },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  volver: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  titulo: { fontSize: 32, fontWeight: '800', color: C.texto, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: C.suave },
  seccion: { fontSize: 18, fontWeight: '800' },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boton: { minHeight: 56, borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  botonTexto: { fontSize: 17, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.superficie },
  chipTexto: { fontSize: 14, fontWeight: '700', color: C.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  casilla: { minHeight: 68, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, gap: 2 },
  casillaTexto: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  casillaDetalle: { fontSize: 12, fontWeight: '600' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tarjeta: { backgroundColor: C.blanco, borderRadius: 18, borderWidth: 1.5, borderColor: C.linea, padding: 16, gap: 10 },
  tarjetaReceta: { flexDirection: 'row', gap: 14, padding: 12, borderRadius: 18, backgroundColor: C.blanco },
  tarjetaRecetaFoto: { width: 76, height: 76, borderRadius: 14, backgroundColor: C.superficie },
  input: { minHeight: 56, borderRadius: 16, borderWidth: 1.5, borderColor: C.linea, backgroundColor: C.blanco, paddingHorizontal: 16, fontSize: 16, color: C.texto },
  etiqueta: { fontSize: 15, fontWeight: '800', color: C.texto },
});
