import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Keyboard, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef, StackActions, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import { prepararSonidos, efecto } from './src/sonido';
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
const PANTALLAS = { amigos: Usuarios, tutorial: TutorialRepetido, resultados: Resultados, receta: Receta, usuarios: Usuarios, perfilPublico: PerfilPublico, acceso: Acceso };
const CLAVE_BIENVENIDA = 'bienvenida_v1';
const CLAVE_TUVO_CUENTA = 'tuvo_cuenta_v1'; // en este teléfono ya se entró con una cuenta
const MINUTOS_CUENTA_NUEVA = 15;
const esCuentaNueva = (user) => !!user?.created_at && Date.now() - Date.parse(user.created_at) < MINUTOS_CUENTA_NUEVA * 60000;

// Navegación nativa de iOS: transición de empuje y volver deslizando desde el borde izquierdo
const Pila = createNativeStackNavigator();
const navRef = createNavigationContainerRef();

function alInicio() {
  if (navRef.isReady() && navRef.canGoBack()) navRef.dispatch(StackActions.popToTop());
}

// Cada pantalla recibe sus parámetros como props y respeta el notch
function conBordes(Comp) {
  return function PantallaApilada({ route }) {
    const insets = useSafeAreaInsets();
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.fondo }}>
        <Comp {...(route.params || {})} />
      </View>
    );
  };
}
const TEMA = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: C.tomate, background: C.fondo, card: C.fondo, text: C.texto, border: C.linea, notification: C.tomate } };
const APILADAS = Object.fromEntries(Object.entries(PANTALLAS).map(([k, Comp]) => [k, conBordes(Comp)]));

// Pestañas: quedan montadas para no perder lo escrito; la barra se esconde con el teclado
function Inicio({ pestana, visitadas, uid, teclado, irA }) {
  const insets = useSafeAreaInsets();
  const enfocada = useIsFocused();
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
  const [tuvoCuenta, setTuvoCuenta] = useState(null); // null = leyendo
  const [pestana, setPestana] = useState('buscar');
  const heredarTutorial = useRef(false);
  const cuentaNueva = useRef(null); // uid de la cuenta recién creada: su tutorial parte solo
  const yaCargo = useRef(false);
  const tutorial = useTutorialEstado(sesion?.user?.id || null, heredarTutorial);
  const pendiente = useRef(null); // pantalla a abrir apenas la navegación esté lista
  const [visitadas, setVisitadas] = useState({ buscar: true }); // pestañas que quedan vivas (no pierden lo escrito)
  const [teclado, setTeclado] = useState(false);
  const [altoTeclado, setAltoTeclado] = useState(0); // con el teclado abierto escondemos las pestañas
  const voz = useChefpuVoz({ silencio: teclado || tutorial.activo });
  useEffect(() => { prepararSonidos(); }, []);

  // Subir de nivel: fanfarria, vibración y Chefpu celebra
  const nivelAnterior = useRef(null);
  useEffect(() => {
    const n = perfil?.nivel;
    if (!n) return;
    if (nivelAnterior.current && n > nivelAnterior.current) {
      efecto('nivel');
      setTimeout(() => voz.decir(`nivel_${n}`, `¡Subiste a nivel ${n}! Ahora eres ${perfil.titulo}.`, 'celebrando', { forzar: true }), 900);
    }
    nivelAnterior.current = n;
  }, [perfil?.nivel]);

  useEffect(() => {
    const mostrar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => { setTeclado(true); setAltoTeclado(e.endCoordinates?.height || 0); });
    const ocultar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setTeclado(false));
    return () => { mostrar.remove(); ocultar.remove(); };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_BIENVENIDA).then((v) => setBienvenidaVista(!!v)).catch(() => setBienvenidaVista(true));
    const marcarCuenta = () => { setTuvoCuenta(true); AsyncStorage.setItem(CLAVE_TUVO_CUENTA, '1').catch(() => {}); };
    Promise.all([
      AsyncStorage.getItem(CLAVE_TUVO_CUENTA).catch(() => null),
      supabase.auth.getSession(),
    ]).then(([tuvo, { data }]) => {
      setTuvoCuenta(!!tuvo || !!data.session);
      if (data.session) { heredarTutorial.current = true; marcarCuenta(); setSesion(data.session); setPestana('nevera'); setVisitadas({ nevera: true }); } else setSesion(null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (evento, nueva) => {
      if (evento === 'SIGNED_IN' && nueva) {
        // La primera cuenta del teléfono se queda con el tutorial que hizo como invitado
        const tuvo = await AsyncStorage.getItem(CLAVE_TUVO_CUENTA).catch(() => null);
        heredarTutorial.current = !tuvo;
        if (esCuentaNueva(nueva.user)) cuentaNueva.current = nueva.user.id;
        marcarCuenta();
      }
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
        alInicio(); setPestana('nevera'); setVisitadas({ nevera: true });
      }
      if (evento === 'SIGNED_OUT') { alInicio(); setPestana('buscar'); setVisitadas({ buscar: true }); }
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
    abrir: (pantalla, params = {}) => {
      if (navRef.isReady()) navRef.dispatch(StackActions.push(pantalla, params));
      else pendiente.current = { pantalla, params };
    },
    volver: () => { if (navRef.isReady() && navRef.canGoBack()) navRef.goBack(); },
    irA: (id) => { alInicio(); setPestana(id); setVisitadas((v) => ({ ...v, [id]: true })); },
  }), []);

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

  // Cuenta recién creada: el tutorial de Chefpu parte solo (si no lo trae de invitado)
  useEffect(() => {
    if (!uidActual || cuentaNueva.current !== uidActual || !tutorial.estado) return undefined;
    cuentaNueva.current = null;
    if (tutorial.estado.iniciado) return undefined;
    const t = setTimeout(() => { tutorial.reiniciar(); nav.abrir('tutorial'); }, 600);
    return () => clearTimeout(t);
  }, [uidActual, tutorial.estado]);

  // Chefpu ofrece el tutorial a quien no lo ha visto (usuarios que ya tenían la app)
  const enApp = sesion !== undefined && bienvenidaVista !== null && !!tutorial.estado && (uidActual || bienvenidaVista);
  useEffect(() => {
    if (!enApp || tutorial.activo) return undefined;
    const e = tutorial.estado;
    if (e.ofrecido || (e.iniciado && !e.saltado) || cuentaNueva.current === uidActual) return undefined;
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
    const ruta = navRef.isReady() ? navRef.getCurrentRoute()?.name : null;
    const donde = !ruta || ruta === 'inicio' ? pestana : ruta;
    const CONSEJOS = {
      nevera: 'Anota lo que compras y te digo qué cocinar. Mantén presionado un alimento para quitarlo.',
      buscar: 'Elige lo que tienes y toca Ver recetas. Con 3 o más ingredientes salen muchas más.',
      publicar: 'Sube tu receta con foto y gana 50 XP. Elige los ingredientes del catálogo.',
      perfil: 'Aquí ves tu nivel, tus logros y tus recetas. Cocina y publica para subir.',
      resultados: 'Verde es lo que tienes, ámbar lo que te falta. Arriba están las que puedes cocinar ya.',
      receta: 'Toca Paso a paso para cocinar conmigo. Si la cocinas, sube tu foto en Lo cociné.',
      usuarios: 'Busca a tus amigos por su nick y síguelos para ver sus recetas.',
      amigos: 'Mira las sugerencias: te muestro gente de tu ciudad y con tus mismos gustos.',
      perfilPublico: 'Si te gustan sus recetas, síguelo. Si ves algo raro, repórtalo con la banderita.',
      acceso: 'Con una cuenta guardo tu nevera, tus recetas y tu XP.',
      tutorial: 'Toca lo que tengas y vemos qué cocinar.',
    };
    voz.decir('consejo', CONSEJOS[donde] || '¡Estoy aquí para ayudarte a cocinar!', 'feliz', { forzar: true });
  }, [pestana, voz.decir]);

  // Chefpu sugiere a alguien cercano (una vez por sesión, respetando sus límites)
  const sugerido = useRef(false);
  useEffect(() => {
    if (!enApp || !uidActual || tutorial.activo || sugerido.current) return undefined;
    const t = setTimeout(async () => {
      sugerido.current = true;
      const { data } = await supabase.rpc('sugerir_amigos', { p_limite: 3 });
      const p = (data || []).find((x) => Number(x.puntaje) >= 4);
      if (!p) return;
      voz.decir('sugerir_amigos', `${p.nombre}: ${p.motivo.charAt(0).toLowerCase()}${p.motivo.slice(1)}. ¿Lo conoces?`, 'feliz', {
        acciones: [{ texto: 'Ver amigos', fn: () => nav.abrir('amigos') }, { texto: 'Ahora no', fn: () => {} }],
      });
    }, 25000);
    return () => clearTimeout(t);
  }, [enApp, uidActual, tutorial.activo]);

  // Solo la primera carga muestra "cargando"; al cambiar de cuenta la app no se desmonta
  if (sesion === undefined || bienvenidaVista === null || tuvoCuenta === null || (!tutorial.estado && !yaCargo.current)) return <Cargando />;
  yaCargo.current = true;

  const uid = uidActual;
  const chefpu = { decir: voz.decir };
  const ctx = { sesion, uid, invitado: !uid, perfil, recargarPerfil, nav, pedirCuenta, tutorial, chefpu };
  const verFlotante = !teclado && (!tutorial.activo || (tutorial.linea?.cap === 5 && !tutorial.linea?.capa));

  // Quien ya tuvo cuenta en este teléfono y cerró sesión vuelve a "Entrar", no al modo invitado
  if (!uid && tuvoCuenta) {
    return (
      <AppCtx.Provider value={ctx}>
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.fondo }}>
          <Acceso puerta />
        </View>
      </AppCtx.Provider>
    );
  }

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
      <NavigationContainer ref={navRef}
        theme={TEMA}
        onReady={() => {
          if (pendiente.current) { const d = pendiente.current; pendiente.current = null; navRef.dispatch(StackActions.push(d.pantalla, d.params)); }
        }}>
        <Pila.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.fondo }, gestureEnabled: true }}>
          <Pila.Screen name="inicio">
            {() => <Inicio pestana={pestana} visitadas={visitadas} uid={uid} teclado={teclado} irA={nav.irA} />}
          </Pila.Screen>
          {Object.entries(APILADAS).map(([nombre, Comp]) => (
            <Pila.Screen key={nombre} name={nombre} component={Comp} />
          ))}
        </Pila.Navigator>
      </NavigationContainer>
      <ChefpuFlotante voz={voz} visible={verFlotante} onQueCocino={queCocino} onConsejo={consejo} onAmigos={() => nav.abrir('amigos')} />
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
