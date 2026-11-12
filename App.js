import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Keyboard, Platform, Animated, Easing, PanResponder, Dimensions, BackHandler, AccessibilityInfo } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './src/supabase';
import { AppCtx } from './src/contexto';
import { C } from './src/theme';
import { Cargando } from './src/ui';
import { registrar, leerIngredientesInvitado, borrarIngredientesInvitado } from './src/analitica';
import Bienvenida from './src/pantallas/Bienvenida';
import { useTutorialEstado, RegaloTutorial, TutorialCapa } from './src/tutorial';
import { ChefpuFlotante, useChefpuVoz } from './src/chefpuFlotante';
import { Foco } from './src/foco';
import Acceso from './src/pantallas/Acceso';
import Nevera from './src/pantallas/Nevera';
import Buscar from './src/pantallas/Buscar';
import Resultados from './src/pantallas/Resultados';
import Receta from './src/pantallas/Receta';
import Publicar from './src/pantallas/Publicar';
import Perfil from './src/pantallas/Perfil';
import Usuarios from './src/pantallas/Usuarios';
import PerfilPublico from './src/pantallas/PerfilPublico';

const PESTANAS = [
  { id: 'nevera', nombre: 'Nevera', icono: 'file-tray-stacked-outline', comp: Nevera },
  { id: 'buscar', nombre: 'Buscar', icono: 'search', comp: Buscar },
  { id: 'publicar', nombre: 'Publicar', icono: 'add-circle-outline', comp: Publicar },
  { id: 'perfil', nombre: 'Perfil', icono: 'person-outline', comp: Perfil },
];
// El tutorial también se puede repetir desde el perfil
function TutorialRepetido() {
  const { nav } = React.useContext(AppCtx);
  return <Bienvenida repetir onTerminar={(d) => { nav.volver(); if (d) setTimeout(() => nav.abrir(d.pantalla, d.params), 0); }} />;
}
const PANTALLAS = { tutorial: TutorialRepetido, resultados: Resultados, receta: Receta, usuarios: Usuarios, perfilPublico: PerfilPublico, acceso: Acceso };
const CLAVE_BIENVENIDA = 'bienvenida_v1';

// Navegación propia, sin librerías: las pantallas entran desde la derecha (como en iOS)
// y se vuelve deslizando desde el borde izquierdo o con el botón Volver.
function PantallaApilada({ entrada, esTope, registrarSalida, alSalir }) {
  const insets = useSafeAreaInsets();
  const W = Dimensions.get('window').width;
  const x = useRef(new Animated.Value(W)).current;
  const Comp = PANTALLAS[entrada.pantalla];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      Animated.timing(x, { toValue: 0, duration: reducir ? 0 : 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }).catch(() => x.setValue(0));
    registrarSalida(entrada.key, () => {
      Animated.timing(x, { toValue: W, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => alSalir(entrada.key));
    });
    return () => registrarSalida(entrada.key, null);
  }, []);

  // Borde izquierdo: arrastrar hacia la derecha para volver
  const gesto = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (e, g) => x.setValue(Math.max(0, g.dx)),
    onPanResponderRelease: (e, g) => {
      if (g.dx > W * 0.33 || g.vx > 0.6) {
        Animated.timing(x, { toValue: W, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => alSalir(entrada.key));
      } else {
        Animated.spring(x, { toValue: 0, friction: 9, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, friction: 9, useNativeDriver: true }).start(),
  })).current;

  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, paddingTop: insets.top, backgroundColor: C.fondo, transform: [{ translateX: x }],
      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: -2, height: 0 } }}
      importantForAccessibility={esTope ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={!esTope}>
      {Comp ? <Comp {...(entrada.params || {})} /> : null}
      {esTope ? <View {...gesto.panHandlers} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 24 }} /> : null}
    </Animated.View>
  );
}

// Pestañas: quedan montadas para no perder lo escrito; la barra se esconde con el teclado
function Inicio({ pestana, visitadas, uid, teclado, irA, enfocada }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.fondo }}>
      <View style={{ flex: 1 }}>
        {PESTANAS.map((p) => {
          if (!visitadas[p.id]) return null;
          const visible = p.id === pestana;
          const Comp = p.comp;
          return (
            <View key={`${p.id}-${uid || 'invitado'}`} style={{ flex: 1, display: visible ? 'flex' : 'none' }}>
              <Comp activa={visible && enfocada} />
            </View>
          );
        })}
      </View>
      {!teclado ? (
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.linea, backgroundColor: C.fondo, paddingBottom: Math.max(insets.bottom, 10), paddingTop: 6 }}>
          {PESTANAS.map((p) => {
            const activa = p.id === pestana;
            return (
              <Foco key={p.id} id={`tab_${p.id}`} style={{ flex: 1 }}>
                <Pressable onPress={() => irA(p.id)} style={{ flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' }}
                  accessibilityRole="tab" accessibilityLabel={p.nombre} accessibilityState={{ selected: activa }}>
                  <Ionicons name={p.icono} size={24} color={activa ? C.tomate : C.suave} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: activa ? C.tomate : C.suave }} maxFontSizeMultiplier={1.4}>{p.nombre}</Text>
                </Pressable>
              </Foco>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Contenido() {
  const insets = useSafeAreaInsets();
  const [sesion, setSesion] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [bienvenidaVista, setBienvenidaVista] = useState(null); // null = leyendo
  const [pestana, setPestana] = useState('buscar');
  const tutorial = useTutorialEstado();
  const [pila, setPila] = useState([]); // pantallas abiertas encima de las pestañas
  const pilaRef = useRef([]);
  pilaRef.current = pila;
  const salidas = useRef({});
  const [visitadas, setVisitadas] = useState({ buscar: true }); // pestañas que quedan vivas (no pierden lo escrito)
  const [teclado, setTeclado] = useState(false);
  const [altoTeclado, setAltoTeclado] = useState(0); // con el teclado abierto escondemos las pestañas
  const voz = useChefpuVoz({ silencio: teclado || tutorial.activo });

  useEffect(() => {
    const mostrar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => { setTeclado(true); setAltoTeclado(e.endCoordinates?.height || 0); });
    const ocultar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setTeclado(false));
    return () => { mostrar.remove(); ocultar.remove(); };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_BIENVENIDA).then((v) => setBienvenidaVista(!!v)).catch(() => setBienvenidaVista(true));
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      if (data.session) { setPestana('nevera'); setVisitadas({ nevera: true }); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (evento, nueva) => {
      setSesion(nueva);
      if (evento === 'SIGNED_IN' && nueva) {
        // Lo que eligió como invitado pasa a su nevera
        const ingredientes = await leerIngredientesInvitado();
        if (ingredientes.length) {
          await supabase.from('nevera').upsert(
            ingredientes.map((i) => ({ usuario_id: nueva.user.id, ingrediente_id: i.id })),
            { onConflict: 'usuario_id,ingrediente_id', ignoreDuplicates: true },
          );
          await borrarIngredientesInvitado();
        }
        registrar('sesion_iniciada', { traspaso: ingredientes.length }, nueva.user.id);
        setPila([]); setPestana('nevera'); setVisitadas({ nevera: true });
      }
      if (evento === 'SIGNED_OUT') { setPila([]); setPestana('buscar'); setVisitadas({ buscar: true }); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const recargarPerfil = useCallback(async () => {
    if (!sesion) { setPerfil(null); return; }
    const { data } = await supabase.from('perfiles_publicos').select('*').eq('id', sesion.user.id).maybeSingle();
    setPerfil(data);
  }, [sesion]);

  useEffect(() => { recargarPerfil(); }, [recargarPerfil]);

  const nav = useMemo(() => ({
    abrir: (pantalla, params = {}) => setPila((p) => [...p, { pantalla, params, key: `${pantalla}-${Date.now()}-${Math.random()}` }]),
    volver: () => {
      const tope = pilaRef.current[pilaRef.current.length - 1];
      if (!tope) return;
      const salir = salidas.current[tope.key];
      if (salir) salir(); else setPila((p) => p.slice(0, -1));
    },
    irA: (id) => { setPila([]); setPestana(id); setVisitadas((v) => ({ ...v, [id]: true })); },
  }), []);

  // Android: el botón atrás cierra la pantalla de arriba
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!pilaRef.current.length) return false;
      nav.volver();
      return true;
    });
    return () => sub.remove();
  }, [nav]);

  // Para invitados: abre el registro explicando qué gana con la cuenta
  const pedirCuenta = useCallback((motivo) => {
    registrar('pedir_cuenta', { motivo });
    nav.abrir('acceso', { motivo });
  }, [nav]);

  async function terminarBienvenida(destino) {
    try { await AsyncStorage.setItem(CLAVE_BIENVENIDA, '1'); } catch (e) { /* sin acción */ }
    setBienvenidaVista(true);
    if (destino) nav.abrir(destino.pantalla, destino.params);
  }

  const uidActual = sesion?.user?.id || null;

  // Chefpu ofrece el tutorial a quien no lo ha visto (usuarios que ya tenían la app)
  const enApp = sesion !== undefined && bienvenidaVista !== null && !!tutorial.estado && (uidActual || bienvenidaVista);
  useEffect(() => {
    if (!enApp || tutorial.activo) return undefined;
    const e = tutorial.estado;
    if (e.ofrecido || (e.iniciado && !e.saltado)) return undefined;
    const t = setTimeout(() => {
      tutorial.marcarOfrecido();
      voz.decir('oferta', e.saltado ? '¿Seguimos con el tutorial? Te muestro todo en 2 minutos.' : '¿Te muestro cómo funciona Qué Hay? Son 2 minutos.', 'feliz', {
        forzar: true,
        acciones: [{ texto: '¡Vamos!', fn: () => { tutorial.reiniciar(); nav.abrir('tutorial'); } }, { texto: 'Ahora no', fn: () => {} }],
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [enApp, tutorial.activo, tutorial.estado?.ofrecido]);

  // Menú de Chefpu: la opción principal busca con lo que tienes
  const queCocino = useCallback(async () => {
    registrar('chefpu_que_cocino', {}, uidActual);
    let ids = [];
    if (uidActual) {
      const { data } = await supabase.from('nevera').select('ingrediente_id').eq('usuario_id', uidActual);
      ids = (data || []).map((d) => d.ingrediente_id);
    } else {
      ids = (await leerIngredientesInvitado()).map((i) => i.id);
    }
    if (!ids.length) {
      voz.decir('sin_ingredientes', uidActual ? 'Tu nevera está vacía. Agrega lo que tienes y te digo qué cocinar.' : 'Primero dime qué tienes: elige unos ingredientes aquí.', 'pensando', { forzar: true });
      nav.irA(uidActual ? 'nevera' : 'buscar');
      return;
    }
    nav.abrir('resultados', { tengo: ids, titulo: 'Lo que puedes cocinar' });
  }, [uidActual, nav, voz.decir]);

  const consejo = useCallback(() => {
    const ruta = pilaRef.current[pilaRef.current.length - 1]?.pantalla;
    const donde = ruta || pestana;
    const CONSEJOS = {
      nevera: 'Anota lo que compras y te digo qué cocinar. Mantén presionado un alimento para quitarlo.',
      buscar: 'Elige lo que tienes y toca Ver recetas. Con 3 o más ingredientes salen muchas más.',
      publicar: 'Sube tu receta con foto y gana 50 XP. Elige los ingredientes del catálogo.',
      perfil: 'Aquí ves tu nivel, tus logros y tus recetas. Cocina y publica para subir.',
      resultados: 'Verde es lo que tienes, ámbar lo que te falta. Arriba están las que puedes cocinar ya.',
      receta: 'Toca Paso a paso para cocinar conmigo. Si la cocinas, sube tu foto en Lo cociné.',
      usuarios: 'Busca a tus amigos por su nick y síguelos para ver sus recetas.',
      perfilPublico: 'Si te gustan sus recetas, síguelo. Si ves algo raro, repórtalo con la banderita.',
      acceso: 'Con una cuenta guardo tu nevera, tus recetas y tu XP.',
      tutorial: 'Toca lo que tengas y vemos qué cocinar.',
    };
    voz.decir('consejo', CONSEJOS[donde] || '¡Estoy aquí para ayudarte a cocinar!', 'feliz', { forzar: true });
  }, [pestana, voz.decir]);

  if (sesion === undefined || bienvenidaVista === null || !tutorial.estado) return <Cargando />;

  const uid = uidActual;
  const chefpu = { decir: voz.decir };
  const ctx = { sesion, uid, invitado: !uid, perfil, recargarPerfil, nav, pedirCuenta, tutorial, chefpu };
  const verFlotante = !teclado && (!tutorial.activo || (tutorial.linea?.cap === 5 && !tutorial.linea?.capa));

  if (!uid && !bienvenidaVista) {
    return (
      <AppCtx.Provider value={ctx}>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: C.fondo }}>
          <Bienvenida onTerminar={terminarBienvenida} />
        </View>
        <TutorialCapa />
      </AppCtx.Provider>
    );
  }

  return (
    <AppCtx.Provider value={ctx}>
      <View style={{ flex: 1, backgroundColor: C.fondo }}>
        <Inicio pestana={pestana} visitadas={visitadas} uid={uid} teclado={teclado} irA={nav.irA} enfocada={!pila.length} />
        {pila.map((e, i) => (
          <PantallaApilada key={e.key} entrada={e} esTope={i === pila.length - 1}
            registrarSalida={(k, fn) => { if (fn) salidas.current[k] = fn; else delete salidas.current[k]; }}
            alSalir={(k) => setPila((p) => p.filter((x) => x.key !== k))} />
        ))}
      </View>
      <ChefpuFlotante voz={voz} visible={verFlotante} onQueCocino={queCocino} onConsejo={consejo} />
      <TutorialCapa />
      <RegaloTutorial />
      {teclado ? (
        <Pressable onPress={() => Keyboard.dismiss()} accessibilityRole="button" accessibilityLabel="Cerrar teclado"
          style={{ position: 'absolute', right: 12, bottom: (Platform.OS === 'ios' ? altoTeclado : 0) + 8, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.texto }}>
          <Ionicons name="chevron-down" size={18} color={C.blanco} />
          <Text style={{ color: C.blanco, fontWeight: '800', fontSize: 13 }}>Cerrar teclado</Text>
        </Pressable>
      ) : null}
    </AppCtx.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Contenido />
    </SafeAreaProvider>
  );
}
