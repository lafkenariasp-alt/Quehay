import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Pressable, Image, Modal, TextInput, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { useApp, tieneIngrediente } from '../contexto';
import { C } from '../theme';
import { Pantalla, Seccion, Boton, Estrellas, Tarjeta, Cargando, ErrorCarga, Avatar, s } from '../ui';
import { fotoDelPlato, subirFoto } from '../fotos';
import { reportar } from '../reportar';
import { registrar } from '../analitica';
import { TutorialCapa } from '../tutorial';
import { Foco } from '../foco';
import { efecto } from '../sonido';

const sinDatos = Promise.resolve({ data: null });

export default function Receta({ id, tengo = null, basicos = true }) {
  const { uid, invitado, nav, recargarPerfil, pedirCuenta, tutorial, chefpu } = useApp();
  const [r, setR] = useState(null);
  const [error, setError] = useState(false);
  const [setTengo, setSetTengo] = useState(new Set());
  const [padres, setPadres] = useState(new Set());
  const [enNevera, setEnNevera] = useState(new Set());
  const [miNota, setMiNota] = useState(0);
  const [meGusta, setMeGusta] = useState(false);
  const [versiones, setVersiones] = useState([]);
  const [cocine, setCocine] = useState(false); // ventana "Lo cociné"
  const [modoCocina, setModoCocina] = useState(false);
  const [respuestas, setRespuestas] = useState({}); // borradores de respuesta del creador

  const cargar = useCallback(async () => {
    setError(false);
    const [rec, nev, nota, like, asi] = await Promise.all([
      supabase.from('recetas')
        .select('*, perfiles!recetas_autor_id_fkey(nombre, xp, avatar_url), receta_ingredientes(cantidad, opcional, ingrediente_id, ingredientes(id, nombre, padre_id, es_basico))')
        .eq('id', id).maybeSingle(),
      uid ? supabase.from('nevera').select('ingrediente_id').eq('usuario_id', uid) : sinDatos,
      uid ? supabase.from('notas').select('estrellas').eq('usuario_id', uid).eq('receta_id', id).maybeSingle() : sinDatos,
      uid ? supabase.from('likes').select('receta_id').eq('usuario_id', uid).eq('receta_id', id).maybeSingle() : sinDatos,
      supabase.from('asi_me_quedo').select('id, foto_url, nota, respuesta_creador, usuario_id, perfiles(nombre)').eq('receta_id', id).order('creado_en', { ascending: false }).limit(20),
    ]);
    if (rec.error || !rec.data) { setError(true); return; }
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
  }, [id, uid]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { tutorial?.evento('abrir_receta'); }, []); // tutorial: abrió su primera receta

  // Chefpu comenta si tienes todo o qué falta
  useEffect(() => {
    if (!r) return;
    const falta = r.receta_ingredientes.filter((ri) => !ri.opcional && !(basicos && ri.ingredientes.es_basico) && !tieneIngrediente(ri.ingredientes, setTengo, padres));
    if (!falta.length) chefpu?.decir('receta_todo', '¡Está todo! Toca Paso a paso y cocinamos juntos.', 'feliz');
    else if (falta.length === 1) chefpu?.decir('receta_falta1', `Te falta ${falta[0].ingredientes.nombre.toLowerCase()}. A veces se puede omitir, mira cómo les quedó a otros.`, 'pensando');
  }, [r]);

  if (error) return <ErrorCarga mensaje="Esta receta no se pudo abrir. Puede que ya no esté disponible o que falle tu conexión." onReintentar={cargar} onVolver={nav.volver} />;
  if (!r) return <Cargando />;

  const ings = r.receta_ingredientes.map((ri) => {
    const ing = ri.ingredientes;
    const ok = (basicos && ing.es_basico) || tieneIngrediente(ing, setTengo, padres);
    return { ...ri, ing, ok };
  });
  const visibles = ings.filter((i) => !(i.ing.es_basico && basicos));
  const faltan = ings.filter((i) => !i.ok && !i.opcional);
  const usados = ings.filter((i) => !i.ing.es_basico && enNevera.has(i.ingrediente_id)).map((i) => i.ingrediente_id);
  const esMia = !!uid && r.autor_id === uid;

  async function puntuar(n) {
    if (invitado) { pedirCuenta('Crea tu cuenta para calificar recetas'); return; }
    setMiNota(n);
    efecto('marcar');
    const { error: e } = await supabase.from('notas').upsert({ usuario_id: uid, receta_id: id, estrellas: n });
    if (e) Alert.alert('Error', e.message); else cargar();
  }

  async function alternarLike() {
    if (invitado) { pedirCuenta('Crea tu cuenta para guardar las recetas que te gustan'); return; }
    const nuevo = !meGusta;
    setMeGusta(nuevo);
    if (nuevo) efecto('me_gusta');
    const q = nuevo
      ? supabase.from('likes').insert({ usuario_id: uid, receta_id: id })
      : supabase.from('likes').delete().eq('usuario_id', uid).eq('receta_id', id);
    const { error: e } = await q;
    if (e) { setMeGusta(!nuevo); Alert.alert('Error', e.message); } else { cargar(); recargarPerfil(); }
  }

  function loCocine() {
    if (invitado) { pedirCuenta('¡Te quedó rico! Tu plato y tus 20 XP están listos: guárdalos.'); return; }
    setCocine(true);
  }

  async function responder(versionId) {
    const texto = (respuestas[versionId] || '').trim();
    if (!texto) return;
    const { error: e } = await supabase.from('asi_me_quedo').update({ respuesta_creador: texto }).eq('id', versionId);
    if (e) return Alert.alert('Error', e.message);
    setRespuestas((x) => ({ ...x, [versionId]: '' }));
    recargarPerfil();
    cargar();
  }

  return (
    <Foco id="pantalla_receta" style={{ flex: 1 }}>
      <Pantalla>
        <View style={s.filaEntre}>
          <Pressable onPress={nav.volver} accessibilityRole="button" accessibilityLabel="Volver" style={[s.fila, { gap: 2, minHeight: 44 }]}>
            <Ionicons name="chevron-back" size={22} color={C.suave} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.suave }}>Volver</Text>
          </Pressable>
          <View style={[s.fila, { gap: 4 }]}>
            {!esMia ? (
              <Pressable onPress={() => reportar({ uid, tipo: 'receta', objetoId: r.id, pedirCuenta })} accessibilityRole="button" accessibilityLabel="Reportar receta"
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="flag-outline" size={22} color={C.suave} />
              </Pressable>
            ) : null}
            <Pressable onPress={alternarLike} accessibilityRole="button" accessibilityState={{ selected: !!meGusta }} accessibilityLabel={meGusta ? 'Quitar me gusta' : 'Me gusta'}
              style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={meGusta ? 'heart' : 'heart-outline'} size={28} color={C.tomate} />
            </Pressable>
          </View>
        </View>

        {r.oculta ? (
          <View style={{ padding: 12, borderRadius: 14, backgroundColor: C.ambarTinte }}>
            <Text style={{ fontWeight: '800', color: C.ambarOscuro }}>Esta receta está oculta mientras revisamos unos reportes. Solo tú la ves.</Text>
          </View>
        ) : null}

        {r.foto_url ? (
          <Image source={{ uri: r.foto_url }} style={{ marginHorizontal: -24, aspectRatio: 16 / 10, backgroundColor: C.superficie }} accessibilityLabel={`Foto de ${r.titulo}`} />
        ) : (
          <View style={{ marginHorizontal: -24, height: 200, backgroundColor: C.superficie, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="restaurant-outline" size={48} color="#B9A68E" />
          </View>
        )}

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: C.texto, letterSpacing: -0.5 }}>{r.titulo}</Text>
          <Text style={{ fontSize: 14, color: C.suave }}>por {r.perfiles?.nombre} · {r.minutos} min · {r.porciones} porciones · {r.dificultad}</Text>
          <View style={s.fila}>
            <Estrellas valor={Number(r.nota_promedio)} />
            <Text style={{ fontSize: 13, color: C.suave }}>{r.num_notas ? `${Number(r.nota_promedio).toFixed(1).replace('.', ',')} (${r.num_notas}) · ${r.num_likes} me gusta` : `Sin notas aún · ${r.num_likes} me gusta`}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Foco id="paso_a_paso" style={{ flex: 1 }}>
            <Boton titulo="Paso a paso" icono="play" onPress={() => { setModoCocina(true); registrar('modo_cocina', {}, uid); tutorial?.evento('paso_a_paso'); }} />
          </Foco>
          <Boton tipo="neutro" titulo="Lo cociné" icono="camera-outline" onPress={loCocine} style={{ flex: 1 }} />
        </View>

        {!esMia ? (
          <Tarjeta onPress={() => nav.abrir('perfilPublico', { id: r.autor_id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.superficie, borderWidth: 0 }}>
            <Avatar url={r.perfiles?.avatar_url} nombre={r.perfiles?.nombre} tam={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.etiqueta}>{r.perfiles?.nombre}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.ambarTexto }}>Creador · ver perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.suave} />
          </Tarjeta>
        ) : null}

        {r.descripcion ? <Text style={{ fontSize: 15, color: C.texto, lineHeight: 21 }}>{r.descripcion}</Text> : null}

        <Foco id="ingredientes">
          <Tarjeta style={{ gap: 8 }}>
            <View style={s.filaEntre}>
              <Text style={s.seccion}>Ingredientes</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: faltan.length ? C.ambarOscuro : C.verde }}>
                {faltan.length ? `Te ${faltan.length === 1 ? 'falta' : 'faltan'} ${faltan.length}` : 'Tienes todo'}
              </Text>
            </View>
            {visibles.map((i) => (
              <View key={i.ingrediente_id} style={[s.fila, { minHeight: 28 }]}
                accessible accessibilityLabel={`${[i.cantidad, i.ing.nombre].filter(Boolean).join(' ')}, ${i.ok ? 'lo tienes' : 'te falta'}${i.opcional ? ', opcional' : ''}`}>
                <Ionicons name={i.ok ? 'checkmark' : 'ellipse-outline'} size={18} color={i.ok ? C.verde : C.ambar} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: i.ok ? C.verdeOscuro : C.ambarOscuro }}>
                  {[i.cantidad, i.ing.nombre.toLowerCase()].filter(Boolean).join(' ')}{i.opcional ? ' (opcional)' : ''}
                </Text>
              </View>
            ))}
            {basicos ? <Text style={{ fontSize: 13, color: C.suave }}>Más sal, aceite y lo básico de tu despensa.</Text> : null}
          </Tarjeta>
        </Foco>

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

        <Tarjeta>
          <Text style={s.seccion}>Tu nota</Text>
          {esMia ? (
            <Text style={{ fontSize: 14, color: C.suave }}>Es tu receta: la califican los demás. Así nadie puede subirse la nota a sí mismo.</Text>
          ) : (
            <>
              <Estrellas valor={miNota} tam={32} onCambiar={puntuar} />
              <Text style={{ fontSize: 14, color: C.suave }}>{miNota ? '¡Gracias! Puedes cambiarla cuando quieras.' : 'Toca una estrella para calificar.'}</Text>
            </>
          )}
        </Tarjeta>

        <Seccion titulo="Así me quedó" derecha={<Text style={s.sub}>{r.num_cocinadas} veces cocinada</Text>}>
          {versiones.length === 0 ? (
            <Text style={s.sub}>Nadie ha subido su versión todavía. Cocínala, toca "Lo cociné" y sé el primero.</Text>
          ) : versiones.map((v) => (
            <Tarjeta key={v.id}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Image source={{ uri: v.foto_url }} style={{ width: 88, height: 88, borderRadius: 12, backgroundColor: C.superficie }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.filaEntre}>
                    <Text style={s.etiqueta}>{v.perfiles?.nombre}{v.usuario_id === uid ? ' (tú)' : ''}</Text>
                    {v.usuario_id !== uid ? (
                      <Pressable onPress={() => reportar({ uid, tipo: 'asi_me_quedo', objetoId: v.id, pedirCuenta })} hitSlop={14} accessibilityRole="button" accessibilityLabel="Reportar esta foto">
                        <Ionicons name="flag-outline" size={18} color={C.suave} />
                      </Pressable>
                    ) : null}
                  </View>
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
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="Responde como creador (+10 XP)" placeholderTextColor={C.suave}
                    value={respuestas[v.id] || ''} onChangeText={(t) => setRespuestas((x) => ({ ...x, [v.id]: t }))} maxLength={500} />
                  <Pressable onPress={() => responder(v.id)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Enviar respuesta"
                    style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.tomate, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="send" size={18} color={C.blanco} />
                  </Pressable>
                </View>
              ) : null}
            </Tarjeta>
          ))}
        </Seccion>
      </Pantalla>

      <Modal visible={modoCocina} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setModoCocina(false)}>
        {modoCocina ? (
          <ModoCocina receta={r} onCerrar={() => setModoCocina(false)} onTerminar={() => {
            setModoCocina(false);
            // En el tutorial, terminar entrega el regalo y no pide cuenta (beta)
            if (tutorial?.activo && tutorial.linea?.esperar?.evento === 'termine') { tutorial.evento('termine'); return; }
            efecto('logro');
            loCocine();
          }} />
        ) : null}
      </Modal>

      <VentanaCocine
        visible={cocine}
        receta={r}
        usados={usados}
        esMia={esMia}
        onCerrar={() => setCocine(false)}
        onListo={() => { setCocine(false); cargar(); recargarPerfil(); setTimeout(() => chefpu?.decir('cocine', '¡Qué buena pinta! Sigue así y subes de nivel.', 'celebrando'), 1200); }}
      />
    </Foco>
  );
}

// Pasos grandes, uno a la vez, con la pantalla siempre encendida
function ModoCocina({ receta, onCerrar, onTerminar }) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { tutorial } = useApp();
  const [paso, setPaso] = useState(0);
  const total = receta.pasos.length;
  const ultimo = paso === total - 1;
  // tutorial: llegar al último paso desbloquea «¡Terminé!»
  useEffect(() => { if (ultimo) tutorial?.evento('ultimo_paso'); }, [ultimo, tutorial?.indice]);
  return (
    <View style={{ flex: 1 }}>
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, paddingHorizontal: 24, gap: 14 }}>
      <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Salir del modo cocina" style={[s.fila, { gap: 6, minHeight: 44, alignSelf: 'flex-start' }]}>
        <Ionicons name="close" size={22} color={C.suave} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.suave }}>{receta.titulo}</Text>
      </Pressable>
      <Text style={{ fontSize: 15, fontWeight: '800', color: C.tomate }}>Paso {paso + 1} de {total}</Text>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.linea, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(((paso + 1) / total) * 100)}%`, height: '100%', backgroundColor: C.tomate }} />
      </View>
      <Foco id="texto_paso" style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, lineHeight: 39, fontWeight: '700', color: C.texto, letterSpacing: -0.3 }}>{receta.pasos[paso]}</Text>
        </ScrollView>
      </Foco>
      <Text style={[s.sub, { textAlign: 'center' }]}>La pantalla se queda encendida mientras cocinas</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Boton tipo="neutro" titulo="Anterior" icono="chevron-back" deshabilitado={paso === 0} onPress={() => { efecto('paso'); setPaso(paso - 1); }} style={{ flex: 1 }} />
        {ultimo ? (
          <Foco id="termine" style={{ flex: 1 }}><Boton tipo="verde" titulo="¡Terminé!" icono="checkmark" onPress={onTerminar} /></Foco>
        ) : (
          <Foco id="siguiente" style={{ flex: 1 }}><Boton titulo="Siguiente" icono="chevron-forward" onPress={() => { efecto('paso'); setPaso(paso + 1); }} /></Foco>
        )}
      </View>
    </View>
      <TutorialCapa capa="cocina" />
    </View>
  );
}

// "Lo cociné": foto obligatoria tomada con la cámara en el momento
function VentanaCocine({ visible, receta, usados, esMia, onCerrar, onListo }) {
  const { uid } = useApp();
  const [foto, setFoto] = useState(null);
  const [nota, setNota] = useState('');
  const [descontar, setDescontar] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (visible) { setFoto(null); setNota(''); setDescontar(true); } }, [visible]);

  async function tomar() {
    const f = await fotoDelPlato();
    if (f) setFoto(f);
  }

  async function guardar() {
    if (!foto) return;
    setGuardando(true);
    try {
      // ¿ya la había cocinado? (el XP es solo la primera vez)
      const { count } = await supabase.from('asi_me_quedo').select('id', { count: 'exact', head: true }).eq('receta_id', receta.id).eq('usuario_id', uid);
      const url = await subirFoto(uid, foto, `plato-${receta.id}`);
      const { error } = await supabase.from('asi_me_quedo').insert({
        receta_id: receta.id, usuario_id: uid, foto_url: url, foto_hash: foto.hash, nota: nota.trim() || null,
      });
      if (error) {
        if (error.code === '23505') throw new Error('Esa foto ya se usó antes. Toma una foto nueva de tu plato.');
        throw error;
      }
      if (descontar && usados.length) {
        await supabase.from('nevera').delete().eq('usuario_id', uid).in('ingrediente_id', usados);
      }
      registrar('lo_cocine', { receta: receta.id, primera: !count }, uid);
      const xp = esMia ? 'En tus propias recetas no se gana XP, pero cuenta para tus rachas y logros.'
        : count ? 'Ya la habías cocinado: cuenta para tus rachas y logros.' : '¡Ganaste 20 XP y el creador ganó 30!';
      efecto('xp');
      Alert.alert('¡Buen provecho!', [xp, descontar && usados.length ? `Quitamos ${usados.length} ${usados.length === 1 ? 'ingrediente' : 'ingredientes'} de tu nevera.` : ''].filter(Boolean).join('\n'));
      onListo();
    } catch (e) {
      Alert.alert('No se pudo guardar', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <ScrollView style={{ flex: 1, backgroundColor: C.fondo }} contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
        <View style={s.filaEntre}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: C.texto, letterSpacing: -0.5 }}>¿Cómo te quedó?</Text>
          <Pressable onPress={onCerrar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={26} color={C.texto} />
          </Pressable>
        </View>
        <Text style={s.sub}>{receta.titulo} · la foto se toma con la cámara en este momento</Text>

        <Pressable onPress={tomar} accessibilityRole="button" accessibilityLabel={foto ? 'Tomar otra foto del plato' : 'Tomar foto del plato con la cámara'}
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 18, borderWidth: 2, borderStyle: foto ? 'solid' : 'dashed', borderColor: foto ? C.verde : '#CBBBA5', backgroundColor: C.blanco, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {foto ? (
            <Image source={{ uri: foto.uri }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <View style={{ alignItems: 'center', gap: 8, padding: 16 }}>
              <Ionicons name="camera-outline" size={44} color={C.tomate} />
              <Text style={s.etiqueta}>Toma una foto de tu plato</Text>
              <Text style={[s.sub, { textAlign: 'center' }]}>Es obligatoria: así todos saben que de verdad se cocinó</Text>
            </View>
          )}
        </Pressable>
        {foto ? <Boton tipo="neutro" titulo="Tomar otra foto" icono="camera-reverse-outline" onPress={tomar} /> : null}

        <TextInput style={[s.input, { minHeight: 80, paddingTop: 12 }]} multiline placeholder="Cuéntale al creador cómo te fue (opcional)"
          placeholderTextColor={C.suave} value={nota} onChangeText={setNota} maxLength={500} />

        {usados.length ? (
          <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.etiqueta}>Quitar de mi nevera lo que usé</Text>
              <Text style={s.sub}>{usados.length} {usados.length === 1 ? 'ingrediente' : 'ingredientes'} de esta receta</Text>
            </View>
            <Switch value={descontar} onValueChange={setDescontar} trackColor={{ true: C.verde, false: '#CBBBA5' }} />
          </Tarjeta>
        ) : null}

        <Boton titulo={foto ? 'Guardar mi plato' : 'Primero toma la foto'} icono="checkmark" deshabilitado={!foto} cargando={guardando} onPress={guardar} />
      </ScrollView>
    </Modal>
  );
}
