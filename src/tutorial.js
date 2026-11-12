import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing, AccessibilityInfo, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from './contexto';
import { C } from './theme';
import { Boton, s } from './ui';
import { Mascota } from './chefpu';
import { Foco, focos } from './foco';
import { GUION, LINEA_REGALO, CAPITULOS } from './guion';
import { registrar } from './analitica';

// ---------- Estado del tutorial (guardado en el teléfono) ----------
const CLAVE = 'tutorial_v2';
const INICIAL = { iniciado: false, linea: 0, cuenta: 0, completado: false, saltado: false, regaloPendiente: false, ofrecido: false };

export function useTutorialEstado() {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE).then((v) => {
      let e = v ? { ...INICIAL, ...JSON.parse(v) } : INICIAL;
      // Si la app se cerró a mitad de la historia, la pausamos y Chefpu ofrecerá retomarla
      if (e.iniciado && !e.saltado && e.linea < GUION.length) {
        e = e.completado ? { ...e, linea: GUION.length, regaloPendiente: false } : { ...e, saltado: true, ofrecido: false };
      }
      setEstado(e);
    }).catch(() => setEstado(INICIAL));
  }, []);

  const cambiar = useCallback((fn) => {
    setEstado((e) => {
      const n = fn(e || INICIAL);
      if (n !== e) AsyncStorage.setItem(CLAVE, JSON.stringify(n)).catch(() => {});
      return n;
    });
  }, []);

  const avanzarDe = (e) => {
    const linea = e.linea + 1;
    registrar('tutorial_linea', { linea });
    return { ...e, linea, cuenta: 0 };
  };

  const iniciar = useCallback(() => cambiar((e) => (e.iniciado && !e.saltado && e.linea < GUION.length ? e : { ...INICIAL, iniciado: true, ofrecido: true })), [cambiar]);
  const reiniciar = useCallback(() => cambiar(() => ({ ...INICIAL, ofrecido: true })), [cambiar]);
  const avanzar = useCallback(() => cambiar((e) => avanzarDe(e)), [cambiar]);
  const saltar = useCallback(() => cambiar((e) => {
    registrar('tutorial_saltado', { linea: e.linea });
    return { ...e, saltado: true, regaloPendiente: false };
  }), [cambiar]);
  const marcarOfrecido = useCallback(() => cambiar((e) => ({ ...e, ofrecido: true })), [cambiar]);

  // Algo pasó en la app; si la línea actual lo esperaba, la historia avanza
  const evento = useCallback((nombre) => cambiar((e) => {
    if (!e.iniciado || e.saltado || e.linea >= GUION.length) return e;
    if (nombre === 'termine' && !e.completado) {
      registrar('tutorial_completado');
      return { ...e, completado: true, regaloPendiente: true, linea: LINEA_REGALO, cuenta: 0 };
    }
    if (nombre === 'regalo_cerrado') {
      const n = { ...e, regaloPendiente: false };
      return e.linea === LINEA_REGALO ? avanzarDe(n) : n;
    }
    const esp = GUION[e.linea].esperar;
    if (!esp || esp.evento !== nombre) return e;
    const cuenta = e.cuenta + 1;
    return cuenta >= (esp.veces || 1) ? avanzarDe(e) : { ...e, cuenta };
  }), [cambiar]);

  const activo = !!estado && estado.iniciado && !estado.saltado && estado.linea < GUION.length;
  return {
    estado, activo, linea: activo ? GUION[estado.linea] : null, indice: estado?.linea ?? 0,
    iniciar, reiniciar, avanzar, saltar, evento, marcarOfrecido,
  };
}

// ---------- Capa del tutorial: foco iluminado, resto oscuro y borroso ----------
function Panel({ style, onPress }) {
  return (
    <Pressable onPress={onPress} style={[{ position: 'absolute', overflow: 'hidden' }, style]} accessible={false}>
      <BlurView intensity={18} tint="dark" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(24,16,12,0.58)' }} />
    </Pressable>
  );
}

export function useMovimientoReducido() {
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setR);
    return () => sub?.remove?.();
  }, []);
  return r;
}

export function TutorialCapa({ capa = 'raiz' }) {
  const { tutorial } = useApp();
  const insets = useSafeAreaInsets();
  const reducido = useMovimientoReducido();
  const linea = tutorial?.linea;
  const indice = tutorial?.indice;
  const mia = !!linea && (linea.capa || 'raiz') === capa;
  const objetivo = mia ? (linea.foco || linea.en) : null;
  const [, refrescar] = useState(0);
  const [letras, setLetras] = useState(0);
  const pulso = useRef(new Animated.Value(0)).current;
  const aparece = useRef(new Animated.Value(0)).current;

  // Seguir la posición real del elemento (cambia con el scroll o al cargar)
  useEffect(() => focos.suscribir(() => refrescar((n) => n + 1)), []);
  useEffect(() => {
    if (!objetivo) return undefined;
    if (linea.foco) focos.asegurarVisible(linea.foco);
    const t1 = setTimeout(() => focos.medir(objetivo), 380);
    const t2 = setInterval(() => focos.medir(objetivo), 500);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, [objetivo, indice]);

  // Líneas opcionales: si su elemento no está en esta pantalla, se saltan
  useEffect(() => {
    if (!mia || !linea.opcional) return undefined;
    const t = setTimeout(() => {
      if (!focos.existe(linea.foco) && focos.existe(linea.junto)) tutorial.avanzar();
    }, 700);
    return () => clearTimeout(t);
  }, [mia, indice]);

  // Texto que se escribe solo (1 segundo máximo)
  useEffect(() => {
    if (!mia) return undefined;
    const total = linea.texto.length;
    aparece.setValue(reducido ? 1 : 0);
    if (!reducido) Animated.timing(aparece, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (reducido) { setLetras(total); return undefined; }
    setLetras(0);
    const paso = Math.max(1, Math.ceil(total / 40));
    const t = setInterval(() => setLetras((n) => { if (n + paso >= total) { clearInterval(t); return total; } return n + paso; }), 25);
    return () => clearInterval(t);
  }, [mia, indice, reducido]);

  // El foco late suave para llamar la atención
  useEffect(() => {
    if (reducido) { pulso.setValue(0.5); return undefined; }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulso, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulso, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [reducido]);

  if (!mia || !focos.existe(objetivo)) return null;
  const rect = linea.foco ? focos.rect(linea.foco) : null;
  if (linea.foco && !rect) return null;

  const { width: W, height: H } = Dimensions.get('window');
  const escribiendo = letras < linea.texto.length;
  const sigue = !linea.esperar;
  const tocar = () => { if (escribiendo) setLetras(linea.texto.length); else if (sigue) tutorial.avanzar(); };
  const saltar = () => Alert.alert('¿Saltar el tutorial?', 'Puedes retomarlo cuando quieras desde tu perfil.', [
    { text: 'Seguir con Chefpu', style: 'cancel' },
    { text: 'Saltar', style: 'destructive', onPress: tutorial.saltar },
  ]);

  const m = 8; // aire alrededor del foco
  const hueco = rect ? { x: Math.max(0, rect.x - m), y: Math.max(0, rect.y - m), w: Math.min(W, rect.w + 2 * m), h: rect.h + 2 * m } : null;
  const arriba = hueco ? hueco.y + hueco.h / 2 > H * 0.5 : false; // Chefpu va arriba del foco si este está abajo
  const posNarrador = hueco
    ? (arriba ? { bottom: H - hueco.y + 12 } : { top: hueco.y + hueco.h + 12 })
    : { bottom: insets.bottom + 40 };

  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, zIndex: 1000, elevation: 1000 }} pointerEvents="box-none">
      {hueco ? (
        <>
          <Panel onPress={tocar} style={{ left: 0, top: 0, width: W, height: hueco.y }} />
          <Panel onPress={tocar} style={{ left: 0, top: hueco.y + hueco.h, width: W, height: Math.max(0, H - hueco.y - hueco.h) }} />
          <Panel onPress={tocar} style={{ left: 0, top: hueco.y, width: hueco.x, height: hueco.h }} />
          <Panel onPress={tocar} style={{ left: hueco.x + hueco.w, top: hueco.y, width: Math.max(0, W - hueco.x - hueco.w), height: hueco.h }} />
          {/* borde dorado que late; si la línea no pide tocarlo, tocar el foco también avanza */}
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: hueco.x, top: hueco.y, width: hueco.w, height: hueco.h, borderRadius: 16, borderWidth: 3, borderColor: C.dorado,
            opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }} />
          {sigue ? <Pressable onPress={tocar} accessible={false} style={{ position: 'absolute', left: hueco.x, top: hueco.y, width: hueco.w, height: hueco.h }} /> : null}
        </>
      ) : (
        <Panel onPress={tocar} style={{ left: 0, top: 0, width: W, height: H }} />
      )}

      {/* Progreso (4 cucharas) y saltar */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 6, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`Capítulo ${Math.min(linea.cap, CAPITULOS)} de ${CAPITULOS}`}>
          {Array.from({ length: CAPITULOS }, (_, i) => (
            <Ionicons key={i} name={i < linea.cap ? 'restaurant' : 'restaurant-outline'} size={20} color={i < linea.cap ? C.dorado : 'rgba(255,255,255,0.6)'} />
          ))}
        </View>
        <Pressable onPress={saltar} accessibilityRole="button" hitSlop={10} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
          <Text style={{ color: C.blanco, fontWeight: '800', fontSize: 14 }}>Saltar tutorial</Text>
        </Pressable>
      </View>

      {/* Chefpu narra */}
      <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 10, opacity: aparece,
        transform: [{ translateY: aparece.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }, posNarrador]}>
        <Mascota tam={hueco ? 76 : 120} expresion={linea.cara} />
        <Pressable onPress={tocar} accessibilityRole="button" accessibilityLiveRegion="polite"
          accessibilityLabel={`Chefpu: ${linea.texto}${sigue ? '. Toca para seguir' : ''}`}
          style={{ flex: 1, backgroundColor: C.blanco, borderRadius: 18, padding: 14, gap: 6, borderWidth: 2, borderColor: C.dorado }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.texto, lineHeight: 22 }}>{linea.texto.slice(0, letras)}</Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: C.ambarOscuro, alignSelf: 'flex-end' }}>
            {escribiendo ? ' ' : sigue ? 'Toca para seguir ▸' : 'Toca lo que brilla'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ---------- Celebración final con el regalo ----------
export function RegaloTutorial() {
  const { tutorial, invitado, nav } = useApp();
  // al cerrar, volvemos a las pestañas para que Chefpu presente su lugar y la nevera
  const cerrar = () => { tutorial.evento('regalo_cerrado'); nav.irA(invitado ? 'buscar' : 'nevera'); };
  const pendiente = !!tutorial?.estado?.regaloPendiente;
  const [visible, setVisible] = useState(false);
  const escala = useRef(new Animated.Value(0.94)).current;
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pendiente) { setVisible(false); return undefined; }
    // espera a que se cierre el modo cocina (iOS no muestra dos modales a la vez)
    const t = setTimeout(() => setVisible(true), 450);
    return () => clearTimeout(t);
  }, [pendiente]);

  useEffect(() => {
    if (!visible) return;
    AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      escala.setValue(reducir ? 1 : 0.94);
      opacidad.setValue(0);
      Animated.parallel([
        Animated.timing(opacidad, { toValue: 1, duration: reducir ? 150 : 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1, duration: reducir ? 0 : 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }).catch(() => { escala.setValue(1); opacidad.setValue(1); });
  }, [visible]);

  if (!pendiente) return null;
  const premios = [
    ['ribbon-outline', 'Insignia de bienvenida para Chefpu'],
    ['flash-outline', '+30 XP para empezar'],
    ['star-outline', 'Título Fundador (primeros 1.000)'],
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(42,33,28,0.55)', justifyContent: 'center', padding: 24 }}>
        <Animated.View style={{ opacity: opacidad, transform: [{ scale: escala }], maxWidth: 440, width: '100%', alignSelf: 'center' }} accessibilityViewIsModal>
          <Foco id="regalo" style={{ backgroundColor: C.fondo, borderRadius: 28, padding: 24, gap: 16, alignItems: 'center' }}>
            <Mascota tam={150} expresion="celebrando" />
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.texto, textAlign: 'center' }} accessibilityRole="header">¡Tutorial completado!</Text>
            <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.doradoTinte, alignSelf: 'stretch' }}>
              {premios.map(([icono, texto]) => (
                <View key={texto} style={s.fila}>
                  <Ionicons name={icono} size={20} color={C.ambarOscuro} />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.texto }}>{texto}</Text>
                </View>
              ))}
            </View>
            <Text style={[s.sub, { textAlign: 'center' }]}>{invitado ? 'Queda guardado en este teléfono. Si algún día creas tu cuenta, se suma a tu perfil.' : 'Ya está en tu perfil.'}</Text>
            <Boton titulo="¡A cocinar!" icono="restaurant-outline" onPress={cerrar} style={{ alignSelf: 'stretch' }} />
          </Foco>
        </Animated.View>
        <TutorialCapa capa="regalo" />
      </View>
    </Modal>
  );
}
