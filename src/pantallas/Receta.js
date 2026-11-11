import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp, tieneIngrediente } from '../contexto';
import { C } from '../theme';
import { Pantalla, Encabezado, Seccion, Grilla, Casilla, Boton, Estrellas, Tarjeta, Cargando, s } from '../ui';

export default function Receta({ id, tengo = null, basicos = true }) {
  const { uid, nav, recargarPerfil } = useApp();
  const [r, setR] = useState(null);
  const [setTengo, setSetTengo] = useState(new Set());
  const [padres, setPadres] = useState(new Set());
  const [miNota, setMiNota] = useState(0);
  const [meGusta, setMeGusta] = useState(false);
  const [versiones, setVersiones] = useState([]);

  const cargar = useCallback(async () => {
    const [rec, nev, nota, like, asi] = await Promise.all([
      supabase.from('recetas')
        .select('*, perfiles(nombre, xp), receta_ingredientes(cantidad, opcional, ingrediente_id, ingredientes(id, nombre, padre_id, es_basico))')
        .eq('id', id).single(),
      supabase.from('nevera').select('ingrediente_id').eq('usuario_id', uid),
      supabase.from('notas').select('estrellas').eq('usuario_id', uid).eq('receta_id', id).maybeSingle(),
      supabase.from('likes').select('receta_id').eq('usuario_id', uid).eq('receta_id', id).maybeSingle(),
      supabase.from('asi_me_quedo').select('id, nota, respuesta_creador, perfiles(nombre)').eq('receta_id', id).order('creado_en', { ascending: false }).limit(10),
    ]);
    if (rec.error) { Alert.alert('Error', rec.error.message); return; }
    const ids = tengo || (nev.data || []).map((n) => n.ingrediente_id);
    const conj = new Set(ids);
    let padresSet = new Set();
    if (ids.length) {
      const { data } = await supabase.from('ingredientes').select('padre_id').in('id', ids).not('padre_id', 'is', null);
      padresSet = new Set((data || []).map((d) => d.padre_id));
    }
    setSetTengo(conj);
    setPadres(padresSet);
    setR(rec.data);
    setMiNota(nota.data?.estrellas || 0);
    setMeGusta(!!like.data);
    setVersiones(asi.data || []);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!r) return <Cargando />;

  const ings = r.receta_ingredientes.map((ri) => {
    const ing = ri.ingredientes;
    const ok = (basicos && ing.es_basico) || tieneIngrediente(ing, setTengo, padres);
    return { ...ri, ing, ok };
  });
  const visibles = ings.filter((i) => !(i.ing.es_basico && basicos));
  const faltan = ings.filter((i) => !i.ok && !i.opcional);
  const esMia = r.autor_id === uid;

  async function puntuar(n) {
    setMiNota(n);
    const { error } = await supabase.from('notas').upsert({ usuario_id: uid, receta_id: id, estrellas: n });
    if (error) Alert.alert('Error', error.message); else cargar();
  }

  async function alternarLike() {
    const nuevo = !meGusta;
    setMeGusta(nuevo);
    const q = nuevo
      ? supabase.from('likes').insert({ usuario_id: uid, receta_id: id })
      : supabase.from('likes').delete().eq('usuario_id', uid).eq('receta_id', id);
    const { error } = await q;
    if (error) { setMeGusta(!nuevo); Alert.alert('Error', error.message); } else recargarPerfil();
  }

  function loCocine() {
    const usados = ings.filter((i) => !i.ing.es_basico && setTengo.has(i.ingrediente_id)).map((i) => i.ingrediente_id);
    if (!usados.length) {
      Alert.alert('¡Buen provecho!', 'Pronto podrás subir la foto de cómo te quedó y ganar XP.');
      return;
    }
    Alert.alert('¡Buen provecho!', '¿Quitamos de tu nevera los ingredientes que usaste?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, quitar',
        onPress: async () => {
          await supabase.from('nevera').delete().eq('usuario_id', uid).in('ingrediente_id', usados);
          Alert.alert('Nevera actualizada', `Quitamos ${usados.length} ${usados.length === 1 ? 'ingrediente' : 'ingredientes'}.`);
        },
      },
    ]);
  }

  return (
    <Pantalla pie={<Boton titulo="Lo cociné" icono="checkmark-circle-outline" onPress={loCocine} />}>
      <Encabezado
        onVolver={nav.volver}
        titulo={r.titulo}
        derecha={
          <Pressable onPress={alternarLike} hitSlop={10} accessibilityLabel={meGusta ? 'Quitar me gusta' : 'Me gusta'}>
            <Ionicons name={meGusta ? 'heart' : 'heart-outline'} size={28} color={C.tomate} />
          </Pressable>
        }
      />

      <View style={[s.fila, { flexWrap: 'wrap', gap: 14 }]}>
        {Number(r.nota_promedio) > 0 ? (
          <View style={s.fila}><Estrellas valor={Number(r.nota_promedio)} /><Text style={s.sub}>{Number(r.nota_promedio).toFixed(1)} ({r.num_notas})</Text></View>
        ) : null}
        <Text style={s.sub}>{r.minutos} min</Text>
        <Text style={s.sub}>{r.porciones} porciones</Text>
        <Text style={s.sub}>{r.dificultad}</Text>
        <Text style={s.sub}>{r.num_likes} me gusta</Text>
      </View>

      <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.superficie, borderWidth: 0 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.tomate, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.blanco, fontWeight: '800' }}>{(r.perfiles?.nombre || '?').slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.etiqueta}>{r.perfiles?.nombre}</Text>
          <Text style={[s.sub, { color: C.ambarTexto }]}>{esMia ? 'Tu receta' : 'Creador'}</Text>
        </View>
      </Tarjeta>

      {r.descripcion ? <Text style={{ fontSize: 15, color: C.texto, lineHeight: 21 }}>{r.descripcion}</Text> : null}

      <Seccion
        titulo="Ingredientes"
        derecha={<Text style={{ fontSize: 13, fontWeight: '800', color: faltan.length ? C.ambarTexto : C.verde }}>
          {faltan.length ? `Te ${faltan.length === 1 ? 'falta' : 'faltan'} ${faltan.length}` : 'Tienes todo'}
        </Text>}
      >
        <Grilla>
          {visibles.map((i) => (
            <Casilla
              key={i.ingrediente_id}
              nombre={i.ing.nombre}
              estado={i.ok ? 'tengo' : 'falta'}
              detalle={[i.cantidad, i.opcional ? 'opcional' : null].filter(Boolean).join(' · ') || null}
            />
          ))}
        </Grilla>
        {basicos ? <Text style={s.sub}>Más sal, aceite y lo básico de tu despensa.</Text> : null}
      </Seccion>

      <Seccion titulo="Preparación">
        {r.pasos.map((p, n) => (
          <View key={n} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.tomateTinte, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '800', color: C.tomateOscuro }}>{n + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: C.texto }}>{p}</Text>
          </View>
        ))}
      </Seccion>

      {!esMia ? (
        <Seccion titulo="Tu nota">
          <Estrellas valor={miNota} tam={32} onCambiar={puntuar} />
        </Seccion>
      ) : null}

      <Seccion titulo="Así me quedó" derecha={<Text style={s.sub}>{r.num_cocinadas} la cocinaron</Text>}>
        {versiones.length === 0 ? (
          <Text style={s.sub}>Nadie ha subido su versión todavía. ¡Sé el primero!</Text>
        ) : versiones.map((v) => (
          <Tarjeta key={v.id}>
            <Text style={s.etiqueta}>{v.perfiles?.nombre}</Text>
            {v.nota ? <Text style={{ color: C.texto }}>{v.nota}</Text> : null}
            {v.respuesta_creador ? (
              <View style={{ backgroundColor: C.tomateTinte, padding: 10, borderRadius: 12 }}>
                <Text style={{ fontWeight: '800', color: C.tomateOscuro }}>{r.perfiles?.nombre} · creador</Text>
                <Text style={{ color: C.texto }}>{v.respuesta_creador}</Text>
              </View>
            ) : null}
          </Tarjeta>
        ))}
      </Seccion>
    </Pantalla>
  );
}
