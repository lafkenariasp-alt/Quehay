import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C } from '../theme';
import { Pantalla, Encabezado, Seccion, Boton, Tarjeta, Cargando, ErrorCarga, Avatar, Estrellas, s } from '../ui';
import { reportar } from '../reportar';

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

  if (error) return <ErrorCarga onReintentar={cargar} onVolver={nav.volver} />;
  if (!p) return <Cargando />;

  async function alternar() {
    if (!uid) { pedirCuenta('Crea tu cuenta para seguir a otros cocineros'); return; }
    const { error } = loSigo
      ? await supabase.from('seguidores').delete().eq('seguidor_id', uid).eq('seguido_id', id)
      : await supabase.from('seguidores').insert({ seguidor_id: uid, seguido_id: id });
    if (error) Alert.alert('Error', error.message);
    cargar();
  }

  return (
    <Pantalla>
      <Encabezado onVolver={nav.volver} titulo={p.nombre} sub={`@${p.usuario}`} derecha={id !== uid ? (
        <Pressable onPress={() => reportar({ uid, tipo: 'perfil', objetoId: id, pedirCuenta })} hitSlop={12} accessibilityRole="button" accessibilityLabel="Reportar perfil">
          <Ionicons name="flag-outline" size={22} color={C.suave} />
        </Pressable>
      ) : null} />
      <View style={[s.fila, { gap: 16 }]}>
        <Avatar url={p.avatar_url} nombre={p.nombre} tam={84} borde={C.dorado} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: C.doradoTinte }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.ambarOscuro }}>Nivel {p.nivel} · {p.titulo}</Text>
          </View>
          <Text style={s.sub}>{conteo.seguidores} seguidores · {conteo.siguiendo} siguiendo</Text>
          {loSigo && meSigue ? <Text style={[s.sub, { color: C.verde }]}>Son amigos</Text> : meSigue ? <Text style={s.sub}>Te sigue</Text> : null}
        </View>
      </View>

      {id !== uid ? (
        <Boton titulo={loSigo ? 'Siguiendo' : meSigue ? 'Seguir también' : 'Seguir'} icono={loSigo ? 'checkmark' : 'person-add-outline'}
          tipo={loSigo ? 'secundario' : 'principal'} onPress={alternar} />
      ) : null}

      <Seccion titulo="Recetas" derecha={<Text style={s.sub}>{recetas.length}</Text>}>
        {recetas.length === 0 ? <Text style={s.sub}>Todavía no publica recetas.</Text> : recetas.map((r) => (
          <Tarjeta key={r.id} onPress={() => nav.abrir('receta', { id: r.id })} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {r.foto_url ? (
              <Image source={{ uri: r.foto_url }} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: C.superficie }} />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: C.superficie, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="restaurant-outline" size={24} color="#B9A68E" />
              </View>
            )}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.etiqueta}>{r.titulo}</Text>
              <View style={s.fila}>
                <Estrellas valor={Number(r.nota_promedio)} tam={12} />
                <Text style={s.sub}>{r.num_notas ? `${Number(r.nota_promedio).toFixed(1)} (${r.num_notas})` : 'Sin notas'}</Text>
              </View>
              <Text style={s.sub}>{r.num_likes} me gusta · {r.num_cocinadas} la cocinaron</Text>
            </View>
          </Tarjeta>
        ))}
      </Seccion>
    </Pantalla>
  );
}
