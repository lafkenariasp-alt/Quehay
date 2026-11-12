import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Pressable, Image, Modal, TextInput, Switch, ScrollView, Animated, Easing, PanResponder, Share, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { useApp, tieneIngrediente } from '../contexto';
import { C } from '../theme';
import { Pantalla, Seccion, Boton, Estrellas, Tarjeta, ErrorCarga, Avatar, Esqueleto, DobleToque, VisorFotos, avisar, s } from '../ui';
import { fotoDelPlato, subirFoto } from '../fotos';
import { reportar } from '../reportar';
import { registrar } from '../analitica';
import { TutorialCapa } from '../tutorial';
import { Foco } from '../foco';
import { efecto } from '../sonido';

const sinDatos = Promise.resolve({ data: null });

// ---------- Porciones: recalcula las cantidades ----------
const FRACC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const NUM = /(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[½¼¾⅓⅔]|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])/g;
function aNumero(txt) {
  const t = txt.trim();
  let m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = t.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*([½¼¾⅓⅔])$/);
  if (m) return Number(m[1].replace(',', '.')) + FRACC[m[2]];
  if (FRACC[t]) return FRACC[t];
  return Number(t.replace(',', '.'));
}
function bonito(n) {
  if (n >= 10) return String(Math.round(n));
  const ent = Math.floor(n + 0.02);
  const resto = n - ent;
  const opciones = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
  const [v, f] = opciones.reduce((a, b) => (Math.abs(b[0] - resto) < Math.abs(a[0] - resto) ? b : a));
  if (Math.abs(v - resto) > 0.09) return (Math.round(n * 10) / 10).toString().replace('.', ',');
  const e = v === 1 ? ent + 1 : ent;
  if (!f) return String(e);
  return e ? `${e} ${f}` : f;
}
export function escalar(cantidad, factor) {
  if (!cantidad || factor === 1) return cantidad;
  return cantidad.replace(NUM, (m) => {
    const n = aNumero(m);
    return Number.isFinite(n) && n > 0 ? bonito(n * factor) : m;
  });
}

// ---------- Temporizador: busca "10 minutos", "1 hora", "20-25 min" en el paso ----------
export function tiempoDelPaso(texto) {
  const m = (texto || '').match(/(\d+(?:[.,]\d+)?|media|un|una)(?:\s*(?:-|a|o)\s*\d+)?\s*(minutos?|min\b|mins\b|horas?|hrs?\b|segundos?|seg\b)/i);
  if (!m) return null;
  const palabra = m[1].toLowerCase();
  const n = palabra === 'media' ? 0.5 : palabra === 'un' || palabra === 'una' ? 1 : Number(palabra.replace(',', '.'));
  const u = m[2].toLowerCase();
  const seg = u.startsWith('h') ? n * 3600 : u.startsWith('s') ? n : n * 60;
  return seg >= 10 && seg <= 6 * 3600 ? Math.round(seg) : null;
}
const reloj = (seg) => {
  const h = Math.floor(seg / 3600); const m = Math.floor((seg % 3600) / 60); const x = seg % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(x).padStart(2, '0')}`;
};

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
  const [guardada, setGuardada] = useState(false);
  const [porciones, setPorciones] = useState(null);
  const [visor, setVisor] = useState(null); // índice de la foto abierta a pantalla completa

  const cargar = useCallback(async () => {
    setError(false);
    const [rec, nev, nota, like, asi, guard] = await Promise.all([
      supabase.from('recetas')
        .select('*, perfiles!recetas_autor_id_fkey(nombre, xp, avatar_url), receta_ingredientes(cantidad, opcional, ingrediente_id, ingredientes(id, nombre, padre_id, es_basico))')
        .eq('id', id).maybeSingle(),
      uid ? supabase.from('nevera').select('ingrediente_id').eq('usuario_id', uid) : sinDatos,
      uid ? supabase.from('notas').select('estrellas').eq('usuario_id', uid).eq('receta_id', id).maybeSingle() : sinDatos,
      uid ? supabase.from('likes').select('receta_id').eq('usuario_id', uid).eq('receta_id', id).maybeSingle() : sinDatos,
      supabase.from('asi_me_quedo').select('id, foto_url, nota, respuesta_creador, usuario_id, perfiles(nombre)').eq('receta_id', id).order('creado_en', { ascending: false }).limit(20),
      uid ? supabase.from('guardadas').select('receta_id').eq('usuario_id', uid).eq('receta_id', id).maybeSingle() : sinDatos,
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
    setGuardada(!!guard.data);
    setPorciones((p) => p || rec.data.porciones || 1);
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
  if (!r) return <Pantalla scroll={false}><Esqueleto tipo="receta" /></Pantalla>;

  const ings = r.receta_ingredientes.map((ri) => {
    const ing = ri.ingredientes;
    const ok = (basicos && ing.es_basico) || tieneIngrediente(ing, setTengo, padres);
    return { ...ri, ing, ok };
  });
  const visibles = ings.filter((i) => !(i.ing.es_basico && basicos));
  const faltan = ings.filter((i) => !i.ok && !i.opcional);
  const usados = ings.filter((i) => !i.ing.es_basico && enNevera.has(i.ingrediente_id)).map((i) => i.ingrediente_id);
  const esMia = !!uid && r.autor_id === uid;
  const base = r.porciones || 1;
  const porc = porciones || base;
  const factor = porc / base;
  // Fotos para ver a pantalla completa: la de la receta y las de "Así me quedó"
  const fotos = [
    ...(r.foto_url ? [{ url: r.foto_url, texto: r.titulo }] : []),
    ...versiones.filter((v) => v.foto_url).map((v) => ({ url: v.foto_url, id: v.id, texto: [v.perfiles?.nombre, v.nota].filter(Boolean).join(': ') })),
  ];

  // Doble toque en la foto: solo da Me gusta (como Instagram, no lo quita)
  function meGustaDoble() {
    if (invitado) { pedirCuenta('Crea tu cuenta para guardar las recetas que te gustan'); return; }
    if (meGusta) { efecto('me_gusta'); return; }
    alternarLike();
  }

  async function alternarGuardada() {
    if (invitado) { pedirCuenta('Crea tu cuenta para guardar recetas y verlas cuando quieras'); return; }
    const nuevo = !guardada;
    setGuardada(nuevo);
    efecto(nuevo ? 'guardar' : 'desmarcar');
    const { error: e } = nuevo
      ? await supabase.from('guardadas').insert({ usuario_id: uid, receta_id: id })
      : await supabase.from('guardadas').delete().eq('usuario_id', uid).eq('receta_id', id);
    if (e) { setGuardada(!nuevo); Alert.alert('Error', e.message); return; }
    avisar({ texto: nuevo ? 'Guardada · la encuentras en tu perfil' : 'Ya no está en tus guardadas', duracion: 2500 });
  }

  // Compartir por WhatsApp (o lo que el teléfono ofrezca)
  async function compartir() {
    const lineas = [
      `🍲 ${r.titulo}`,
      `${r.minutos} min · ${porc} ${porc === 1 ? 'porción' : 'porciones'}`,
      '',
      'Ingredientes:',
      ...visibles.map((i) => `• ${[escalar(i.cantidad, factor), i.ing.nombre.toLowerCase()].filter(Boolean).join(' ')}${i.opcional ? ' (opcional)' : ''}`),
      '',
      'Preparación:',
      ...r.pasos.map((p, n) => `${n + 1}. ${p}`),
      '',
      'Receta de Qué Hay, la app de qué cocino con lo que tengo.',
    ];
    try {
      const res = await Share.share({ message: lineas.join('\n'), title: r.titulo });
      if (res.action === Share.sharedAction) registrar('compartir_receta', { receta: r.id }, uid);
    } catch (e) { /* cancelado */ }
  }

  // Lo que falta va a la lista de compras de la Nevera
  async function agregarFaltantes() {
    if (invitado) { pedirCuenta('Crea tu cuenta para armar tu lista de compras'); return; }
    const ids = faltan.map((i) => i.ingrediente_id);
    const { data: ya, error: e1 } = await supabase.from('compras').select('ingrediente_id').eq('usuario_id', uid).in('ingrediente_id', ids);
    if (e1) { Alert.alert('Falta un paso', 'La lista de compras necesita la migración 010 en Supabase.'); return; }
    const nuevos = ids.filter((x) => !(ya || []).some((y) => y.ingrediente_id === x));
    if (!nuevos.length) { avisar({ texto: 'Ya estaba todo en tu lista de compras', duracion: 2500 }); return; }
    const { error: e2 } = await supabase.from('compras').insert(nuevos.map((x) => ({ usuario_id: uid, ingrediente_id: x, receta_id: r.id })));
    if (e2) { Alert.alert('Error', e2.message); return; }
    efecto('marcar');
    avisar({
      texto: `${nuevos.length === 1 ? 'Agregamos 1 ingrediente' : `Agregamos ${nuevos.length} ingredientes`} a tu lista de compras`,
      onDeshacer: () => supabase.from('compras').delete().eq('usuario_id', uid).in('ingrediente_id', nuevos),
    });
  }

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
      <Pantalla onRefrescar={cargar}>
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
            <Pressable onPress={compartir} accessibilityRole="button" accessibilityLabel="Compartir receta"
              style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="share-outline" size={24} color={C.texto} />
            </Pressable>
            <Pressable onPress={alternarGuardada} accessibilityRole="button" accessibilityState={{ selected: guardada }} accessibilityLabel={guardada ? 'Quitar de guardadas' : 'Guardar receta'}
              style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={guardada ? 'bookmark' : 'bookmark-outline'} size={24} color={C.texto} />
            </Pressable>
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

        <DobleToque onDoble={meGustaDoble} onSimple={r.foto_url ? () => setVisor(0) : undefined} style={{ marginHorizontal: -24 }}>
          {r.foto_url ? (
            <Image source={{ uri: r.foto_url }} style={{ aspectRatio: 16 / 10, backgroundColor: C.superficie }} accessibilityLabel={`Foto de ${r.titulo}. Toca para verla grande`} />
          ) : (
            <View style={{ height: 200, backgroundColor: C.superficie, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="restaurant-outline" size={48} color="#B9A68E" />
            </View>
          )}
        </DobleToque>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: C.texto, letterSpacing: -0.5 }}>{r.titulo}</Text>
          <Text style={{ fontSize: 14, color: C.suave }}>por {r.perfiles?.nombre} · {r.minutos} min · {r.dificultad}</Text>
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
            {/* Porciones: los botones recalculan las cantidades */}
            <View style={[s.filaEntre, { paddingVertical: 4 }]}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.texto }}>Porciones</Text>
              <View style={[s.fila, { gap: 4 }]} accessibilityRole="adjustable" accessibilityLabel="Porciones" accessibilityValue={{ text: String(porc) }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(e) => setPorciones((p) => Math.min(20, Math.max(1, (p || base) + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}>
                <Pressable onPress={() => { efecto('boton'); setPorciones((p) => Math.max(1, (p || base) - 1)); }} disabled={porc <= 1} hitSlop={6} accessibilityLabel="Menos porciones"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.superficie, alignItems: 'center', justifyContent: 'center', opacity: porc <= 1 ? 0.4 : 1 }}>
                  <Ionicons name="remove" size={20} color={C.texto} />
                </Pressable>
                <Text style={{ minWidth: 34, textAlign: 'center', fontSize: 18, fontWeight: '800', color: factor === 1 ? C.texto : C.tomate }}>{porc}</Text>
                <Pressable onPress={() => { efecto('boton'); setPorciones((p) => Math.min(20, (p || base) + 1)); }} disabled={porc >= 20} hitSlop={6} accessibilityLabel="Más porciones"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.superficie, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={20} color={C.texto} />
                </Pressable>
              </View>
            </View>
            {visibles.map((i) => {
              const cant = escalar(i.cantidad, factor);
              return (
                <View key={i.ingrediente_id} style={[s.fila, { minHeight: 28 }]}
                  accessible accessibilityLabel={`${[cant, i.ing.nombre].filter(Boolean).join(' ')}, ${i.ok ? 'lo tienes' : 'te falta'}${i.opcional ? ', opcional' : ''}`}>
                  <Ionicons name={i.ok ? 'checkmark' : 'ellipse-outline'} size={18} color={i.ok ? C.verde : C.ambar} />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: i.ok ? C.verdeOscuro : C.ambarOscuro }}>
                    {[cant, i.ing.nombre.toLowerCase()].filter(Boolean).join(' ')}{i.opcional ? ' (opcional)' : ''}
                  </Text>
                </View>
              );
            })}
            {basicos ? <Text style={{ fontSize: 13, color: C.suave }}>Más sal, aceite y lo básico de tu despensa.</Text> : null}
            {faltan.length ? (
              <Boton tipo="secundario" icono="cart-outline" titulo={faltan.length === 1 ? 'Agregar lo que falta a mi lista' : `Agregar los ${faltan.length} que faltan a mi lista`} onPress={agregarFaltantes} />
            ) : null}
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

        <Seccion titulo="Así me quedó" derecha={<Text style={s.sub}>{r.num_cocinadas} {r.num_cocinadas === 1 ? 'vez cocinada' : 'veces cocinada'}</Text>}>
          {versiones.length === 0 ? (
            <Text style={s.sub}>Nadie ha subido su versión todavía. Cocínala, toca "Lo cociné" y sé el primero.</Text>
          ) : versiones.map((v) => (
            <Tarjeta key={v.id}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {v.foto_url ? (
                  <Pressable onPress={() => setVisor(Math.max(0, fotos.findIndex((f) => f.id === v.id)))} accessibilityRole="imagebutton" accessibilityLabel={`Foto de ${v.perfiles?.nombre}. Toca para verla grande`}>
                    <Image source={{ uri: v.foto_url }} style={{ width: 88, height: 88, borderRadius: 12, backgroundColor: C.superficie }} />
                  </Pressable>
                ) : null}
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
            efecto('xp');
            loCocine();
          }} />
        ) : null}
      </Modal>

      <VisorFotos fotos={fotos} inicio={visor || 0} visible={visor !== null} onCerrar={() => setVisor(null)} />

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
  const [ancho, setAncho] = useState(1);
  const [ayuda, setAyuda] = useState(true); // pista de cómo avanzar: se esconde al primer avance
  const total = receta.pasos.length;
  const ultimo = paso === total - 1;
  const deslizar = useRef(new Animated.Value(0)).current;
  // tutorial: llegar al último paso desbloquea «¡Terminé!»
  useEffect(() => { if (ultimo) tutorial?.evento('ultimo_paso'); }, [ultimo, tutorial?.indice]);

  // Como las historias de Instagram: tocar a la derecha avanza, a la izquierda vuelve; también se puede deslizar
  const ir = useCallback((d) => {
    setPaso((p) => {
      const n = Math.min(Math.max(p + d, 0), total - 1);
      if (n !== p) {
        efecto('paso');
        deslizar.setValue(d * 24);
        Animated.timing(deslizar, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }
      return n;
    });
    setAyuda(false);
  }, [total]);
  const gesto = useRef(PanResponder.create({
    // se captura antes que el scroll vertical, solo si el gesto es claramente horizontal
    onMoveShouldSetPanResponderCapture: (e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (e, g) => { if (g.dx < -40) ir(1); else if (g.dx > 40) ir(-1); },
  })).current;
  const tocar = (e) => ir(e.nativeEvent.locationX < ancho * 0.3 ? -1 : 1);

  // Temporizador: si el paso dice "10 minutos" aparece el botón; sigue corriendo aunque cambies de paso
  const [timer, setTimer] = useState(null); // { fin, paso, total } | { listo: true, paso }
  const [ahora, setAhora] = useState(Date.now());
  const segPaso = tiempoDelPaso(receta.pasos[paso]);
  useEffect(() => {
    if (!timer || timer.listo) return undefined;
    const t = setInterval(() => {
      const n = Date.now();
      setAhora(n);
      if (n >= timer.fin) {
        efecto('temporizador');
        Vibration.vibrate([0, 400, 200, 400]);
        setTimer({ listo: true, paso: timer.paso });
      }
    }, 500);
    return () => clearInterval(t);
  }, [timer]);
  const quedan = timer && !timer.listo ? Math.max(0, Math.ceil((timer.fin - ahora) / 1000)) : 0;
  const iniciarTimer = () => { efecto('boton'); setAhora(Date.now()); setTimer({ fin: Date.now() + segPaso * 1000, paso, total: segPaso }); };

  return (
    <View style={{ flex: 1 }}>
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12, paddingHorizontal: 20, gap: 12 }}>
      {/* Barras de avance por paso, como en las historias */}
      <View style={{ flexDirection: 'row', gap: 4 }} accessible accessibilityLabel={`Paso ${paso + 1} de ${total}`}>
        {receta.pasos.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= paso ? C.tomate : C.linea }} />
        ))}
      </View>
      <View style={s.filaEntre}>
        <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Salir del modo cocina" style={[s.fila, { gap: 6, minHeight: 44, flexShrink: 1 }]}>
          <Ionicons name="close" size={24} color={C.texto} />
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: C.suave, flexShrink: 1 }}>{receta.titulo}</Text>
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: '800', color: C.tomate }}>Paso {paso + 1} de {total}</Text>
      </View>

      <Foco id="texto_paso" style={{ flex: 1 }}>
        <View style={{ flex: 1 }} {...gesto.panHandlers} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
            <Pressable onPress={tocar} accessible={false} style={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 16 }}>
              <Animated.Text style={{ fontSize: 30, lineHeight: 39, fontWeight: '700', color: C.texto, letterSpacing: -0.3, transform: [{ translateX: deslizar }] }}>
                {receta.pasos[paso]}
              </Animated.Text>
            </Pressable>
          </ScrollView>
        </View>
      </Foco>

      {timer ? (
        <View accessibilityLiveRegion="polite" style={[s.filaEntre, { gap: 10, minHeight: 52, paddingLeft: 16, paddingRight: 6, borderRadius: 16, backgroundColor: timer.listo ? C.verde : C.texto }]}>
          <View style={[s.fila, { gap: 8, flex: 1 }]}>
            <Ionicons name={timer.listo ? 'notifications' : 'timer-outline'} size={22} color={C.blanco} />
            <Text style={{ color: C.blanco, fontSize: timer.listo ? 16 : 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
              {timer.listo ? `¡Tiempo! (paso ${timer.paso + 1})` : reloj(quedan)}
            </Text>
            {!timer.listo && timer.paso !== paso ? <Text style={{ color: '#E9DCCB', fontSize: 13, fontWeight: '700' }}>paso {timer.paso + 1}</Text> : null}
          </View>
          <Pressable onPress={() => setTimer(null)} accessibilityRole="button" accessibilityLabel={timer.listo ? 'Listo' : 'Detener temporizador'}
            style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}>
            <Text style={{ color: C.blanco, fontWeight: '800', fontSize: 15 }}>{timer.listo ? 'OK' : 'Detener'}</Text>
          </Pressable>
        </View>
      ) : segPaso ? (
        <Pressable onPress={iniciarTimer} accessibilityRole="button" accessibilityLabel={`Iniciar temporizador de ${reloj(segPaso)}`}
          style={[s.fila, { alignSelf: 'center', gap: 8, minHeight: 48, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5, borderColor: C.tomate, backgroundColor: C.blanco }]}>
          <Ionicons name="timer-outline" size={20} color={C.tomate} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.tomate }}>Iniciar {reloj(segPaso)}</Text>
        </Pressable>
      ) : null}

      {ayuda && total > 1 ? (
        <Text style={[s.sub, { textAlign: 'center', fontSize: 13 }]}>Toca a la derecha para avanzar y a la izquierda para volver, o desliza</Text>
      ) : (
        <Text style={[s.sub, { textAlign: 'center', fontSize: 13 }]}>La pantalla se queda encendida mientras cocinas</Text>
      )}

      {/* Botones chicos (también sirven con VoiceOver); el grande es solo para terminar */}
      <View style={[s.filaEntre, { minHeight: 52 }]}>
        <Pressable onPress={() => ir(-1)} disabled={paso === 0} accessibilityRole="button" accessibilityLabel="Paso anterior"
          style={[s.fila, { gap: 4, minHeight: 44, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.superficie, opacity: paso === 0 ? 0.4 : 1 }]}>
          <Ionicons name="chevron-back" size={18} color={C.texto} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.texto }}>Anterior</Text>
        </Pressable>
        {ultimo ? (
          <Foco id="termine"><Boton tipo="verde" titulo="¡Terminé!" icono="checkmark" onPress={onTerminar} style={{ paddingHorizontal: 28 }} /></Foco>
        ) : (
          <Foco id="siguiente">
            <Pressable onPress={() => ir(1)} accessibilityRole="button" accessibilityLabel="Paso siguiente"
              style={[s.fila, { gap: 4, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.tomateTinte }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.tomateOscuro }}>Siguiente</Text>
              <Ionicons name="chevron-forward" size={18} color={C.tomateOscuro} />
            </Pressable>
          </Foco>
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

  const comentario = nota.trim();
  async function guardar() {
    if (!foto && !comentario) return;
    setGuardando(true);
    try {
      // ¿ya la había cocinado con foto? (el XP es solo la primera vez)
      const { count } = await supabase.from('asi_me_quedo').select('id', { count: 'exact', head: true })
        .eq('receta_id', receta.id).eq('usuario_id', uid).not('foto_url', 'is', null);
      const url = foto ? await subirFoto(uid, foto, `plato-${receta.id}`) : null;
      const { error } = await supabase.from('asi_me_quedo').insert({
        receta_id: receta.id, usuario_id: uid, foto_url: url, foto_hash: foto ? foto.hash : null, nota: comentario || null,
      });
      if (error) {
        if (error.code === '23505') throw new Error('Esa foto ya se usó antes. Toma una foto nueva de tu plato.');
        throw error;
      }
      if (descontar && usados.length) {
        await supabase.from('nevera').delete().eq('usuario_id', uid).in('ingrediente_id', usados);
      }
      registrar('lo_cocine', { receta: receta.id, primera: !count, foto: !!foto }, uid);
      let xp;
      if (!foto) xp = 'Tu comentario quedó guardado. Con foto del plato ganas XP y avanzas en tus logros.';
      else if (esMia) xp = 'En tus propias recetas no se gana XP, pero cuenta para tus rachas y logros.';
      else xp = count ? 'Ya la habías cocinado: cuenta para tus rachas y logros.' : '¡Ganaste 20 XP y el creador ganó 30!';
      efecto(foto ? 'xp' : 'boton');
      Alert.alert(foto ? '¡Buen provecho!' : '¡Gracias!', [xp, descontar && usados.length ? `Quitamos ${usados.length} ${usados.length === 1 ? 'ingrediente' : 'ingredientes'} de tu nevera.` : ''].filter(Boolean).join('\n'));
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
              <Text style={[s.sub, { textAlign: 'center' }]}>Con foto ganas XP, avanzas en tus logros y apareces en «Así me quedó»</Text>
            </View>
          )}
        </Pressable>
        {foto ? <Boton tipo="neutro" titulo="Tomar otra foto" icono="camera-reverse-outline" onPress={tomar} /> : null}

        <TextInput style={[s.input, { minHeight: 80, paddingTop: 12 }]} multiline placeholder={foto ? 'Cuéntale al creador cómo te fue (opcional)' : 'Sin foto, déjale un comentario al creador'}
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

        <Boton titulo={foto ? 'Guardar mi plato' : comentario ? 'Guardar comentario (sin XP)' : 'Toma una foto o escribe un comentario'}
          icono="checkmark" deshabilitado={!foto && !comentario} cargando={guardando} onPress={guardar} />
      </ScrollView>
    </Modal>
  );
}
