import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C } from '../theme';
import { Boton, TarjetaReceta, Pastilla, Pantalla, Esqueleto, ErrorCarga, Avatar, useRefrescar, s } from '../ui';
import { reportar } from '../reportar';
import { efecto } from '../sonido';
import { Cascada } from '../anim';

// Perfil de otro cocinero
export default function PerfilPublico({ id }) {
  const { uid, nav, pedirCuenta } = useApp();
  const [error, setError] = useState(false);
  const [p, setP] = useState(null);
  const [recetas, setRecetas] = useState([]);
  const [conteo, setConteo] = useState({ seguidores: 0, siguiendo: 0 });
  const [loSigo, setLoSigo] = useState(false);
  const [meSigue, setMeSigue] = useState(false);

  const cargar = useCallback(async () => {
    setError(false);
    const cuenta = (col) => supabase.from('seguidores').select('*', { count: 'exact', head: true }).eq(col, id);
    const [per, rec, c1, c2, yo, el] = await Promise.all([
      supabase.from('perfiles_publicos').select('*').eq('id', id).maybeSingle(),
      supabase.from('recetas').select('id, titulo, foto_url, nota_promedio, num_notas, num_likes, num_cocinadas').eq('autor_id', id).order('creado_en', { ascending: false }),
      cuenta('seguido_id'), cuenta('seguidor_id'),
      uid ? supabase.from('seguidores').select('seguido_id').eq('seguidor_id', uid).eq('seguido_id', id).maybeSingle() : Promise.resolve({ data: null }),
      uid ? supabase.from('seguidores').select('seguido_id').eq('seguidor_id', id).eq('seguido_id', uid).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (per.error || !per.data) { setError(true); return; }
    setP(per.data);
    setRecetas(rec.data || []);
    setConteo({ seguidores: c1.count || 0, siguiendo: c2.count || 0 });
    setLoSigo(!!yo.data);
    setMeSigue(!!el.data);
  }, [id, uid]);

  useEffect(() => { cargar(); }, [cargar]);
  const refreshControl = useRefrescar(cargar);

  if (error) return <ErrorCarga onReintentar={cargar} onVolver={nav.volver} />;
  if (!p) return <Pantalla scroll={false}><Esqueleto tipo="perfil" /></Pantalla>;

  async function alternar() {
    if (!uid) { pedirCuenta('Crea tu cuenta para seguir a otros cocineros'); return; }
    if (!loSigo) efecto('seguir');
    const { error } = loSigo
      ? await supabase.from('seguidores').delete().eq('seguidor_id', uid).eq('seguido_id', id)
      : await supabase.from('seguidores').insert({ seguidor_id: uid, seguido_id: id });
    if (error) Alert.alert('Error', error.message);
    cargar();
  }

  const lugar = [`@${p.usuario}`, p.ciudad].filter(Boolean).join(' · ');
  return (
    <FlatList
      data={recetas}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={s.contenido}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      initialNumToRender={8}
      refreshControl={refreshControl}
      ListHeaderComponent={<View style={{ gap: 16, marginBottom: 12 }}>
      <View style={s.filaEntre}>
        <Pressable onPress={nav.volver} accessibilityRole="button" accessibilityLabel="Volver" style={[s.fila, { gap: 2, minHeight: 44 }]}>
          <Ionicons name="chevron-back" size={22} color={C.suave} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.suave }}>Volver</Text>
        </Pressable>
        {id !== uid ? (
          <Pressable onPress={() => reportar({ uid, tipo: 'perfil', objetoId: id, pedirCuenta })} accessibilityRole="button" accessibilityLabel="Reportar perfil"
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="flag-outline" size={22} color={C.suave} />
          </Pressable>
        ) : null}
      </View>
      <View style={[s.fila, { gap: 14 }]}>
        <Avatar url={p.avatar_url} nombre={p.nombre} tam={84} borde={C.dorado} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.texto, letterSpacing: -0.5 }}>{p.nombre}</Text>
          <Text style={{ fontSize: 14, color: C.suave }}>{lugar}</Text>
          {meSigue ? <Pastilla texto="Te sigue" fondo={C.superficie} color={C.texto} /> : null}
        </View>
      </View>
      <View style={{ padding: 16, borderRadius: 18, backgroundColor: C.doradoTinte, gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: C.ambarOscuro }}>Nivel {p.nivel} · {p.titulo}</Text>
        <Text style={{ fontSize: 13, color: C.ambarOscuro }}>{conteo.seguidores} seguidores · {conteo.siguiendo} siguiendo</Text>
      </View>

      {id !== uid ? (
        <Boton titulo={loSigo ? 'Siguiendo' : meSigue ? 'Seguir también' : 'Seguir'} icono={loSigo ? 'checkmark' : 'person-add-outline'}
          tipo={loSigo ? 'neutro' : 'principal'} onPress={alternar} />
      ) : null}

      <View style={s.filaEntre}>
        <Text style={s.seccion}>Recetas</Text>
        <Text style={s.sub}>{recetas.length}</Text>
      </View>
      </View>}
      ListEmptyComponent={<View style={{ alignItems: 'center', gap: 6, paddingVertical: 20 }}>
        <Ionicons name="restaurant-outline" size={28} color={C.suave} />
        <Text style={[s.sub, { textAlign: 'center' }]}>{p.nombre} todavía no publica recetas.{!loSigo && id !== uid ? ' Síguelo y te enteras cuando lo haga.' : ''}</Text>
      </View>}
      renderItem={({ item: r, index }) => (
        <Cascada i={index}><TarjetaReceta titulo={r.titulo} foto={r.foto_url}
          meta={`${r.num_notas ? `${Number(r.nota_promedio).toFixed(1).replace('.', ',')} estrellas (${r.num_notas})` : 'Sin notas'} · ${r.num_cocinadas} la cocinaron`}
          onPress={() => nav.abrir('receta', { id: r.id })} /></Cascada>
      )}
    />
  );
}
