import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Pressable, Image, Modal, TextInput, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp, tieneIngrediente } from '../contexto';
import { C } from '../theme';
import { Pantalla, Encabezado, Seccion, Grilla, Casilla, Boton, Estrellas, Tarjeta, Cargando, s } from '../ui';
import { elegirFoto, subirFoto } from '../fotos';

export default function Receta({ id, tengo = null, basicos = true }) {
  const { uid, nav, recargarPerfil } = useApp();
  const [r, setR] = useState(null);
  const [setTengo, setSetTengo] = useState(new Set());
  const [padres, setPadres] = useState(new Set());
  const [enNevera, setEnNevera] = useState(new Set());
  const [miNota, setMiNota] = useState(0);
  const [meGusta, setMeGusta] = useState(false);
  const [versiones, setVersiones] = useState([]);
  const [cocine, setCocine] = useState(false); // ventana "Lo cociné"
  const [respuestas, setRespuestas] = useState({}); // borradores de respuesta del creador

  const cargar = useCallback(async () => {
    const [rec, nev, nota, like, asi] = await Promise.all([
      supabase.from('recetas')
        .select('*, perfiles!recetas_autor_id_fkey(nombre, xp), receta_ingredientes(cantidad, opcional, ingrediente_id, ingredientes(id, nombre, padre_id, es_basico))')
        .eq('id', id).single(),
      supabase.from('nevera').select('ingrediente_id').eq('usuario_id', uid),
      supabase.from('notas').select('estrellas').eq('usuario_id', uid).eq('receta_id', id).maybeSingle(),
      supabase.from('likes').select('receta_id').eq('usuario_id', uid).eq('receta_id', id).maybeSingle(),
      supabase.from('asi_me_quedo').select('id, foto_url, nota, respuesta_creador, usuario_id, perfiles(nombre)').eq('receta_id', id).order('creado_en', { ascending: false }).limit(20),
    ]);
    if (rec.error) { Alert.alert('Error', rec.error.message); return; }
    const neveraIds = (nev.data || []).map((n) => n.ingrediente_id);
    const ids = tengo || neveraIds;
    let padresSet = new Set();
    if (ids.length) {
      const { data } = await supabase.from('ingredientes').select('padre_id').in('id', ids).not('padre_id', 'is', null);
      padresSet = new Set((data || []).map((d) => d.padre_id));
    }
    setSetTengo(new Set(ids));
    setEnNevera(new Set(neveraIds));
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
  const usados = ings.filter((i) => !i.ing.es_basico && enNevera.has(i.ingrediente_id)).map((i) => i.ingrediente_id);
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
    if (error) { setMeGusta(!nuevo); Alert.alert('Error', error.message); } else { cargar(); recargarPerfil(); }
  }

  async function responder(versionId) {
    const texto = (respuestas[versionId] || '').trim();
    if (!texto) return;
    const { error } = await supabase.from('asi_me_quedo').update({ respuesta_creador: texto }).eq('id', versionId);
    if (error) return Alert.alert('Error', error.message);
    setRespuestas((x) => ({ ...x, [versionId]: '' }));
    recargarPerfil();
    cargar();
  }

  return (
    <View style={{ flex: 1 }}>
      <Pantalla pie={<Boton titulo="Lo cociné" icono="checkmark-circle-outline" onPress={() => setCocine(true)} />}>
        <Encabezado
          onVolver={nav.volver}
          titulo={r.titulo}
          derecha={
            <Pressable onPress={alternarLike} hitSlop={10} accessibilityLabel={meGusta ? 'Quitar me gusta' : 'Me gusta'}>
              <Ionicons name={meGusta ? 'heart' : 'heart-outline'} size={28} color={C.tomate} />
            </Pressable>
          }
        />

        {r.foto_url ? (
          <Image source={{ uri: r.foto_url }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: C.superficie }} />
        ) : null}

        <View style={[s.fila, { flexWrap: 'wrap', gap: 14 }]}>
          <View style={s.fila}>
            <Estrellas valor={Number(r.nota_promedio)} />
            <Text style={s.sub}>{r.num_notas ? `${Number(r.nota_promedio).toFixed(1)} (${r.num_notas})` : 'Sin notas aún'}</Text>
          </View>
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

        <Seccion titulo="Tu nota">
          {esMia ? (
            <Text style={s.sub}>Es tu receta: la califican los demás. Así nadie puede subirse la nota a sí mismo.</Text>
          ) : (
            <>
              <Estrellas valor={miNota} tam={32} onCambiar={puntuar} />
              <Text style={s.sub}>{miNota ? '¡Gracias! Puedes cambiarla cuando quieras.' : 'Toca una estrella para calificar.'}</Text>
            </>
          )}
        </Seccion>

        <Seccion titulo="Así me quedó" derecha={<Text style={s.sub}>{r.num_cocinadas} la cocinaron</Text>}>
          {versiones.length === 0 ? (
            <Text style={s.sub}>Nadie ha subido su versión todavía. Toca "Lo cociné" y sé el primero (+20 XP).</Text>
          ) : versiones.map((v) => (
            <Tarjeta key={v.id}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Image source={{ uri: v.foto_url }} style={{ width: 88, height: 88, borderRadius: 12, backgroundColor: C.superficie }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.etiqueta}>{v.perfiles?.nombre}{v.usuario_id === uid ? ' (tú)' : ''}</Text>
                  {v.nota ? <Text style={{ color: C.texto, lineHeight: 20 }}>{v.nota}</Text> : null}
                </View>
              </View>
              {v.respuesta_creador ? (
                <View style={{ backgroundColor: C.tomateTinte, padding: 10, borderRadius: 12, marginLeft: 20 }}>
                  <Text style={{ fontWeight: '800', color: C.tomateOscuro }}>{r.perfiles?.nombre} · creador</Text>
                  <Text style={{ color: C.texto }}>{v.respuesta_creador}</Text>
                </View>
              ) : esMia && v.usuario_id !== uid ? (
                <View style={[s.fila, { marginLeft: 20 }]}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Responde como creador (+10 XP)"
                    placeholderTextColor={C.suave}
                    value={respuestas[v.id] || ''}
                    onChangeText={(t) => setRespuestas((x) => ({ ...x, [v.id]: t }))}
                    maxLength={500}
                  />
                  <Pressable onPress={() => responder(v.id)} hitSlop={8} accessibilityLabel="Enviar respuesta"
                    style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.tomate, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="send" size={18} color={C.blanco} />
                  </Pressable>
                </View>
              ) : null}
            </Tarjeta>
          ))}
        </Seccion>
      </Pantalla>

      <VentanaCocine
        visible={cocine}
        receta={r}
        usados={usados}
        onCerrar={() => setCocine(false)}
        onListo={() => { setCocine(false); cargar(); recargarPerfil(); }}
      />
    </View>
  );
}

// Ventana que aparece al tocar "Lo cociné": foto + nota (así me quedó) y descontar de la nevera
function VentanaCocine({ visible, receta, usados, onCerrar, onListo }) {
  const { uid } = useApp();
  const [foto, setFoto] = useState(null);
  const [nota, setNota] = useState('');
  const [descontar, setDescontar] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (visible) { setFoto(null); setNota(''); setDescontar(true); } }, [visible]);

  async function guardar() {
    setGuardando(true);
    try {
      const mensajes = [];
      if (foto) {
        const url = await subirFoto(uid, foto, `asi-${receta.id}`);
        const { error } = await supabase.from('asi_me_quedo').insert({
          receta_id: receta.id, usuario_id: uid, foto_url: url, nota: nota.trim() || null,
        });
        if (error) throw error;
        mensajes.push('Subiste tu versión: +20 XP');
      }
      if (descontar && usados.length) {
        const { error } = await supabase.from('nevera').delete().eq('usuario_id', uid).in('ingrediente_id', usados);
        if (error) throw error;
        mensajes.push(`Quitamos ${usados.length} ${usados.length === 1 ? 'ingrediente' : 'ingredientes'} de tu nevera`);
      }
      Alert.alert('¡Buen provecho!', mensajes.join('\n') || 'Que lo disfrutes.');
      onListo();
    } catch (e) {
      Alert.alert('No se pudo guardar', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <ScrollView style={{ flex: 1, backgroundColor: C.fondo }} contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
        <View style={s.filaEntre}>
          <Text style={s.seccion}>¿Cómo te quedó?</Text>
          <Pressable onPress={onCerrar} hitSlop={10} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={26} color={C.texto} />
          </Pressable>
        </View>
        <Text style={s.sub}>{receta.titulo}</Text>

        <Pressable onPress={async () => { const f = await elegirFoto(); if (f) setFoto(f); }}
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 18, borderWidth: 2, borderStyle: foto ? 'solid' : 'dashed', borderColor: foto ? C.verde : '#CBBBA5', backgroundColor: C.blanco, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {foto ? (
            <Image source={{ uri: foto.uri }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Ionicons name="camera-outline" size={40} color={C.suave} />
              <Text style={s.etiqueta}>Agrega una foto de tu plato</Text>
              <Text style={s.sub}>Ganas 20 XP y el creador gana 30</Text>
            </View>
          )}
        </Pressable>

        {foto ? (
          <TextInput
            style={[s.input, { minHeight: 80, paddingTop: 12 }]}
            multiline
            placeholder="Cuéntale al creador cómo te fue (opcional)"
            placeholderTextColor={C.suave}
            value={nota}
            onChangeText={setNota}
            maxLength={500}
          />
        ) : null}

        {usados.length ? (
          <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.etiqueta}>Quitar de mi nevera lo que usé</Text>
              <Text style={s.sub}>{usados.length} {usados.length === 1 ? 'ingrediente' : 'ingredientes'} de esta receta</Text>
            </View>
            <Switch value={descontar} onValueChange={setDescontar} trackColor={{ true: C.verde, false: '#CBBBA5' }} />
          </Tarjeta>
        ) : null}

        <Boton titulo={foto ? 'Guardar' : 'Listo, sin foto'} icono="checkmark" cargando={guardando} onPress={guardar} />
      </ScrollView>
    </Modal>
  );
}
