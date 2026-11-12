import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C } from '../theme';
import { Encabezado, Avatar, Vacio, Cargando, Chip, Boton, s } from '../ui';
import { registrar } from '../analitica';
import { efecto } from '../sonido';

const CAMPOS = 'id, nombre, usuario, avatar_url, nivel, titulo, ciudad';
const PESTANAS = [
  { id: 'sugerencias', texto: 'Sugerencias' },
  { id: 'amigos', texto: 'Amigos' },
  { id: 'siguiendo', texto: 'Siguiendo' },
  { id: 'seguidores', texto: 'Seguidores' },
];
const CIUDADES = ['Santiago', 'Calama', 'Antofagasta', 'Valparaíso', 'Viña del Mar', 'Concepción', 'La Serena', 'Temuco', 'Iquique', 'Rancagua', 'Puerto Montt', 'Arica'];

// Amigos: sugerencias para conocer gente nueva, amigos (se siguen mutuamente), a quién sigues y quién te sigue.
// Más adelante aquí vivirán los clubs de cocina.
export default function Usuarios({ pestana: inicial = 'sugerencias' }) {
  const { uid, invitado, nav, pedirCuenta, perfil, recargarPerfil } = useApp();
  const [pestana, setPestana] = useState(inicial);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [sigo, setSigo] = useState(new Set());
  const [meSiguen, setMeSiguen] = useState(new Set());
  const [perfiles, setPerfiles] = useState({}); // id -> perfil, para listas
  const [sugerencias, setSugerencias] = useState(null);
  const [ciudadOtra, setCiudadOtra] = useState('');
  const [editarCiudad, setEditarCiudad] = useState(false);

  const cargarRelaciones = useCallback(async () => {
    if (!uid) return;
    const [a, b] = await Promise.all([
      supabase.from('seguidores').select('seguido_id').eq('seguidor_id', uid),
      supabase.from('seguidores').select('seguidor_id').eq('seguido_id', uid),
    ]);
    const s1 = new Set((a.data || []).map((x) => x.seguido_id));
    const s2 = new Set((b.data || []).map((x) => x.seguidor_id));
    setSigo(s1); setMeSiguen(s2);
    const ids = [...new Set([...s1, ...s2])];
    if (!ids.length) { setPerfiles({}); return; }
    const { data } = await supabase.from('perfiles_publicos').select(CAMPOS).in('id', ids);
    setPerfiles(Object.fromEntries((data || []).map((p) => [p.id, p])));
  }, [uid]);

  const cargarSugerencias = useCallback(async () => {
    const { data, error } = await supabase.rpc('sugerir_amigos', { p_limite: 30 });
    setSugerencias(error ? [] : data || []);
  }, []);

  useEffect(() => { cargarRelaciones(); cargarSugerencias(); }, [cargarRelaciones, cargarSugerencias]);

  // Buscar por nombre o nick
  useEffect(() => {
    let cancelado = false;
    const t = q.trim().replace(/[,()%*]/g, '');
    if (t.length < 2) { setResultados([]); return undefined; }
    let consulta = supabase.from('perfiles_publicos').select(CAMPOS).or(`nombre.ilike.%${t}%,usuario.ilike.%${t}%`).limit(25);
    if (uid) consulta = consulta.neq('id', uid);
    consulta.then(({ data }) => { if (!cancelado) setResultados(data || []); });
    return () => { cancelado = true; };
  }, [q, uid]);

  async function alternar(p) {
    if (!uid) { pedirCuenta('Crea tu cuenta para seguir a otros cocineros'); return; }
    const loSigo = sigo.has(p.id);
    if (!loSigo) efecto('seguir');
    setSigo((x) => { const n = new Set(x); if (loSigo) n.delete(p.id); else n.add(p.id); return n; });
    setPerfiles((x) => ({ ...x, [p.id]: p }));
    const { error } = loSigo
      ? await supabase.from('seguidores').delete().eq('seguidor_id', uid).eq('seguido_id', p.id)
      : await supabase.from('seguidores').insert({ seguidor_id: uid, seguido_id: p.id });
    if (error) { Alert.alert('No se pudo', error.message); cargarRelaciones(); return; }
    if (!loSigo) registrar('seguir', { desde: pestana, motivo: p.motivo || null }, uid);
  }

  async function guardarCiudad(ciudad) {
    const c = ciudad.trim().slice(0, 40);
    if (!c) return;
    const { error } = await supabase.from('perfiles').update({ ciudad: c }).eq('id', uid);
    if (error) { Alert.alert('No se pudo', error.message); return; }
    setEditarCiudad(false); setCiudadOtra('');
    await recargarPerfil();
    cargarSugerencias();
  }

  const fila = (p, detalle) => {
    const loSigo = sigo.has(p.id);
    const amigos = loSigo && meSiguen.has(p.id);
    const extra = detalle || (amigos ? 'Amigos' : meSiguen.has(p.id) ? 'Te sigue' : null);
    return (
      <Pressable key={p.id} onPress={() => nav.abrir('perfilPublico', { id: p.id })} accessibilityRole="button" accessibilityHint="Abre su perfil"
        style={({ pressed }) => [s.fila, { gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.blanco, borderWidth: 1.5, borderColor: C.linea, opacity: pressed ? 0.9 : 1 }]}>
        <Avatar url={p.avatar_url} nombre={p.nombre} tam={48} />
        <View style={{ flex: 1 }}>
          <Text style={s.etiqueta}>{p.nombre}</Text>
          <Text style={{ fontSize: 13, color: C.suave }} numberOfLines={2}>{extra ? `${extra} · Nivel ${p.nivel}` : `@${p.usuario} · Nivel ${p.nivel}`}</Text>
        </View>
        <Pressable onPress={() => alternar(p)} hitSlop={6} accessibilityRole="button" accessibilityLabel={loSigo ? `Dejar de seguir a ${p.nombre}` : `Seguir a ${p.nombre}`}
          style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', borderWidth: 1.5, borderColor: loSigo ? C.linea : C.tomate, backgroundColor: loSigo ? C.blanco : C.tomate }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: loSigo ? C.texto : C.blanco }}>{loSigo ? 'Siguiendo' : meSiguen.has(p.id) ? 'Seguir también' : 'Seguir'}</Text>
        </Pressable>
      </Pressable>
    );
  };

  const buscando = q.trim().length >= 2;
  const amigosIds = [...sigo].filter((id) => meSiguen.has(id));
  const conteos = { amigos: amigosIds.length, siguiendo: sigo.size, seguidores: meSiguen.size };

  const ordenar = (ids) => ids.map((id) => perfiles[id]).filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre));
  // Lo que muestra la lista según la búsqueda o la pestaña (FlatList: carga por partes aunque sean cientos)
  let datos = [];
  let vacio = null;
  if (buscando) {
    datos = resultados.map((p) => ({ p }));
    vacio = <Vacio texto="No encontramos a nadie con ese nombre" />;
  } else if (pestana === 'sugerencias') {
    datos = (sugerencias || []).map((p) => ({ p, detalle: p.motivo }));
    vacio = sugerencias === null ? <Cargando /> : <Vacio texto="Aún no hay sugerencias. Cuando más gente se sume, aparecerán aquí." />;
  } else if (invitado) {
    vacio = (
            <View style={{ gap: 12, paddingVertical: 16 }}>
              <Text style={[s.sub, { textAlign: 'center', fontSize: 15 }]}>Crea tu cuenta para seguir a tus amigos y ver quién te sigue.</Text>
              <Boton titulo="Crear mi cuenta" icono="gift-outline" onPress={() => pedirCuenta('Crea tu cuenta para seguir a tus amigos')} />
            </View>
    );
  } else if (pestana === 'amigos') {
    datos = ordenar(amigosIds).map((p) => ({ p }));
    vacio = <Vacio texto="Cuando tú y otra persona se sigan, aparecerá aquí como amigo." />;
  } else if (pestana === 'siguiendo') {
    datos = ordenar([...sigo]).map((p) => ({ p }));
    vacio = <Vacio texto="Aún no sigues a nadie. Mira las sugerencias." />;
  } else {
    datos = ordenar([...meSiguen]).map((p) => ({ p }));
    vacio = <Vacio texto="Todavía nadie te sigue. Publica una receta para que te conozcan." />;
  }

  const cabecera = (
    <View style={{ gap: 16, marginBottom: 12 }}>
      <Encabezado onVolver={nav.volver} titulo="Amigos" sub="Sigue a otros cocineros y mira lo que cocinan" />

      <View style={[s.input, s.fila]}>
        <Ionicons name="search" size={18} color={C.suave} />
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar por nombre o nick" placeholderTextColor={C.suave}
          autoCorrect={false} autoCapitalize="none" returnKeyType="search" style={{ flex: 1, fontSize: 15, color: C.texto }} />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
            <Ionicons name="close-circle" size={18} color={C.suave} />
          </Pressable>
        ) : null}
      </View>

      {!buscando ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="tablist">
            {PESTANAS.map((p) => (
              <Chip key={p.id} activo={pestana === p.id} onPress={() => setPestana(p.id)}
                texto={p.id === 'sugerencias' || invitado ? p.texto : `${p.texto} ${conteos[p.id]}`} />
            ))}
          </ScrollView>

          {pestana === 'sugerencias' ? (
            <>
              {uid && (!perfil?.ciudad || editarCiudad) ? (
                <View style={{ gap: 12, padding: 16, borderRadius: 18, backgroundColor: C.blanco, borderWidth: 1.5, borderColor: C.linea }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: C.texto }}>¿De dónde eres?</Text>
                  <Text style={s.sub}>Te sugiero cocineros cerca de ti. Solo se muestra la ciudad, nunca tu ubicación exacta.</Text>
                  <View style={s.chips}>
                    {CIUDADES.map((c) => <Chip key={c} texto={c} onPress={() => guardarCiudad(c)} />)}
                  </View>
                  <View style={[s.fila, { gap: 8 }]}>
                    <TextInput value={ciudadOtra} onChangeText={setCiudadOtra} placeholder="Otra ciudad" placeholderTextColor={C.suave}
                      maxLength={40} returnKeyType="done" onSubmitEditing={() => guardarCiudad(ciudadOtra)} style={[s.input, { flex: 1 }]} />
                    <Boton titulo="Listo" onPress={() => guardarCiudad(ciudadOtra)} style={{ minWidth: 90 }} />
                  </View>
                </View>
              ) : uid ? (
                <Pressable onPress={() => setEditarCiudad(true)} accessibilityRole="button" style={[s.fila, { minHeight: 44 }]}>
                  <Ionicons name="location-outline" size={16} color={C.texto} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: C.texto }}>Sugerencias cerca de {perfil.ciudad} · <Text style={{ color: C.tomate }}>cambiar</Text></Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={datos}
      keyExtractor={(x) => x.p.id}
      renderItem={({ item }) => fila(item.p, item.detalle)}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={vacio}
      contentContainerStyle={s.contenido}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      initialNumToRender={12}
    />
  );
}
