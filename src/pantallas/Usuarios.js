import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C } from '../theme';
import { Pantalla, Encabezado, Seccion, Avatar, Vacio, s } from '../ui';

const CAMPOS = 'id, nombre, usuario, avatar_url, nivel, titulo';

// Buscador de cocineros + lista de a quiénes sigues
export default function Usuarios() {
  const { uid, nav, pedirCuenta } = useApp();
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [siguiendo, setSiguiendo] = useState([]); // perfiles que sigo
  const [meSiguen, setMeSiguen] = useState(new Set());

  const cargarSeguidos = useCallback(async () => {
    if (!uid) return;
    const [a, b] = await Promise.all([
      supabase.from('seguidores').select('seguido_id').eq('seguidor_id', uid),
      supabase.from('seguidores').select('seguidor_id').eq('seguido_id', uid),
    ]);
    setMeSiguen(new Set((b.data || []).map((x) => x.seguidor_id)));
    const ids = (a.data || []).map((x) => x.seguido_id);
    if (!ids.length) { setSiguiendo([]); return; }
    const { data } = await supabase.from('perfiles_publicos').select(CAMPOS).in('id', ids).order('nombre');
    setSiguiendo(data || []);
  }, [uid]);

  useEffect(() => { cargarSeguidos(); }, [cargarSeguidos]);

  useEffect(() => {
    let cancelado = false;
    const t = q.trim().replace(/[,()%*]/g, '');
    if (t.length < 2) { setResultados([]); return; }
    let consulta = supabase.from('perfiles_publicos').select(CAMPOS).or(`nombre.ilike.%${t}%,usuario.ilike.%${t}%`).limit(25);
    if (uid) consulta = consulta.neq('id', uid);
    consulta.then(({ data }) => { if (!cancelado) setResultados(data || []); });
    return () => { cancelado = true; };
  }, [q, uid]);

  const idsSigo = new Set(siguiendo.map((p) => p.id));

  async function alternar(p) {
    if (!uid) { pedirCuenta('Crea tu cuenta para seguir a otros cocineros'); return; }
    const loSigo = idsSigo.has(p.id);
    setSiguiendo((l) => (loSigo ? l.filter((x) => x.id !== p.id) : [...l, p]));
    const { error } = loSigo
      ? await supabase.from('seguidores').delete().eq('seguidor_id', uid).eq('seguido_id', p.id)
      : await supabase.from('seguidores').insert({ seguidor_id: uid, seguido_id: p.id });
    if (error) { Alert.alert('Error', error.message); cargarSeguidos(); }
  }

  const fila = (p) => {
    const loSigo = idsSigo.has(p.id);
    const amigos = loSigo && meSiguen.has(p.id);
    return (
      <Pressable key={p.id} onPress={() => nav.abrir('perfilPublico', { id: p.id })}
        style={[s.fila, { gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.linea }]}>
        <Avatar url={p.avatar_url} nombre={p.nombre} tam={48} />
        <View style={{ flex: 1 }}>
          <Text style={s.etiqueta}>{p.nombre}</Text>
          <Text style={s.sub}>Nivel {p.nivel} · {p.titulo}{amigos ? ' · Amigos' : meSiguen.has(p.id) ? ' · Te sigue' : ''}</Text>
        </View>
        <Pressable onPress={() => alternar(p)} hitSlop={6}
          style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: C.tomate, backgroundColor: loSigo ? C.blanco : C.tomate }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: loSigo ? C.tomate : C.blanco }}>{loSigo ? 'Siguiendo' : 'Seguir'}</Text>
        </Pressable>
      </Pressable>
    );
  };

  const buscando = q.trim().length >= 2;

  return (
    <Pantalla>
      <Encabezado onVolver={nav.volver} titulo="Cocineros" sub="Busca amigos y mira sus recetas" />
      <View style={[s.input, s.fila]}>
        <Ionicons name="search" size={18} color={C.suave} />
        <TextInput value={q} onChangeText={setQ} placeholder="Nombre o usuario" placeholderTextColor={C.suave}
          autoCorrect={false} autoCapitalize="none" returnKeyType="search" style={{ flex: 1, fontSize: 15, color: C.texto }} />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Borrar búsqueda">
            <Ionicons name="close-circle" size={18} color={C.suave} />
          </Pressable>
        ) : null}
      </View>
      {buscando ? (
        resultados.length ? <View>{resultados.map(fila)}</View> : <Vacio icono="people-outline" texto="No encontramos a nadie con ese nombre" />
      ) : (
        <Seccion titulo="Siguiendo" derecha={<Text style={s.sub}>{siguiendo.length}</Text>}>
          {siguiendo.length ? <View>{siguiendo.map(fila)}</View> : <Text style={s.sub}>Aún no sigues a nadie. Busca a tus amigos por su nombre.</Text>}
        </Seccion>
      )}
    </Pantalla>
  );
}
