import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './src/supabase';
import { AppCtx } from './src/contexto';
import { C } from './src/theme';
import { Cargando } from './src/ui';
import Acceso from './src/pantallas/Acceso';
import Nevera from './src/pantallas/Nevera';
import Buscar from './src/pantallas/Buscar';
import Resultados from './src/pantallas/Resultados';
import Receta from './src/pantallas/Receta';
import Publicar from './src/pantallas/Publicar';
import Perfil from './src/pantallas/Perfil';

const PESTANAS = [
  { id: 'nevera', nombre: 'Nevera', icono: 'file-tray-stacked-outline', comp: Nevera },
  { id: 'buscar', nombre: 'Buscar', icono: 'search', comp: Buscar },
  { id: 'publicar', nombre: 'Publicar', icono: 'add-circle-outline', comp: Publicar },
  { id: 'perfil', nombre: 'Perfil', icono: 'person-outline', comp: Perfil },
];
const PANTALLAS = { resultados: Resultados, receta: Receta };

function Contenido() {
  const insets = useSafeAreaInsets();
  const [sesion, setSesion] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [pestana, setPestana] = useState('nevera');
  const [pila, setPila] = useState([]); // pantallas encima de las pestañas

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, nueva) => setSesion(nueva));
    return () => sub.subscription.unsubscribe();
  }, []);

  const recargarPerfil = useCallback(async () => {
    if (!sesion) { setPerfil(null); return; }
    const { data } = await supabase.from('perfiles_publicos').select('*').eq('id', sesion.user.id).maybeSingle();
    setPerfil(data);
  }, [sesion]);

  useEffect(() => { recargarPerfil(); }, [recargarPerfil]);

  const nav = useMemo(() => ({
    abrir: (pantalla, params = {}) => setPila((p) => [...p, { pantalla, params, key: Date.now() }]),
    volver: () => setPila((p) => p.slice(0, -1)),
    irA: (id) => { setPila([]); setPestana(id); },
  }), []);

  if (sesion === undefined) return <Cargando />;

  const ctx = { sesion, uid: sesion?.user?.id, perfil, recargarPerfil, nav };

  if (!sesion) {
    return (
      <AppCtx.Provider value={ctx}>
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.fondo }}>
          <Acceso />
        </View>
      </AppCtx.Provider>
    );
  }

  const tope = pila[pila.length - 1];
  const Pestana = PESTANAS.find((p) => p.id === pestana).comp;
  const Encima = tope ? PANTALLAS[tope.pantalla] : null;

  return (
    <AppCtx.Provider value={ctx}>
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.fondo }}>
        <View style={{ flex: 1 }}>
          {Encima ? <Encima key={tope.key} {...tope.params} /> : <Pestana />}
        </View>
        {!Encima ? (
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.linea, backgroundColor: C.fondo, paddingBottom: Math.max(insets.bottom, 10), paddingTop: 6 }}>
            {PESTANAS.map((p) => {
              const activa = p.id === pestana;
              return (
                <Pressable key={p.id} onPress={() => nav.irA(p.id)} style={{ flex: 1, alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center' }} accessibilityRole="tab" accessibilityState={{ selected: activa }}>
                  <Ionicons name={p.icono} size={24} color={activa ? C.tomate : C.suave} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: activa ? C.tomate : C.suave }}>{p.nombre}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
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
