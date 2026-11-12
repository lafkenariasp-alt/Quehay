import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Alert, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp, diasHasta, textoVence } from '../contexto';
import { C, CATEGORIAS_ING } from '../theme';
import { Boton, Encabezado, Vacio, Tarjeta, Interruptor, ErrorCarga, Esqueleto, FilaDeslizable, avisar, useVolverArriba, useRefrescar, s } from '../ui';
import { PideCuenta } from '../mascota';
import SelectorIngredientes from '../SelectorIngredientes';
import { efecto } from '../sonido';

// Dos listas en la misma pestaña: lo que hay en casa y lo que hay que comprar
export default function Nevera({ activa }) {
  const { uid, invitado, perfil, recargarPerfil, nav, pedirCuenta, chefpu } = useApp();
  const [error, setError] = useState(false);
  const [items, setItems] = useState([]);
  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [selector, setSelector] = useState(null); // 'nevera' | 'compras' | null
  const [vista, setVista] = useState('casa'); // 'casa' | 'comprar'
  const vencimiento = !!perfil?.control_vencimiento;
  const ref = useRef(null);
  useVolverArriba(ref);

  const cargar = useCallback(async () => {
    if (!uid) return;
    setError(false);
    const [n, c] = await Promise.all([
      supabase.from('nevera').select('ingrediente_id, vence_el, ingredientes(nombre, categoria)').eq('usuario_id', uid).order('agregado_en'),
      supabase.from('compras').select('ingrediente_id, receta_id, ingredientes(nombre, categoria)').eq('usuario_id', uid).order('agregado_en'),
    ]);
    if (n.error) { setError(true); setCargando(false); return; }
    setItems(n.data || []);
    setCompras(c.error ? [] : c.data || []); // sin la migración 010 la lista queda vacía
    setCargando(false);
    // Chefpu comenta el estado de la nevera
    const lista = n.data || [];
    const vence = perfil?.control_vencimiento ? lista.find((i) => { const d = diasHasta(i.vence_el); return d !== null && d >= 0 && d <= 1; }) : null;
    if (!lista.length) chefpu?.decir('nevera_vacia', '¿Y si llenamos la nevera? Agrega lo que tienes y te digo qué cocinar.', 'pensando');
    else if (vence) chefpu?.decir('nevera_vence', `¡Ojo! ${vence.ingredientes.nombre} vence ${textoVence(diasHasta(vence.vence_el)).toLowerCase()}. ¿Vemos qué hacer?`, 'pensando');
    else if (lista.length >= 5) chefpu?.decir('nevera_llena', 'Con esto ya hay harto para cocinar. Toca ¿Qué cocino? en mi menú.', 'feliz');
  }, [uid, perfil?.control_vencimiento]);

  useEffect(() => { if (activa) cargar(); }, [activa, cargar]); // recarga al volver a la pestaña
  const refreshControl = useRefrescar(cargar);

  // ---------- Nevera ----------
  async function agregar(ing) {
    setItems((l) => [...l, { ingrediente_id: ing.id, vence_el: null, ingredientes: { nombre: ing.nombre, categoria: ing.categoria } }]);
    const { error: e } = await supabase.from('nevera').upsert(
      { usuario_id: uid, ingrediente_id: ing.id },
      { onConflict: 'usuario_id,ingrediente_id', ignoreDuplicates: true },
    );
    if (e) { Alert.alert('Error', e.message); cargar(); }
  }

  async function quitarRapido(ing) {
    setItems((l) => l.filter((i) => i.ingrediente_id !== ing.id));
    await supabase.from('nevera').delete().eq('usuario_id', uid).eq('ingrediente_id', ing.id);
  }

  // Se quita al tiro; "Deshacer" lo devuelve tal como estaba
  async function quitar(item) {
    efecto('desmarcar');
    setItems((l) => l.filter((i) => i.ingrediente_id !== item.ingrediente_id));
    await supabase.from('nevera').delete().eq('usuario_id', uid).eq('ingrediente_id', item.ingrediente_id);
    avisar({
      texto: `${item.ingredientes.nombre} salió de tu nevera`,
      onDeshacer: async () => {
        setItems((l) => [...l, item]);
        await supabase.from('nevera').upsert({ usuario_id: uid, ingrediente_id: item.ingrediente_id, vence_el: item.vence_el }, { onConflict: 'usuario_id,ingrediente_id' });
      },
    });
  }

  async function cambiarVencimiento(valor) {
    await supabase.from('perfiles').update({ control_vencimiento: valor }).eq('id', uid);
    recargarPerfil();
  }

  // ---------- Lista de compras ----------
  async function agregarCompra(ing) {
    setCompras((l) => [...l, { ingrediente_id: ing.id, ingredientes: { nombre: ing.nombre, categoria: ing.categoria } }]);
    const { error: e } = await supabase.from('compras').upsert(
      { usuario_id: uid, ingrediente_id: ing.id },
      { onConflict: 'usuario_id,ingrediente_id', ignoreDuplicates: true },
    );
    if (e) { Alert.alert('Falta un paso', 'La lista de compras necesita la migración 010 en Supabase.'); cargar(); }
  }
  async function quitarCompraRapido(ing) {
    setCompras((l) => l.filter((i) => i.ingrediente_id !== ing.id));
    await supabase.from('compras').delete().eq('usuario_id', uid).eq('ingrediente_id', ing.id);
  }
  async function quitarCompra(item) {
    efecto('desmarcar');
    setCompras((l) => l.filter((i) => i.ingrediente_id !== item.ingrediente_id));
    await supabase.from('compras').delete().eq('usuario_id', uid).eq('ingrediente_id', item.ingrediente_id);
    avisar({
      texto: `${item.ingredientes.nombre} salió de la lista`,
      onDeshacer: async () => {
        setCompras((l) => [...l, item]);
        await supabase.from('compras').upsert({ usuario_id: uid, ingrediente_id: item.ingrediente_id, receta_id: item.receta_id || null }, { onConflict: 'usuario_id,ingrediente_id' });
      },
    });
  }
  // Marcar como comprado: pasa a la nevera
  async function comprado(item) {
    efecto('marcar');
    const yaEstaba = items.some((i) => i.ingrediente_id === item.ingrediente_id);
    setCompras((l) => l.filter((i) => i.ingrediente_id !== item.ingrediente_id));
    if (!yaEstaba) setItems((l) => [...l, { ingrediente_id: item.ingrediente_id, vence_el: null, ingredientes: item.ingredientes }]);
    const { error: e } = await supabase.rpc('comprado', { p_ingrediente: item.ingrediente_id });
    if (e) { cargar(); return; }
    avisar({
      texto: `${item.ingredientes.nombre} pasó a tu nevera`,
      onDeshacer: async () => {
        setCompras((l) => [...l, item]);
        if (!yaEstaba) {
          setItems((l) => l.filter((i) => i.ingrediente_id !== item.ingrediente_id));
          await supabase.from('nevera').delete().eq('usuario_id', uid).eq('ingrediente_id', item.ingrediente_id);
        }
        await supabase.from('compras').upsert({ usuario_id: uid, ingrediente_id: item.ingrediente_id, receta_id: item.receta_id || null }, { onConflict: 'usuario_id,ingrediente_id' });
      },
    });
  }

  const conDias = items.map((i) => ({ ...i, dias: diasHasta(i.vence_el) }));
  const porVencer = vencimiento ? conDias.filter((i) => i.dias !== null && i.dias <= 3).sort((a, b) => a.dias - b.dias) : [];
  const agrupar = (lista) => CATEGORIAS_ING
    .map((cat) => ({ cat, lista: lista.filter((i) => i.ingredientes?.categoria === cat) }))
    .filter((g) => g.lista.length);
  const grupos = agrupar(conDias);
  const gruposCompra = agrupar(compras);

  if (invitado) {
    return <PideCuenta titulo="Tu nevera te espera" texto="Guarda lo que tienes en casa, arma tu lista de compras y encuentra recetas sin escribir nada." onCrear={() => pedirCuenta('Guarda tus ingredientes y tu lista de compras')} />;
  }
  if (error) return <ErrorCarga onReintentar={cargar} />;

  const enCasa = vista === 'casa';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={ref}
        contentContainerStyle={s.contenido}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        <Encabezado titulo="Mi nevera" />

        {/* Selector de lista, como el control segmentado de iOS */}
        <View style={{ flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: C.superficie }} accessibilityRole="tablist">
          {[['casa', 'En casa', items.length], ['comprar', 'Por comprar', compras.length]].map(([id, txt, n]) => {
            const sel = vista === id;
            return (
              <Pressable key={id} onPress={() => { if (!sel) { efecto('boton'); setVista(id); } }} accessibilityRole="tab" accessibilityState={{ selected: sel }} accessibilityLabel={`${txt}, ${n}`}
                style={{ flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? C.blanco : 'transparent', flexDirection: 'row', gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: sel ? C.texto : C.suave }}>{txt}</Text>
                {n ? <View style={{ minWidth: 22, paddingHorizontal: 6, height: 22, borderRadius: 11, backgroundColor: sel ? (id === 'casa' ? C.verde : C.ambar) : '#D9CBB8', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: C.blanco }}>{n}</Text>
                </View> : null}
              </Pressable>
            );
          })}
        </View>

        {cargando ? <Esqueleto n={3} /> : enCasa ? (
          <>
            {items.length ? <Boton titulo="Agregar alimentos" icono="add" tipo="secundario" onPress={() => setSelector('nevera')} /> : null}

            {porVencer.length ? (
              <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.ambarTinte, borderWidth: 1.5, borderColor: C.ambar }}>
                <Text style={[s.seccion, { color: C.ambarOscuro }]}>
                  {porVencer.length === 1 ? '1 alimento por vencer' : `${porVencer.length} alimentos por vencer`}
                </Text>
                <Text style={s.sub}>
                  {porVencer.map((i) => `${i.ingredientes.nombre} (${textoVence(i.dias).toLowerCase()})`).join(' · ')}
                </Text>
                <Boton
                  titulo="Recetas para aprovecharlos"
                  icono="restaurant-outline"
                  onPress={() => nav.abrir('resultados', {
                    tengo: items.map((i) => i.ingrediente_id),
                    prioridad: porVencer.map((i) => i.ingrediente_id),
                    titulo: 'Para aprovechar lo que vence',
                  })}
                />
              </View>
            ) : null}

            {grupos.length === 0 ? (
              <Vacio titulo="Tu nevera está vacía" texto="Agrega lo que tienes y te digo qué puedes cocinar."
                accion={{ titulo: 'Agregar alimentos', icono: 'add', onPress: () => setSelector('nevera') }} />
            ) : (
              <>
                {grupos.map((g) => (
                  <View key={g.cat} style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: C.suave, letterSpacing: 0.5 }}>{g.cat.toUpperCase()} · {g.lista.length}</Text>
                    {g.lista.map((i) => {
                      const vence = vencimiento && i.dias !== null && i.dias <= 3;
                      return (
                        <FilaDeslizable key={i.ingrediente_id} onQuitar={() => quitar(i)}
                          etiqueta={`${i.ingredientes.nombre}${vence ? `, vence ${textoVence(i.dias).toLowerCase()}` : ''}`}>
                          <View style={[s.fila, { minHeight: 52, paddingHorizontal: 14, gap: 12, borderWidth: 1.5, borderColor: vence ? C.ambar : C.linea, borderRadius: 14, backgroundColor: vence ? C.ambarTinte : C.blanco }]}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: vence ? C.ambar : C.verde }} />
                            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: C.texto }}>{i.ingredientes.nombre}</Text>
                            {vence ? <Text style={{ fontSize: 13, fontWeight: '800', color: C.ambarOscuro }}>{textoVence(i.dias)}</Text> : null}
                          </View>
                        </FilaDeslizable>
                      );
                    })}
                  </View>
                ))}
                <Text style={[s.sub, { textAlign: 'center', fontSize: 13 }]}>Desliza un alimento a la izquierda para quitarlo</Text>
                <Tarjeta>
                  <Interruptor texto="Control de vencimiento" sub="Te mostramos lo que vence y recetas para aprovecharlo" valor={vencimiento} onCambiar={cambiarVencimiento} />
                </Tarjeta>
              </>
            )}
          </>
        ) : (
          <>
            {compras.length ? <Boton titulo="Agregar a la lista" icono="add" tipo="secundario" onPress={() => setSelector('compras')} /> : null}
            {gruposCompra.length === 0 ? (
              <Vacio titulo="Tu lista de compras está vacía" texto="Anota lo que te falta. En una receta, toca «Agregar lo que falta» y llega solo."
                accion={{ titulo: 'Agregar a la lista', icono: 'add', onPress: () => setSelector('compras') }} />
            ) : (
              <>
                {gruposCompra.map((g) => (
                  <View key={g.cat} style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: C.suave, letterSpacing: 0.5 }}>{g.cat.toUpperCase()} · {g.lista.length}</Text>
                    {g.lista.map((i) => (
                      <FilaDeslizable key={i.ingrediente_id} onQuitar={() => quitarCompra(i)} etiqueta={i.ingredientes.nombre} onActivar={() => comprado(i)} textoActivar="Marcar como comprado">
                        <View style={[s.fila, { minHeight: 52, paddingLeft: 6, paddingRight: 14, gap: 6, borderWidth: 1.5, borderColor: C.linea, borderRadius: 14 }]}>
                          <Pressable onPress={() => comprado(i)} hitSlop={6} accessibilityRole="checkbox" accessibilityState={{ checked: false }} accessibilityLabel={`Marcar ${i.ingredientes.nombre} como comprado`}
                            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="ellipse-outline" size={26} color={C.ambar} />
                          </Pressable>
                          <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: C.texto }}>{i.ingredientes.nombre}</Text>
                        </View>
                      </FilaDeslizable>
                    ))}
                  </View>
                ))}
                <Text style={[s.sub, { textAlign: 'center', fontSize: 13 }]}>Toca el círculo cuando lo compres: pasa a tu nevera</Text>
              </>
            )}
          </>
        )}
      </ScrollView>

      {enCasa && items.length ? (
        <View style={s.pie}>
          <Boton
            tipo="verde"
            icono="restaurant-outline"
            titulo="Qué cocino con mi nevera"
            onPress={() => nav.abrir('resultados', { tengo: items.map((i) => i.ingrediente_id) })}
          />
        </View>
      ) : null}

      <SelectorIngredientes
        visible={!!selector}
        titulo={selector === 'compras' ? 'Agregar a la lista' : 'Agregar a mi nevera'}
        ya={(selector === 'compras' ? compras : items).map((i) => ({ id: i.ingrediente_id, nombre: i.ingredientes.nombre }))}
        onAgregar={selector === 'compras' ? agregarCompra : agregar}
        onQuitar={selector === 'compras' ? quitarCompraRapido : quitarRapido}
        onCerrar={() => { setSelector(null); cargar(); }}
      />
    </View>
  );
}
