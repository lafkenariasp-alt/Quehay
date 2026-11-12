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
import { useTutorialEstado, RegaloTutorial } from './src/tutorial';
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
              <Pressable key={p.id} onPress={() => irA(p.id)} style={{ flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' }}
                accessibilityRole="tab" accessibilityLabel={p.nombre} accessibilityState={{ selected: activa }}>
                <Ionicons name={p.icono} size={24} color={activa ? C.tomate : C.suave} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: activa ? C.tomate : C.suave }} maxFontSizeMultiplier={1.4}>{p.nombre}</Text>
              </Pressable>
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
  const pendiente = useRef(null); // pantalla a abrir apenas la navegación esté lista
  const [visitadas, setVisitadas] = useState({ buscar: true }); // pestañas que quedan vivas (no pierden lo escrito)
  const [teclado, setTeclado] = useState(false);
  const [altoTeclado, setAltoTeclado] = useState(0); // con el teclado abierto escondemos las pestañas

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

  if (sesion === undefined || bienvenidaVista === null || !tutorial.estado) return <Cargando />;

  const uid = sesion?.user?.id || null;
  const ctx = { sesion, uid, invitado: !uid, perfil, recargarPerfil, nav, pedirCuenta, tutorial };

  if (!uid && !bienvenidaVista) {
    return (
      <AppCtx.Provider value={ctx}>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: C.fondo }}>
          <Bienvenida onTerminar={terminarBienvenida} />
        </View>
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
