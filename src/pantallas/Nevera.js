import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, Alert, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp, diasHasta, textoVence } from '../contexto';
import { C, CATEGORIAS_ING } from '../theme';
import { Boton, Casilla, Encabezado, Grilla, Seccion, Vacio, Tarjeta, ErrorCarga, s } from '../ui';
import { PideCuenta } from '../mascota';
import SelectorIngredientes from '../SelectorIngredientes';
import { efecto } from '../sonido';

export default function Nevera({ activa }) {
  const { uid, invitado, perfil, recargarPerfil, nav, pedirCuenta, chefpu } = useApp();
  const [error, setError] = useState(false);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [selector, setSelector] = useState(false);
  const vencimiento = !!perfil?.control_vencimiento;

  const cargar = useCallback(async () => {
    if (!uid) return;
    setError(false);
    const { data, error: e } = await supabase
      .from('nevera')
      .select('ingrediente_id, vence_el, ingredientes(nombre, categoria)')
      .eq('usuario_id', uid).order('agregado_en');
    if (e) { setError(true); setCargando(false); return; }
    setItems(data || []);
    setCargando(false);
    // Chefpu comenta el estado de la nevera
    const lista = data || [];
    const vence = perfil?.control_vencimiento ? lista.find((i) => { const d = diasHasta(i.vence_el); return d !== null && d >= 0 && d <= 1; }) : null;
    if (!lista.length) chefpu?.decir('nevera_vacia', '¿Y si llenamos la nevera? Agrega lo que tienes y te digo qué cocinar.', 'pensando');
    else if (vence) chefpu?.decir('nevera_vence', `¡Ojo! ${vence.ingredientes.nombre} vence ${textoVence(diasHasta(vence.vence_el)).toLowerCase()}. ¿Vemos qué hacer?`, 'pensando');
    else if (lista.length >= 5) chefpu?.decir('nevera_llena', 'Con esto ya hay harto para cocinar. Toca ¿Qué cocino? en mi menú.', 'feliz');
  }, [uid, perfil?.control_vencimiento]);

  useEffect(() => { if (activa) cargar(); }, [activa, cargar]); // recarga al volver a la pestaña

  // Se agrega al tiro al tocarlo en el selector (se muestra antes de que responda el servidor)
  async function agregar(ing) {
    setItems((l) => [...l, { ingrediente_id: ing.id, vence_el: null, ingredientes: { nombre: ing.nombre, categoria: ing.categoria } }]);
    const { error } = await supabase.from('nevera').upsert(
      { usuario_id: uid, ingrediente_id: ing.id },
      { onConflict: 'usuario_id,ingrediente_id', ignoreDuplicates: true },
    );
    if (error) { Alert.alert('Error', error.message); cargar(); }
  }

  async function quitarRapido(ing) {
    setItems((l) => l.filter((i) => i.ingrediente_id !== ing.id));
    efecto('desmarcar');
    await supabase.from('nevera').delete().eq('usuario_id', uid).eq('ingrediente_id', ing.id);
  }

  function quitar(item) {
    Alert.alert(`¿Quitar ${item.ingredientes.nombre}?`, 'Se saca de tu nevera.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive',
        onPress: async () => {
          await supabase.from('nevera').delete().eq('usuario_id', uid).eq('ingrediente_id', item.ingrediente_id);
          cargar();
        },
      },
    ]);
  }

  async function cambiarVencimiento(valor) {
    await supabase.from('perfiles').update({ control_vencimiento: valor }).eq('id', uid);
    recargarPerfil();
  }

  const conDias = items.map((i) => ({ ...i, dias: diasHasta(i.vence_el) }));
  const porVencer = vencimiento ? conDias.filter((i) => i.dias !== null && i.dias <= 3).sort((a, b) => a.dias - b.dias) : [];
  const grupos = CATEGORIAS_ING
    .map((cat) => ({ cat, lista: conDias.filter((i) => i.ingredientes?.categoria === cat) }))
    .filter((g) => g.lista.length);

  if (invitado) {
    return <PideCuenta titulo="Tu nevera te espera" texto="Guarda lo que tienes en casa, recibe avisos antes de que algo venza y encuentra recetas sin escribir nada." onCrear={() => pedirCuenta('Guarda tus ingredientes y recibe avisos de vencimiento')} />;
  }
  if (error) return <ErrorCarga onReintentar={cargar} />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.contenido}
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} tintColor={C.tomate} />}
      >
        <Encabezado
          titulo="Mi nevera"
          sub={`${items.length} ${items.length === 1 ? 'alimento' : 'alimentos'} · mantén presionado para quitar`}
        />

        <Boton titulo="Agregar alimentos" icono="add" tipo="secundario" onPress={() => setSelector(true)} />

        <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.ambarTinte, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="timer-outline" size={22} color={C.ambarTexto} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.etiqueta}>Control de vencimiento</Text>
            <Text style={s.sub}>Te mostramos lo que vence y recetas para aprovecharlo</Text>
          </View>
          <Switch value={vencimiento} onValueChange={cambiarVencimiento} trackColor={{ true: C.verde, false: '#CBBBA5' }} />
        </Tarjeta>

        {porVencer.length ? (
          <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: C.ambarTinte, borderWidth: 1, borderColor: '#F3C98B' }}>
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

        {cargando ? null : grupos.length === 0 ? (
          <Vacio icono="file-tray-outline" texto={'Tu nevera está vacía.\nAgrega lo que tienes para ver qué puedes cocinar.'} />
        ) : (
          grupos.map((g) => (
            <Seccion key={g.cat} titulo={g.cat} derecha={<Text style={s.sub}>{g.lista.length}</Text>}>
              <Grilla>
                {g.lista.map((i) => {
                  const vence = vencimiento && i.dias !== null && i.dias <= 3;
                  return (
                    <Casilla
                      key={i.ingrediente_id}
                      nombre={i.ingredientes.nombre}
                      estado={vence ? 'vence' : 'tengo'}
                      detalle={vence ? textoVence(i.dias) : null}
                      onLongPress={() => quitar(i)}
                    />
                  );
                })}
              </Grilla>
            </Seccion>
          ))
        )}
      </ScrollView>

      {items.length ? (
        <View style={s.pie}>
          <Boton
            titulo="Qué cocino con mi nevera"
            onPress={() => nav.abrir('resultados', { tengo: items.map((i) => i.ingrediente_id) })}
          />
        </View>
      ) : null}

      <SelectorIngredientes
        visible={selector}
        titulo="Agregar a mi nevera"
        ya={items.map((i) => ({ id: i.ingrediente_id, nombre: i.ingredientes.nombre }))}
        onAgregar={agregar}
        onQuitar={quitarRapido}
        onCerrar={() => { setSelector(false); cargar(); }}
      />
    </View>
  );
}
