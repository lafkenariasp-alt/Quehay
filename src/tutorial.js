import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from './contexto';
import { C } from './theme';
import { Boton, s } from './ui';
import { Mascota } from './mascota';
import { registrar } from './analitica';

// Tutorial guiado por Chefpu (beta: no pide cuenta al final, pero entrega el regalo).
// Hitos en orden; "hecho" es el índice del último cumplido (-1 = nada).
export const HITOS = ['ingredientes', 'abrio_receta', 'paso_a_paso', 'termino'];
export const TOTAL_PASOS = HITOS.length;
const CLAVE = 'tutorial_v1';
const INICIAL = { iniciado: false, hecho: -1, completado: false, saltado: false, regaloPendiente: false };

export function useTutorialEstado() {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((v) => setEstado(v ? { ...INICIAL, ...JSON.parse(v) } : INICIAL))
      .catch(() => setEstado(INICIAL));
  }, []);

  const cambiar = useCallback((fn) => {
    setEstado((e) => {
      const n = fn(e || INICIAL);
      if (n !== e) AsyncStorage.setItem(CLAVE, JSON.stringify(n)).catch(() => {});
      return n;
    });
  }, []);

  const iniciar = useCallback(() => cambiar((e) => (e.iniciado ? e : { ...e, iniciado: true })), [cambiar]);

  const marcar = useCallback((hito) => cambiar((e) => {
    const i = HITOS.indexOf(hito);
    if (!e.iniciado || e.completado || e.saltado || i !== e.hecho + 1) return e;
    registrar('tutorial_paso', { hito, paso: i + 1 });
    if (hito === 'termino') return { ...e, hecho: i, completado: true, regaloPendiente: true };
    return { ...e, hecho: i };
  }), [cambiar]);

  const saltar = useCallback(() => cambiar((e) => {
    if (e.completado || e.saltado) return e;
    registrar('tutorial_saltado', { hecho: e.hecho + 1 });
    return { ...e, saltado: true };
  }), [cambiar]);

  const reiniciar = useCallback(() => cambiar(() => ({ ...INICIAL })), [cambiar]);

  const cerrarRegalo = useCallback(() => cambiar((e) => ({ ...e, regaloPendiente: false })), [cambiar]);

  const activo = !!estado && estado.iniciado && !estado.completado && !estado.saltado;
  return { estado, activo, iniciar, marcar, saltar, reiniciar, cerrarRegalo, ganoRegalo: !!estado?.completado };
}

const TEXTOS = {
  abrio_receta: '¡Mira tus recetas! Verde = lo tienes, ámbar = te falta. Toca la que más te tinque.',
  paso_a_paso: 'Esta es la receta. Toca «Paso a paso» abajo y la cocinamos juntos.',
  termino: 'Avanza con «Siguiente». Cuando llegues al final, toca «¡Terminé!» y te doy tu regalo.',
};

// Tarjeta de Chefpu que dice qué hacer en esta pantalla. Solo aparece si este es el siguiente paso.
export function GuiaTutorial({ siguiente }) {
  const { tutorial } = useApp();
  if (!tutorial?.activo) return null;
  const i = HITOS.indexOf(siguiente);
  if (i !== tutorial.estado.hecho + 1) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: C.blanco, borderWidth: 2, borderColor: C.dorado }}
      accessibilityLiveRegion="polite">
      <Mascota tam={56} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: C.ambarOscuro, letterSpacing: 0.5 }}>TUTORIAL · PASO {i + 1} DE {TOTAL_PASOS}</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.texto, lineHeight: 21 }}>{TEXTOS[siguiente]}</Text>
        <Pressable onPress={tutorial.saltar} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.suave, textDecorationLine: 'underline' }}>Saltar tutorial</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Celebración final: entra suave (escala desde 0,94, 280 ms, ease-out); sin movimiento si el sistema pide reducirlo
export function RegaloTutorial() {
  const { tutorial, invitado } = useApp();
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
    ['shirt-outline', 'Delantal para Chefpu'],
    ['flash-outline', '+30 XP para empezar'],
    ['ribbon-outline', 'Insignia de Fundador (primeros 1.000)'],
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={tutorial.cerrarRegalo}>
      <View style={{ flex: 1, backgroundColor: 'rgba(42,33,28,0.55)', justifyContent: 'center', padding: 24 }}>
        <Animated.View style={{ opacity: opacidad, transform: [{ scale: escala }], backgroundColor: C.fondo, borderRadius: 28, padding: 24, gap: 16, alignItems: 'center', maxWidth: 440, width: '100%', alignSelf: 'center' }}
          accessibilityViewIsModal>
          <Mascota tam={120} accesorio="delantal_bienvenida" />
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.texto, textAlign: 'center' }} accessibilityRole="header">¡Tutorial completado!</Text>
          <Text style={[s.sub, { fontSize: 15, textAlign: 'center' }]}>Ya sabes usar Qué Hay. Chefpu te dejó un regalo:</Text>
          <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.doradoTinte, alignSelf: 'stretch' }}>
            {premios.map(([icono, texto]) => (
              <View key={texto} style={s.fila}>
                <Ionicons name={icono} size={20} color={C.ambarOscuro} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.texto }}>{texto}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.sub, { textAlign: 'center' }]}>{invitado ? 'Queda guardado en este teléfono. Si algún día creas tu cuenta, se suma a tu perfil.' : 'Ya está en tu perfil.'}</Text>
          <Boton titulo="¡A cocinar!" icono="restaurant-outline" onPress={() => { registrar('tutorial_regalo_cerrado'); tutorial.cerrarRegalo(); }} style={{ alignSelf: 'stretch' }} />
        </Animated.View>
      </View>
    </Modal>
  );
}
