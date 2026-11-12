import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, Modal, Dimensions, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { Mascota } from './chefpu';
import { efecto } from './sonido';

// Movimiento de la app. Reglas: nada dura más de 300 ms salvo las celebraciones,
// y todo respeta "Reducir movimiento" del teléfono.
let reducir = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => { reducir = !!v; }).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => { reducir = !!v; });
export const movimientoReducido = () => reducir;

const SUAVE = Easing.out(Easing.cubic);
const AnimPressable = Animated.createAnimatedComponent(Pressable);

// ---------- Se encoge un poco al presionar y rebota al soltar (como la App Store) ----------
export function Presionable({ style, children, escala = 0.97, onPressIn, onPressOut, disabled, ...props }) {
  const v = useRef(new Animated.Value(1)).current;
  const a = (to) => Animated.spring(v, { toValue: to, useNativeDriver: true, speed: 40, bounciness: to === 1 ? 10 : 0 }).start();
  return (
    <AnimPressable {...props} disabled={disabled}
      onPressIn={(e) => { if (!reducir) a(escala); onPressIn?.(e); }}
      onPressOut={(e) => { a(1); onPressOut?.(e); }}
      style={[style, { transform: [{ scale: v }] }]}>
      {children}
    </AnimPressable>
  );
}

// ---------- Rebote cuando algo se activa (✓ de "lo tengo", ícono de pestaña) ----------
export function Rebote({ activo, children, style, alMontar = false }) {
  const v = useRef(new Animated.Value(1)).current;
  const antes = useRef(alMontar ? false : activo);
  useEffect(() => {
    if (activo && !antes.current && !reducir) {
      v.setValue(0.6);
      Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 14 }).start();
    }
    antes.current = activo;
  }, [activo]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

// ---------- Onda verde que llena la casilla desde el centro al marcar "lo tengo" ----------
export function OndaVerde({ activo }) {
  const v = useRef(new Animated.Value(0)).current;
  const antes = useRef(activo);
  const [viva, setViva] = useState(false);
  useEffect(() => {
    if (activo && !antes.current && !reducir) {
      setViva(true);
      v.setValue(0);
      Animated.timing(v, { toValue: 1, duration: 300, easing: SUAVE, useNativeDriver: true }).start(() => setViva(false));
    }
    antes.current = activo;
  }, [activo]);
  if (!viva) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.verde,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 2.6] }) }] }} />
    </View>
  );
}

// ---------- Corazón de Me gusta: rebota y explota en partículas (como X) ----------
const PARTICULAS = [C.tomate, C.dorado, C.verde, '#F472B6', C.tomate, C.dorado, C.verde, '#F472B6'];
export function Corazon({ activo, tam = 28 }) {
  const escala = useRef(new Animated.Value(1)).current;
  const explota = useRef(new Animated.Value(0)).current;
  const antes = useRef(activo);
  const [viva, setViva] = useState(false);
  useEffect(() => {
    if (activo && !antes.current && !reducir) {
      setViva(true);
      escala.setValue(0.3);
      explota.setValue(0);
      Animated.parallel([
        Animated.spring(escala, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 16 }),
        Animated.timing(explota, { toValue: 1, duration: 450, easing: SUAVE, useNativeDriver: true }),
      ]).start(() => setViva(false));
    }
    antes.current = activo;
  }, [activo]);
  const radio = tam * 0.95;
  return (
    <View style={{ width: tam, height: tam, alignItems: 'center', justifyContent: 'center' }}>
      {viva ? PARTICULAS.map((color, k) => {
        const ang = (k / PARTICULAS.length) * Math.PI * 2;
        return (
          <Animated.View key={k} pointerEvents="none" style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: color,
            opacity: explota.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: explota.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * radio] }) },
              { translateY: explota.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * radio] }) },
              { scale: explota.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) },
            ] }} />
        );
      }) : null}
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Ionicons name={activo ? 'heart' : 'heart-outline'} size={tam} color={C.tomate} />
      </Animated.View>
    </View>
  );
}

// ---------- Aparición en cascada: cada elemento entra un poco después del anterior ----------
export function Cascada({ i = 0, children, style }) {
  const quieto = reducir || i > 9; // solo lo que cabe en la primera pantalla
  const v = useRef(new Animated.Value(quieto ? 1 : 0)).current;
  useEffect(() => {
    if (quieto) return;
    Animated.timing(v, { toValue: 1, duration: 260, delay: i * 40, easing: SUAVE, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// ---------- Brillo que recorre las siluetas de carga (como Facebook) ----------
export function Brillo({ children, style }) {
  const v = useRef(new Animated.Value(0)).current;
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (reducir) return undefined;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, []);
  return (
    <View style={[style, { overflow: 'hidden' }]} onLayout={(e) => setAncho(e.nativeEvent.layout.width)} accessible accessibilityLabel="Cargando">
      {children}
      {ancho && !reducir ? (
        // del color del fondo: sobre los espacios no se nota, sobre las siluetas se ve como un destello
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -40, bottom: -40, width: 90, backgroundColor: C.fondo, opacity: 0.6,
          transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-120, ancho + 120] }) }, { rotate: '14deg' }] }} />
      ) : null}
    </View>
  );
}

// ---------- Aura de Chefpu: pura luz, sin color fijo ----------
// Resplandeciente: halo dorado difuso que respira.
// Brillante: destellos que aparecen y se apagan alrededor + un reflejo que cruza su cara.
// Destacado: cuando tiene algo que decir, salen ondas de luz y todo se intensifica.
const DESTELLOS = [ // posición (en proporción al tamaño), tamaño y desfase
  { x: 0.02, y: 0.06, t: 13, d: 0 }, { x: 0.86, y: -0.04, t: 16, d: 700 }, { x: 0.96, y: 0.7, t: 11, d: 1500 }, { x: -0.06, y: 0.78, t: 12, d: 2200 },
];
function useCiclo(dura, activo = true, espera = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!activo || reducir) { v.setValue(0); return undefined; }
    const a = Animated.loop(Animated.sequence([
      Animated.delay(espera),
      Animated.timing(v, { toValue: 1, duration: dura, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [activo, dura, espera]);
  return v;
}
function Destello({ x, y, t, d, tam, rapido }) {
  const v = useCiclo(rapido ? 900 : 1600, true, rapido ? d / 3 : d);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x * tam, top: y * tam,
      opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}>
      <Ionicons name="sparkles" size={t} color="#FCD34D" style={{ textShadowColor: C.dorado, textShadowRadius: 6 }} />
    </Animated.View>
  );
}
function Onda({ tam, espera }) {
  const v = useCiclo(1600, true, espera);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', width: tam, height: tam, borderRadius: tam / 2, borderWidth: 2, borderColor: '#FCD34D',
      opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.8, 0] }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }} />
  );
}
export function Aura({ tam, activo, children }) {
  const respira = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducir) { respira.setValue(0.5); return undefined; }
    const mitad = activo ? 650 : 1700;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(respira, { toValue: 1, duration: mitad, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(respira, { toValue: 0, duration: mitad, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [activo]);
  const reflejo = useCiclo(900, true, activo ? 1200 : 3600); // cruza la cara cada pocos segundos
  // halo difuso: capas de luz cada vez más grandes y más tenues
  const capas = [[1.14, 0.34], [1.3, 0.2], [1.5, 0.1]];
  return (
    <View style={{ width: tam, height: tam, alignItems: 'center', justifyContent: 'center' }}>
      {capas.map(([escala, op], k) => (
        <Animated.View key={k} pointerEvents="none" style={{ position: 'absolute', width: tam, height: tam, borderRadius: tam / 2, backgroundColor: k === 0 ? '#FCD34D' : '#FDE68A',
          opacity: respira.interpolate({ inputRange: [0, 1], outputRange: [op * (activo ? 0.9 : 0.45), op * (activo ? 1.6 : 1)] }),
          transform: [{ scale: respira.interpolate({ inputRange: [0, 1], outputRange: [escala - 0.06, escala + (activo ? 0.14 : 0.06)] }) }] }} />
      ))}
      {activo && !reducir ? <><Onda tam={tam} espera={0} /><Onda tam={tam} espera={800} /></> : null}
      <View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: C.blanco, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#FFF7DB' }}>
        {children}
        {!reducir ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -tam * 0.3, width: tam * 0.3, height: tam * 1.6, backgroundColor: '#FFFFFF',
            opacity: reflejo.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] }),
            transform: [{ translateX: reflejo.interpolate({ inputRange: [0, 1], outputRange: [-tam, tam] }) }, { rotate: '20deg' }] }} />
        ) : null}
      </View>
      {!reducir ? DESTELLOS.map((d, k) => <Destello key={k} {...d} tam={tam} rapido={activo} />) : null}
    </View>
  );
}

// ---------- "+20 XP" que sube flotando con un brillo verde claro ----------
let lanzarXP = null;
const oyentesXP = new Set();
export function mostrarXP(n) {
  if (!n || n <= 0) return;
  oyentesXP.forEach((f) => f());
  if (lanzarXP) lanzarXP(n);
}
// La pestaña Perfil se ilumina cuando llega XP
export function usePulsoXP() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const f = () => {
      if (reducir) return;
      v.setValue(0);
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(v, { toValue: 1, duration: 220, easing: SUAVE, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    };
    oyentesXP.add(f);
    return () => oyentesXP.delete(f);
  }, []);
  return v;
}
const VERDE_CLARO = '#BBF7D0';
export function XPHost() {
  const [n, setN] = useState(null);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    lanzarXP = (cant) => {
      setN(cant);
      v.setValue(0);
      Animated.timing(v, { toValue: 1, duration: reducir ? 900 : 1300, easing: SUAVE, useNativeDriver: true }).start(() => setN(null));
    };
    return () => { lanzarXP = null; };
  }, []);
  if (n === null) return null;
  const { height } = Dimensions.get('window');
  const opacidad = v.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 1, 1, 0] });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: height * 0.42, alignItems: 'center', zIndex: 950 }} accessibilityLiveRegion="polite">
      <Animated.View style={{ alignItems: 'center', justifyContent: 'center', opacity: opacidad,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [20, reducir ? 20 : -70] }) }] }}>
        {/* brillo verde claro: tres halos que se abren */}
        {[150, 108, 72].map((d, k) => (
          <Animated.View key={d} style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, backgroundColor: VERDE_CLARO, opacity: 0.22 + k * 0.14,
            transform: [{ scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 1.25] }) }] }} />
        ))}
        <Animated.Text style={{ fontSize: 34, fontWeight: '900', color: C.verdeOscuro, letterSpacing: -0.5,
          transform: [{ scale: v.interpolate({ inputRange: [0, 0.15, 0.3, 1], outputRange: [0.6, 1.2, 1, 1] }) }] }}>
          +{n} XP
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

// ---------- Celebración a pantalla completa: subir de nivel o ganar un logro ----------
let abrirCelebracion = null;
const cola = [];
// celebrar({ etiqueta: 'NUEVO NIVEL', titulo: 'Nivel 3', texto: 'Ahora eres…' })
export function celebrar(c) {
  cola.push(c);
  if (abrirCelebracion) abrirCelebracion();
}
const COLORES_CONFETI = [C.dorado, C.tomate, C.verde, '#FDE68A', '#F472B6', C.dorado];
function Confeti() {
  const { width, height } = Dimensions.get('window');
  const piezas = useRef(Array.from({ length: 28 }, (_, k) => ({
    x: Math.random() * width, giro: Math.random() * 360, dura: 1800 + Math.random() * 1400, espera: Math.random() * 500,
    tam: 7 + Math.random() * 7, color: COLORES_CONFETI[k % COLORES_CONFETI.length], deriva: (Math.random() - 0.5) * 90, v: new Animated.Value(0),
  }))).current;
  useEffect(() => {
    const anims = piezas.map((p) => Animated.loop(Animated.timing(p.v, { toValue: 1, duration: p.dura, delay: p.espera, easing: Easing.linear, useNativeDriver: true }), { iterations: 3 }));
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {piezas.map((p, k) => (
        <Animated.View key={k} style={{ position: 'absolute', left: p.x, top: -20, width: p.tam, height: p.tam * 1.6, borderRadius: 2, backgroundColor: p.color,
          transform: [
            { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
            { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.deriva] }) },
            { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: [`${p.giro}deg`, `${p.giro + 540}deg`] }) },
          ] }} />
      ))}
    </View>
  );
}
export function CelebracionHost() {
  const insets = useSafeAreaInsets();
  const [actual, setActual] = useState(null);
  const entra = useRef(new Animated.Value(0)).current;
  const siguiente = () => {
    const c = cola.shift() || null;
    setActual(c);
    if (c) {
      entra.setValue(0);
      Animated.spring(entra, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 12 }).start();
    }
  };
  const ref = useRef({ actual });
  ref.current.actual = actual;
  useEffect(() => {
    abrirCelebracion = () => { if (!ref.current.actual) siguiente(); };
    return () => { abrirCelebracion = null; };
  }, []);
  if (!actual) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={siguiente} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(42,33,28,0.86)', alignItems: 'center', justifyContent: 'center', padding: 28, paddingBottom: insets.bottom + 28 }} accessibilityViewIsModal>
        {!reducir ? <Confeti /> : null}
        <Animated.View style={{ alignItems: 'center', gap: 14, alignSelf: 'stretch', opacity: entra, transform: [{ scale: entra.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
          <View style={{ width: 190, height: 190, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: C.dorado, opacity: 0.22 }} />
            <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: C.dorado, opacity: 0.3 }} />
            <Mascota tam={140} expresion="celebrando" />
          </View>
          {actual.etiqueta ? <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 2, color: C.dorado }}>{actual.etiqueta}</Text> : null}
          <Text style={{ fontSize: 34, fontWeight: '900', color: C.blanco, textAlign: 'center', letterSpacing: -0.5 }}>{actual.titulo}</Text>
          {actual.texto ? <Text style={{ fontSize: 17, lineHeight: 24, color: '#F3EBDD', textAlign: 'center' }}>{actual.texto}</Text> : null}
          <Presionable onPress={() => { efecto('boton'); siguiente(); }} accessibilityRole="button" accessibilityLabel="Seguir"
            style={{ alignSelf: 'stretch', minHeight: 56, borderRadius: 18, backgroundColor: C.dorado, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.texto }}>¡Seguir!</Text>
          </Presionable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------- Título chico y fijo que aparece al bajar (como Notas o Mail) ----------
export function useTituloFijo(titulo) {
  const y = useRef(new Animated.Value(0)).current;
  const alScroll = (e) => y.setValue(e.nativeEvent.contentOffset.y);
  const barra = titulo ? (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44, zIndex: 5, alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.fondo, borderBottomWidth: 1, borderBottomColor: C.linea, paddingHorizontal: 60,
      opacity: y.interpolate({ inputRange: [44, 84], outputRange: [0, 1], extrapolate: 'clamp' }) }}>
      <Animated.Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '800', color: C.texto,
        transform: [{ translateY: y.interpolate({ inputRange: [44, 84], outputRange: [8, 0], extrapolate: 'clamp' }) }] }}>{titulo}</Animated.Text>
    </Animated.View>
  ) : null;
  return { y, alScroll, barra };
}

// ---------- Balanceo suave (objeto que acompaña a Chefpu en las pantallas vacías) ----------
export function Balanceo({ children, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducir) return undefined;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View style={[style, { transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
      { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) },
    ] }]}>{children}</Animated.View>
  );
}
