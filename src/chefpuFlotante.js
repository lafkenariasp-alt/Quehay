import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, PanResponder, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { Mascota } from './chefpu';
import { Foco } from './foco';
import { useMovimientoReducido } from './tutorial';
import { registrar } from './analitica';
import { efecto, vibrar } from './sonido';
import { Aura } from './anim';

const TAM = 72;
const CLAVE_POS = 'chefpu_pos_v1';
const CLAVE_DICHOS = 'chefpu_dichos_v1';
const ENFRIAR_MS = 8000;   // modo Normal: mínimo entre mensajes automáticos
const MAX_REPETIR = 2;     // cada mensaje automático se dice como mucho 2 veces
const DURA_MS = 6000;

// Voz de Chefpu: los mensajes que dice y las reglas de cuándo puede hablar.
export function useChefpuVoz({ silencio }) {
  const [mensaje, setMensaje] = useState(null); // { texto, cara, acciones? }
  const ultimo = useRef(0);
  const dichos = useRef({});
  const silencioRef = useRef(silencio);
  silencioRef.current = silencio;

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_DICHOS).then((v) => { if (v) dichos.current = JSON.parse(v); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!mensaje || mensaje.acciones) return undefined;
    const t = setTimeout(() => setMensaje(null), DURA_MS);
    return () => clearTimeout(t);
  }, [mensaje]);

  // clave: identifica el mensaje automático; forzar: lo pidió la persona (no cuenta límites)
  const decir = useCallback((clave, texto, cara = 'feliz', { forzar = false, acciones = null } = {}) => {
    if (!forzar) {
      if (silencioRef.current) return;
      if (Date.now() - ultimo.current < ENFRIAR_MS) return;
      const n = dichos.current[clave] || 0;
      if (n >= MAX_REPETIR) return;
      dichos.current = { ...dichos.current, [clave]: n + 1 };
      AsyncStorage.setItem(CLAVE_DICHOS, JSON.stringify(dichos.current)).catch(() => {});
    }
    ultimo.current = Date.now();
    efecto('chefpu');
    setMensaje({ texto, cara, acciones });
  }, []);

  const callar = useCallback(() => setMensaje(null), []);
  return { mensaje, decir, callar };
}

// Chefpu flotante: se arrastra, se pega al borde, se oculta y abre su menú al tocarlo.
export function ChefpuFlotante({ voz, visible, onQueCocino, onConsejo, onAmigos }) {
  const insets = useSafeAreaInsets();
  const reducido = useMovimientoReducido();
  const { width: W, height: H } = Dimensions.get('window');
  const minY = insets.top + 8;
  const maxY = H - insets.bottom - TAM - 190; // se aparta solo: nunca sobre la barra de pestañas ni los botones fijos de abajo (Ver recetas, Qué cocino)
  const xDe = (lado) => (lado === 'izq' ? 10 : W - TAM - 10);

  const [lado, setLado] = useState('der');
  const [oculto, setOculto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [listo, setListo] = useState(false);
  const pos = useRef(new Animated.ValueXY({ x: W - TAM - 10, y: H * 0.55 })).current;
  const yActual = useRef(H * 0.55);
  const rebote = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_POS).then((v) => {
      if (v) {
        const p = JSON.parse(v);
        const y = Math.min(Math.max(p.y, minY), maxY);
        setLado(p.lado); setOculto(!!p.oculto); yActual.current = y;
        pos.setValue({ x: xDe(p.lado), y });
      } else {
        pos.setValue({ x: xDe('der'), y: maxY }); yActual.current = maxY;
      }
      setListo(true);
    }).catch(() => setListo(true));
  }, []);

  const guardar = (p) => AsyncStorage.setItem(CLAVE_POS, JSON.stringify(p)).catch(() => {});

  // Cuando Chefpu tiene algo que decir y ofrece acciones, rebota una vez para llamar la atención
  useEffect(() => {
    if (!voz.mensaje?.acciones || reducido) return;
    Animated.sequence([
      Animated.timing(rebote, { toValue: 1.15, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(rebote, { toValue: 1, friction: 4, useNativeDriver: false }),
    ]).start();
  }, [voz.mensaje]);

  const inicio = useRef({ t: 0, movio: false });
  const arrastre = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      inicio.current = { t: Date.now(), movio: false };
      pos.setOffset({ x: pos.x._value, y: pos.y._value });
      pos.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (e, g) => {
      if (!inicio.current.movio && Math.abs(g.dx) + Math.abs(g.dy) > 6) {
        inicio.current.movio = true;
        setMenu(false); voz.callar();
        vibrar('seleccion');
      }
      pos.setValue({ x: g.dx, y: g.dy });
    },
    onPanResponderRelease: (e, g) => {
      pos.flattenOffset();
      if (!inicio.current.movio) { efecto('boton'); setMenu((m) => !m); voz.callar(); return; }
      const xFinal = pos.x._value, yFinal = Math.min(Math.max(pos.y._value, minY), maxY);
      const nuevo = xFinal + TAM / 2 < W / 2 ? 'izq' : 'der';
      setLado(nuevo); yActual.current = yFinal;
      Animated.timing(pos, { toValue: { x: xDe(nuevo), y: yFinal }, duration: reducido ? 0 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      guardar({ lado: nuevo, y: yFinal, oculto: false });
    },
  })).current;

  if (!visible || !listo) return null;

  const ocultar = () => { setMenu(false); setOculto(true); guardar({ lado, y: yActual.current, oculto: true }); registrar('chefpu_ocultar'); };
  const mostrar = () => { setOculto(false); guardar({ lado, y: yActual.current, oculto: false }); };

  if (oculto) {
    return (
      <Pressable onPress={mostrar} accessibilityRole="button" accessibilityLabel="Mostrar a Chefpu"
        style={{ position: 'absolute', top: yActual.current + 4, [lado === 'izq' ? 'left' : 'right']: 0, width: 22, height: 64, zIndex: 900,
          backgroundColor: C.dorado, alignItems: 'center', justifyContent: 'center',
          borderTopLeftRadius: lado === 'der' ? 14 : 0, borderBottomLeftRadius: lado === 'der' ? 14 : 0,
          borderTopRightRadius: lado === 'izq' ? 14 : 0, borderBottomRightRadius: lado === 'izq' ? 14 : 0 }}>
        <Ionicons name={lado === 'der' ? 'chevron-back' : 'chevron-forward'} size={18} color={C.texto} />
      </Pressable>
    );
  }

  // Globo o menú al lado de Chefpu, hacia el centro de la pantalla
  const anclaje = { position: 'absolute', top: Math.min(yActual.current, H - insets.bottom - 280), [lado === 'izq' ? 'left' : 'right']: TAM + 20, width: 236 };
  const m = voz.mensaje;

  return (
    <>
      {menu ? <Pressable onPress={() => setMenu(false)} accessible={false} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, zIndex: 890, backgroundColor: 'rgba(26,18,13,0.35)' }} /> : null}

      {menu ? (
        <View style={[anclaje, { width: 260, zIndex: 910, backgroundColor: C.fondo, borderRadius: 22, padding: 14, gap: 8,
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }]} accessibilityViewIsModal>
          <Pressable onPress={() => { setMenu(false); onQueCocino(); }} accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, backgroundColor: C.tomate, opacity: pressed ? 0.85 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 })}>
            <Ionicons name="search" size={20} color={C.blanco} />
            <Text style={{ color: C.blanco, fontSize: 17, fontWeight: '800' }}>¿Qué cocino?</Text>
          </Pressable>
          {[['person-add-outline', 'Buscar cocineros', () => { setMenu(false); onAmigos(); }],
            ['bulb-outline', 'Consejo de esta pantalla', () => { setMenu(false); onConsejo(); }],
            ['eye-off-outline', 'Ocultar a Chefpu', ocultar]].map(([icono, texto, fn]) => (
            <Pressable key={texto} onPress={fn} accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 48, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: C.linea, backgroundColor: pressed ? C.superficie : C.blanco })}>
              <Ionicons name={icono} size={20} color={C.suave} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.texto }}>{texto}</Text>
            </Pressable>
          ))}
        </View>
      ) : m ? (
        <Pressable onPress={m.acciones ? undefined : voz.callar} accessibilityLiveRegion="polite" accessibilityLabel={`Chefpu dice: ${m.texto}`}
          style={[anclaje, { zIndex: 910, backgroundColor: C.blanco, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1.5, borderColor: C.linea,
            shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } }]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.texto, lineHeight: 21 }}>{m.texto}</Text>
          {m.acciones ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {m.acciones.map((a, i) => (
                <Pressable key={a.texto} onPress={() => { voz.callar(); a.fn(); }} accessibilityRole="button"
                  style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: i === 0 ? C.tomate : C.blanco, borderWidth: i === 0 ? 0 : 1.5, borderColor: C.linea }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: i === 0 ? C.blanco : C.texto }}>{a.texto}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <Animated.View {...arrastre.panHandlers} style={{ position: 'absolute', left: pos.x, top: pos.y, width: TAM, height: TAM, zIndex: 920, transform: [{ scale: rebote }] }}
        accessible accessibilityRole="button" accessibilityLabel="Chefpu" accessibilityHint="Toca para ver opciones. Arrastra para moverlo."
        accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => setMenu((x) => !x)}>
        <Foco id="chefpu_flotante" style={{ width: TAM, height: TAM, borderRadius: TAM / 2,
          shadowColor: C.dorado, shadowOpacity: m ? 0.9 : 0.55, shadowRadius: m ? 18 : 12, shadowOffset: { width: 0, height: 0 } }}>
          {/* Aura de luz: halo que respira, destellos y un reflejo; se intensifica cuando tiene algo que decir */}
          <Aura tam={TAM} activo={!!m}>
            <Mascota tam={TAM - 8} expresion={m?.cara || null} />
          </Aura>
        </Foco>
      </Animated.View>
    </>
  );
}
