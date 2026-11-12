import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView, Image, Switch, RefreshControl, Animated, PanResponder, Modal, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from './theme';
import { Mascota } from './chefpu';
import { ScrollCtx } from './foco';
import { efecto } from './sonido';
import { Presionable, Rebote, OndaVerde, Brillo, Balanceo, useTituloFijo } from './anim';

// ---------- Tocar la pestaña activa: vuelve arriba ----------
export const PestanaCtx = React.createContext(null); // id de la pestaña donde vive la pantalla
const arriba = {}; // id de pestaña -> función que sube la lista
export function subirArriba(id) { const fn = arriba[id]; if (fn) fn(); return !!fn; }
// Registra el ScrollView o FlatList principal de la pantalla
export function useVolverArriba(ref) {
  const id = React.useContext(PestanaCtx);
  React.useEffect(() => {
    if (!id) return undefined;
    const fn = () => {
      const r = ref.current;
      if (!r) return;
      if (r.scrollToOffset) r.scrollToOffset({ offset: 0, animated: true });
      else if (r.scrollTo) r.scrollTo({ y: 0, animated: true });
    };
    arriba[id] = fn;
    return () => { if (arriba[id] === fn) delete arriba[id]; };
  }, [id]);
}

// Deslizar hacia abajo para actualizar: maneja el "girando" solo
export function useRefrescar(onRefrescar) {
  const [girando, setGirando] = React.useState(false);
  const refrescar = React.useCallback(async () => {
    if (!onRefrescar) return;
    setGirando(true);
    try { await onRefrescar(); } finally { setGirando(false); }
  }, [onRefrescar]);
  return onRefrescar ? <RefreshControl refreshing={girando} onRefresh={refrescar} tintColor={C.tomate} colors={[C.tomate]} /> : undefined;
}

// Posición del scroll de la pantalla (Animated.Value): la usa la foto elástica de la receta
export const ScrollYCtx = React.createContext(null);

export function Pantalla({ children, scroll = true, pie = null, onRefrescar, tituloFijo }) {
  const ref = React.useRef(null);
  const fijo = useTituloFijo(tituloFijo);
  const offset = React.useRef(0);
  const ctx = React.useMemo(() => ({ ref, offset }), []);
  useVolverArriba(ref);
  const refreshControl = useRefrescar(onRefrescar);
  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      {scroll ? (
        <ScrollCtx.Provider value={ctx}>
          <ScrollYCtx.Provider value={fijo.y}>
          <ScrollView
            ref={ref}
            onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; fijo.alScroll(e); }}
            scrollEventThrottle={16}
            contentContainerStyle={s.contenido}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets // iPhone: desplaza para que el teclado no tape el campo que escribes
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
          </ScrollYCtx.Provider>
          {fijo.barra}
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
    <Presionable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!(deshabilitado || cargando), busy: !!cargando }}
      style={[
        s.boton,
        { backgroundColor: estilos.bg, borderColor: estilos.borde, opacity: deshabilitado ? 0.5 : 1 },
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
    </Presionable>
  );
}

export function Chip({ texto, activo, onPress, icono }) {
  return (
    <Presionable escala={0.94}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ selected: !!activo }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={[s.chip, activo && { backgroundColor: C.tomate }]}
    >
      {icono ? <Ionicons name={icono} size={15} color={activo ? C.blanco : C.texto} /> : null}
      <Text style={[s.chipTexto, activo && { color: C.blanco }]}>{texto}</Text>
    </Presionable>
  );
}

// Casilla de inventario (estilo taller de Dofus)
export function Casilla({ nombre, estado = 'tengo', detalle, onPress, onLongPress, ancho = '23%', emoji }) {
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
    <Presionable escala={0.94}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress || onLongPress ? 'button' : 'text'}
      accessibilityLabel={etiqueta}
      accessibilityState={estado === 'vacia_nombre' || (estado === 'tengo' && onPress) ? { selected: estado === 'tengo' } : undefined}
      accessibilityHint={onLongPress ? 'Mantén presionado para más opciones' : undefined}
      style={[s.casilla, { width: ancho, overflow: 'hidden', backgroundColor: e.bg, borderColor: e.borde, borderStyle: e.estilo, borderWidth: estado === 'tengo' || estado === 'vence' ? 2 : 1.5 }]}
    >
      <OndaVerde activo={estado === 'tengo'} />
      {estado === 'vacia' ? (
        <Ionicons name="add" size={22} color={e.fg} />
      ) : (
        <>
          {emoji ? <Text style={{ fontSize: 24 }} maxFontSizeMultiplier={1.2} accessible={false}>{emoji}</Text> : null}
          <Text style={[s.casillaTexto, { color: e.fg }]} numberOfLines={emoji ? 2 : 3} maxFontSizeMultiplier={1.6}>{nombre}</Text>
          {detalle ? <Text style={[s.casillaDetalle, { color: e.fg }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>{detalle}</Text> : null}
          {estado === 'tengo' && onPress ? (
            <Rebote activo alMontar style={{ position: 'absolute', top: 4, right: 4 }}>
              <Ionicons name="checkmark-circle" size={18} color={C.verde} />
            </Rebote>
          ) : null}
        </>
      )}
    </Presionable>
  );
}

export function Grilla({ children }) {
  return <View style={s.grilla}>{children}</View>;
}

export function Tarjeta({ children, style, onPress }) {
  if (!onPress) return <View style={[s.tarjeta, style]}>{children}</View>;
  return (
    <Presionable onPress={onPress} accessibilityRole="button" style={[s.tarjeta, style]}>
      {children}
    </Presionable>
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

// Pantalla vacía: siempre dice qué hacer y trae el botón para hacerlo
// objeto: ícono que acompaña a Chefpu (lupa, carrito, marcador…) para que cada pantalla vacía se vea distinta
export function Vacio({ texto, titulo, accion, expresion = 'pensando', objeto }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
      <View>
        <Mascota tam={96} expresion={expresion} />
        {objeto ? (
          <Balanceo style={{ position: 'absolute', right: -22, top: -6, width: 44, height: 44, borderRadius: 22, backgroundColor: C.blanco, borderWidth: 2, borderColor: C.dorado, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={objeto} size={22} color={C.tomate} />
          </Balanceo>
        ) : null}
      </View>
      {titulo ? <Text style={[s.etiqueta, { textAlign: 'center', fontSize: 17 }]}>{titulo}</Text> : null}
      {texto ? <Text style={[s.sub, { textAlign: 'center', fontSize: 15 }]}>{texto}</Text> : null}
      {accion ? <Boton titulo={accion.titulo} icono={accion.icono} tipo={accion.tipo || 'principal'} onPress={accion.onPress} style={{ alignSelf: 'stretch', marginTop: 6 }} /> : null}
    </View>
  );
}

// ---------- Esqueletos de carga (como Instagram) ----------
export function Hueso({ ancho = '100%', alto = 14, radio = 8, style }) {
  return <View style={[{ width: ancho, height: alto, borderRadius: radio, backgroundColor: '#E9DCCB' }, style]} />;
}
// tipo: 'tarjetas' (lista de recetas) | 'fotos' (comunidad) | 'receta' | 'perfil'
export function Esqueleto({ tipo = 'tarjetas', n = 4 }) {
  let cuerpo;
  if (tipo === 'fotos') {
    cuerpo = Array.from({ length: Math.min(n, 3) }, (_, k) => (
      <View key={k} style={{ gap: 10 }}>
        <View style={s.fila}><Hueso ancho={40} alto={40} radio={20} /><Hueso ancho="45%" /></View>
        <Hueso alto={260} radio={18} />
        <Hueso ancho="70%" />
      </View>
    ));
  } else if (tipo === 'receta') {
    cuerpo = (
      <>
        <Hueso alto={220} radio={18} />
        <Hueso ancho="80%" alto={30} />
        <Hueso ancho="50%" />
        <View style={s.fila}><Hueso ancho="48%" alto={56} radio={18} /><Hueso ancho="48%" alto={56} radio={18} /></View>
        {[0, 1, 2, 3, 4].map((k) => <Hueso key={k} ancho={`${90 - k * 8}%`} />)}
      </>
    );
  } else if (tipo === 'perfil') {
    cuerpo = (
      <>
        <View style={[s.fila, { gap: 14 }]}><Hueso ancho={84} alto={84} radio={42} /><View style={{ flex: 1, gap: 8 }}><Hueso ancho="60%" alto={22} /><Hueso ancho="40%" /></View></View>
        <Hueso alto={90} radio={18} />
        <View style={s.fila}>{[0, 1, 2].map((k) => <Hueso key={k} ancho="31%" alto={70} radio={16} />)}</View>
        <Hueso alto={120} radio={18} />
      </>
    );
  } else {
    cuerpo = Array.from({ length: n }, (_, k) => (
      <View key={k} style={[s.tarjetaReceta, { borderWidth: 1.5, borderColor: C.linea }]}>
        <Hueso ancho={76} alto={76} radio={14} />
        <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}><Hueso ancho="75%" alto={16} /><Hueso ancho="45%" alto={12} /><Hueso ancho={90} alto={22} radio={999} /></View>
      </View>
    ));
  }
  return (
    <Brillo style={{ gap: 16 }}>
      {cuerpo}
    </Brillo>
  );
}

// ---------- Aviso con "Deshacer" (5 segundos, como Gmail) ----------
let mostrarAviso = null;
let avisoPendiente = null;
// avisar({ texto, onDeshacer, alConfirmar }): la acción se confirma al terminar el tiempo
export function avisar(a) {
  if (avisoPendiente) { const p = avisoPendiente; avisoPendiente = null; p.alConfirmar?.(); }
  avisoPendiente = a;
  if (mostrarAviso) mostrarAviso(a);
  else { avisoPendiente = null; a.alConfirmar?.(); }
}
export function AvisoHost({ abajo = 80 }) {
  const insets = useSafeAreaInsets();
  const [aviso, setAviso] = React.useState(null);
  const y = React.useRef(new Animated.Value(120)).current;
  const timer = React.useRef(null);
  const cerrar = React.useCallback((confirmar) => {
    clearTimeout(timer.current);
    const a = avisoPendiente;
    avisoPendiente = null;
    if (a && confirmar) a.alConfirmar?.();
    Animated.timing(y, { toValue: 120, duration: 180, useNativeDriver: true }).start(() => setAviso(null));
  }, []);
  React.useEffect(() => {
    mostrarAviso = (a) => {
      clearTimeout(timer.current);
      setAviso(a);
      y.setValue(120);
      Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
      timer.current = setTimeout(() => cerrar(true), a.duracion || 5000);
    };
    return () => { mostrarAviso = null; clearTimeout(timer.current); };
  }, []);
  if (!aviso) return null;
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + abajo, transform: [{ translateY: y }] }}>
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingLeft: 16, paddingRight: 6, borderRadius: 16, backgroundColor: C.texto }}>
        <Text style={{ flex: 1, color: C.blanco, fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{aviso.texto}</Text>
        {aviso.onDeshacer ? (
          <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Deshacer"
            onPress={() => { const a = avisoPendiente; avisoPendiente = null; efecto('boton'); a?.onDeshacer?.(); cerrar(false); }}
            style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text style={{ color: '#FFB199', fontSize: 15, fontWeight: '800' }}>Deshacer</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ---------- Doble toque con corazón (Me gusta, como Instagram) ----------
export function DobleToque({ onDoble, onSimple, children, style }) {
  const ultimo = React.useRef(0);
  const espera = React.useRef(null);
  const escala = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => () => clearTimeout(espera.current), []);
  function tocar() {
    const ahora = Date.now();
    if (ahora - ultimo.current < 280) {
      clearTimeout(espera.current);
      ultimo.current = 0;
      escala.setValue(0);
      Animated.sequence([
        Animated.spring(escala, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }),
        Animated.delay(350),
        Animated.timing(escala, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      onDoble?.();
      return;
    }
    ultimo.current = ahora;
    if (onSimple) { clearTimeout(espera.current); espera.current = setTimeout(() => { ultimo.current = 0; onSimple(); }, 280); }
  }
  return (
    <Pressable onPress={tocar} style={style} accessibilityHint="Toca dos veces para Me gusta"
      accessibilityActions={[{ name: 'activate' }, { name: 'magicTap', label: 'Me gusta' }]}
      onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'magicTap') onDoble?.(); else (onSimple || onDoble)?.(); }}>
      {children}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: escala, transform: [{ scale: escala }] }}>
        <Ionicons name="heart" size={96} color={C.blanco} style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 12 }} />
      </Animated.View>
    </Pressable>
  );
}

// ---------- Fila que se desliza a la izquierda para quitar (como Mail) ----------
export function FilaDeslizable({ children, onQuitar, textoQuitar = 'Quitar', etiqueta, onActivar, textoActivar }) {
  const x = React.useRef(new Animated.Value(0)).current;
  const abierto = React.useRef(false);
  const ANCHO = 92;
  const ir = (v) => { abierto.current = v !== 0; Animated.spring(x, { toValue: v, useNativeDriver: true, speed: 22, bounciness: 0 }).start(); };
  const quitar = () => {
    Animated.timing(x, { toValue: -Dimensions.get('window').width, duration: 180, useNativeDriver: true }).start(() => { onQuitar(); x.setValue(0); abierto.current = false; });
  };
  const pan = React.useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => { x.setValue(Math.min(0, (abierto.current ? -ANCHO : 0) + g.dx)); },
    onPanResponderRelease: (_, g) => {
      const fin = (abierto.current ? -ANCHO : 0) + g.dx;
      if (fin < -Dimensions.get('window').width * 0.5) quitar();
      else if (fin < -ANCHO / 2 || g.vx < -0.6) ir(-ANCHO);
      else ir(0);
    },
    onPanResponderTerminate: () => ir(0),
  })).current;
  return (
    <View style={{ overflow: 'hidden', borderRadius: 14 }}
      accessible accessibilityLabel={etiqueta} accessibilityHint={textoActivar}
      accessibilityActions={[...(onActivar ? [{ name: 'activate', label: textoActivar }] : []), { name: 'quitar', label: textoQuitar }]}
      onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'quitar') onQuitar(); else if (e.nativeEvent.actionName === 'activate') onActivar?.(); }}>
      <Pressable onPress={quitar} accessibilityRole="button" accessibilityLabel={textoQuitar}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: ANCHO, backgroundColor: C.tomate, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Ionicons name="trash-outline" size={20} color={C.blanco} />
        <Text style={{ color: C.blanco, fontWeight: '800', fontSize: 13 }}>{textoQuitar}</Text>
      </Pressable>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }], backgroundColor: C.blanco }}>
        <Pressable onPress={() => { if (abierto.current) ir(0); }}>{children}</Pressable>
      </Animated.View>
    </View>
  );
}

// ---------- Fotos a pantalla completa, deslizables ----------
export function VisorFotos({ fotos = [], inicio = 0, visible, onCerrar }) {
  const { width, height } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const [i, setI] = React.useState(inicio);
  React.useEffect(() => { if (visible) setI(inicio); }, [visible, inicio]);
  const y = React.useRef(new Animated.Value(0)).current;
  const pan = React.useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
    onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 1) Animated.timing(y, { toValue: height, duration: 180, useNativeDriver: true }).start(() => { y.setValue(0); onCerrar(); });
      else Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;
  if (!visible) return null;
  const fondo = y.interpolate({ inputRange: [0, 300], outputRange: [1, 0.3], extrapolate: 'clamp' });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: '#000', opacity: fondo }} />
      <Animated.View {...pan.panHandlers} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transform: [{ translateY: y }] }}>
        <FlatList
          data={fotos}
          horizontal
          pagingEnabled
          initialScrollIndex={Math.min(inicio, Math.max(fotos.length - 1, 0))}
          getItemLayout={(_, k) => ({ length: width, offset: width * k, index: k })}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
          keyExtractor={(f, k) => `${k}-${f.url}`}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ width, height, justifyContent: 'center' }}>
              <Image source={{ uri: item.url }} style={{ width, height: height * 0.75 }} resizeMode="contain" accessibilityLabel={item.texto || 'Foto'} />
            </View>
          )}
        />
      </Animated.View>
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: C.blanco, fontWeight: '800', fontSize: 15 }}>{fotos.length > 1 ? `${i + 1} de ${fotos.length}` : ''}</Text>
        <Pressable onPress={onCerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={26} color={C.blanco} />
        </Pressable>
      </View>
      {fotos[i]?.texto ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24 }}>
          <Text style={{ color: C.blanco, fontSize: 15, fontWeight: '600' }} numberOfLines={4}>{fotos[i].texto}</Text>
        </View>
      ) : null}
    </Modal>
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
  const [rota, setRota] = React.useState(false); // si la foto no carga, se muestra el ícono
  const borde = estado === 'ya' ? C.verde : estado === 'falta' ? C.ambar : C.linea;
  return (
    <Presionable onPress={onPress} accessibilityRole="button" accessibilityLabel={[titulo, meta, detalle].filter(Boolean).join(', ')}
      style={[s.tarjetaReceta, { borderColor: borde, borderWidth: estado ? 2 : 1.5 }]}>
      {foto && !rota ? (
        <Image source={{ uri: foto }} onError={() => setRota(true)} style={s.tarjetaRecetaFoto} />
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
    </Presionable>
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
