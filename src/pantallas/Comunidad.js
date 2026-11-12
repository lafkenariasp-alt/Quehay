import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, FlatList } from 'react-native';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C } from '../theme';
import { Encabezado, Chip, Boton, TarjetaReceta, Avatar, Vacio, Esqueleto, ErrorCarga, DobleToque, VisorFotos, useVolverArriba, useRefrescar, s } from '../ui';
import { efecto } from '../sonido';
import { Cascada, useTituloFijo } from '../anim';

// Comunidad: lo que cocinan y publican las personas que sigues (o todos)
const LIMITE = 30;

function hace(fecha) {
  const min = Math.max(1, Math.round((Date.now() - new Date(fecha).getTime()) / 60000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return d === 1 ? 'ayer' : `hace ${d} días`;
  return new Date(fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function Comunidad({ activa }) {
  const { uid, invitado, nav, pedirCuenta } = useApp();
  const [sigo, setSigo] = useState(null); // ids que sigo (null = cargando)
  const [vista, setVista] = useState('siguiendo'); // siguiendo | todos
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [visor, setVisor] = useState(null); // foto a pantalla completa
  const lista = useRef(null);
  useVolverArriba(lista);
  const fijo = useTituloFijo('Comunidad');

  // a quién sigo
  useEffect(() => {
    if (!uid) { setSigo([]); setVista('todos'); return; }
    supabase.from('seguidores').select('seguido_id').eq('seguidor_id', uid).then(({ data }) => {
      const ids = (data || []).map((d) => d.seguido_id);
      setSigo(ids);
      if (!ids.length) setVista('todos');
    });
  }, [uid, activa]);

  const cargar = useCallback(async () => {
    if (sigo === null) return;
    setError(false);
    const filtro = vista === 'siguiendo' && sigo.length ? sigo : null;
    let q1 = supabase.from('asi_me_quedo')
      .select('id, foto_url, nota, creado_en, usuario_id, receta_id, perfiles(nombre, avatar_url), recetas(titulo)')
      .not('foto_url', 'is', null).eq('oculta', false).order('creado_en', { ascending: false }).limit(LIMITE);
    let q2 = supabase.from('recetas')
      .select('id, titulo, foto_url, minutos, dificultad, nota_promedio, num_notas, creado_en, autor_id, perfiles!recetas_autor_id_fkey(nombre, avatar_url)')
      .eq('oculta', false).order('creado_en', { ascending: false }).limit(LIMITE);
    if (filtro) { q1 = q1.in('usuario_id', filtro); q2 = q2.in('autor_id', filtro); }
    const [a, b] = await Promise.all([q1, q2]);
    if (a.error && b.error) { setError(true); setItems([]); return; }
    const lista = [
      ...(a.data || []).map((x) => ({ tipo: 'cocino', clave: `c${x.id}`, fecha: x.creado_en, ...x })),
      ...(b.data || []).map((x) => ({ tipo: 'publico', clave: `p${x.id}`, fecha: x.creado_en, ...x })),
    ].sort((x, y) => new Date(y.fecha) - new Date(x.fecha)).slice(0, LIMITE);
    setItems(lista);
  }, [sigo, vista]);

  useEffect(() => { if (activa !== false) cargar(); }, [cargar, activa]);
  const refreshControl = useRefrescar(cargar);

  // Doble toque en la foto: Me gusta a la receta (no lo quita, como Instagram)
  async function meGusta(recetaId) {
    if (invitado) { pedirCuenta('Crea tu cuenta para dar Me gusta'); return; }
    efecto('me_gusta');
    await supabase.from('likes').upsert({ usuario_id: uid, receta_id: recetaId }, { onConflict: 'usuario_id,receta_id', ignoreDuplicates: true });
  }

  if (error && items && !items.length) return <ErrorCarga onReintentar={cargar} />;

  const quien = (persona, id, texto, fecha) => (
    <Pressable onPress={() => nav.abrir('perfilPublico', { id })} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${persona?.nombre}`}
      style={[s.fila, { gap: 10 }]}>
      <Avatar url={persona?.avatar_url} nombre={persona?.nombre || '?'} tam={40} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: C.texto }}><Text style={{ fontWeight: '800' }}>{persona?.nombre}</Text> {texto}</Text>
        <Text style={{ fontSize: 12, color: C.suave }}>{hace(fecha)}</Text>
      </View>
    </Pressable>
  );

  const renderItem = ({ item, index }) => <Cascada i={index}>{tarjeta(item)}</Cascada>;
  const tarjeta = (item) => (item.tipo === 'cocino' ? (
    <View style={{ gap: 10, padding: 14, borderRadius: 18, backgroundColor: C.blanco, borderWidth: 1.5, borderColor: C.linea }}>
      {quien(item.perfiles, item.usuario_id, 'cocinó', item.fecha)}
      <DobleToque onDoble={() => meGusta(item.receta_id)}
        onSimple={() => setVisor({ url: item.foto_url, texto: [item.perfiles?.nombre, item.nota].filter(Boolean).join(': ') })}
        style={{ borderRadius: 14, overflow: 'hidden' }}>
        <Image source={{ uri: item.foto_url }} style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: C.superficie }}
          accessibilityLabel={`Foto de ${item.recetas?.titulo}. Toca para verla grande, dos veces para Me gusta`} />
      </DobleToque>
      <Pressable onPress={() => nav.abrir('receta', { id: item.receta_id })} accessibilityRole="button" accessibilityLabel={`Abrir ${item.recetas?.titulo}`} style={{ gap: 8 }}>
        <View style={s.filaEntre}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.texto, flex: 1 }}>{item.recetas?.titulo}</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.tomate }}>Ver receta</Text>
        </View>
        {item.nota ? <Text style={{ fontSize: 15, color: C.texto, lineHeight: 21 }}>«{item.nota}»</Text> : null}
      </Pressable>
    </View>
  ) : (
    <View style={{ gap: 10 }}>
      {quien(item.perfiles, item.autor_id, 'publicó una receta', item.fecha)}
      <TarjetaReceta titulo={item.titulo} foto={item.foto_url}
        meta={`${item.minutos} min · ${item.dificultad}${Number(item.nota_promedio) > 0 ? ` · ${Number(item.nota_promedio).toFixed(1).replace('.', ',')} estrellas` : ''}`}
        onPress={() => nav.abrir('receta', { id: item.id })} />
    </View>
  ));

  const cabecera = (
    <View style={{ gap: 16, marginBottom: 4 }}>
      <Encabezado titulo="Comunidad" sub="Lo que cocinan y publican tus amigos" />
      {uid ? (
        <View style={s.chips}>
          <Chip texto={`Siguiendo${sigo?.length ? ` · ${sigo.length}` : ''}`} activo={vista === 'siguiendo'} onPress={() => setVista('siguiendo')} />
          <Chip texto="Todos" activo={vista === 'todos'} onPress={() => setVista('todos')} />
          <Chip texto="Buscar amigos" icono="person-add-outline" onPress={() => nav.abrir('amigos')} />
        </View>
      ) : null}
      {uid && sigo && !sigo.length ? (
        <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.doradoTinte }}>
          <Text style={s.etiqueta}>Aún no sigues a nadie</Text>
          <Text style={{ fontSize: 14, color: C.texto }}>Sigue a tus amigos y aquí verás lo que cocinan. Mientras, te muestro lo de todos.</Text>
          <Boton titulo="Encontrar amigos" icono="people-outline" onPress={() => nav.abrir('amigos')} />
        </View>
      ) : null}
      {invitado ? (
        <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.doradoTinte }}>
          <Text style={{ fontSize: 14, color: C.texto }}>Crea tu cuenta para seguir a tus amigos y ver solo lo de ellos.</Text>
          <Boton titulo="Crear mi cuenta" icono="gift-outline" onPress={() => pedirCuenta('Crea tu cuenta para seguir a tus amigos')} />
        </View>
      ) : null}
    </View>
  );

  if (items === null) return <View style={{ flex: 1 }}><View style={s.contenido}>{cabecera}<Esqueleto tipo="fotos" /></View></View>;

  return (
    <>
    <FlatList
      ref={lista}
      data={items}
      keyExtractor={(x) => x.clave}
      renderItem={renderItem}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={vista === 'siguiendo'
        ? <Vacio objeto="people-outline" titulo="Tus amigos aún no publican" texto="Mientras, mira lo que cocinan todos." accion={{ titulo: 'Ver lo de todos', icono: 'globe-outline', onPress: () => setVista('todos') }} />
        : <Vacio objeto="camera-outline" expresion="feliz" titulo="Todavía no hay nada por aquí" texto="¡Sé el primero en compartir una receta!" accion={{ titulo: 'Publicar una receta', icono: 'add', onPress: () => nav.irA('publicar') }} />}
      contentContainerStyle={[s.contenido, { gap: 18 }]}
      refreshControl={refreshControl}
      onScroll={fijo.alScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={6}
      windowSize={7}
      removeClippedSubviews
    />
    {fijo.barra}
    <VisorFotos fotos={visor ? [visor] : []} visible={!!visor} onCerrar={() => setVisor(null)} />
    </>
  );
}
