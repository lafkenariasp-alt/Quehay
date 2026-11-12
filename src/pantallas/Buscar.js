import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Pressable, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C, CATEGORIAS_RECETA } from '../theme';
import { Pantalla, Encabezado, Seccion, Chip, Boton, Tarjeta, Interruptor, s } from '../ui';
import SelectorIngredientes from '../SelectorIngredientes';
import { efecto } from '../sonido';
import { guardarIngredientesInvitado, leerIngredientesInvitado } from '../analitica';

const CLAVE_RECIENTES = 'busquedas_recientes_v1';
const resumen = (lista) => {
  const nombres = lista.map((e) => e.nombre.toLowerCase());
  return nombres.length > 4 ? `${nombres.slice(0, 4).join(', ')} y ${nombres.length - 4} más` : nombres.join(', ');
};

// Pone en negrita la parte que coincide con lo escrito
function Resaltado({ texto, q }) {
  const quitarTildes = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const i = quitarTildes(texto).indexOf(quitarTildes(q.trim()));
  if (i < 0 || !q.trim()) return <Text style={{ fontSize: 16, color: C.texto }}>{texto}</Text>;
  const f = i + q.trim().length;
  return (
    <Text style={{ fontSize: 16, color: C.suave }}>
      {texto.slice(0, i)}<Text style={{ fontWeight: '800', color: C.texto }}>{texto.slice(i, f)}</Text>{texto.slice(f)}
    </Text>
  );
}

export default function Buscar({ activa }) {
  const { uid, invitado, nav, pedirCuenta, chefpu } = useApp();
  const [elegidos, setElegidos] = useState([]); // [{id, nombre}]
  const leido = useRef(false);

  // Invitado: recupera lo que eligió en la bienvenida y lo guarda para pasarlo a su nevera al registrarse
  useEffect(() => {
    if (!invitado) return;
    leerIngredientesInvitado().then((l) => { if (l.length) setElegidos(l); leido.current = true; });
  }, [invitado]);
  useEffect(() => {
    if (invitado && leido.current) guardarIngredientesInvitado(elegidos);
  }, [elegidos, invitado]);
  const [selector, setSelector] = useState(false);
  // Escribir aquí mismo: sugerencias mientras escribes
  const [q, setQ] = useState('');
  const [sugeridos, setSugeridos] = useState([]);
  useEffect(() => {
    const termino = q.trim();
    if (termino.length < 2) { setSugeridos([]); return undefined; }
    let cancelado = false;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('buscar_ingrediente', { q: termino });
      if (!cancelado) setSugeridos((data || []).slice(0, 6));
    }, 150);
    return () => { cancelado = true; clearTimeout(t); };
  }, [q]);
  function elegir(ing) {
    if (elegidos.some((e) => e.id === ing.id)) { quitar(ing.id); return; }
    efecto('marcar');
    setElegidos((l) => [...l, { id: ing.id, nombre: ing.nombre }]);
    setQ('');
  }

  // Búsquedas recientes: las últimas 5 combinaciones con las que buscaste
  const [recientes, setRecientes] = useState([]);
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_RECIENTES).then((v) => { try { setRecientes(JSON.parse(v) || []); } catch (e) { setRecientes([]); } }).catch(() => {});
  }, []);
  function recordar(lista) {
    const firma = lista.map((e) => e.id).sort((a, b) => a - b).join(',');
    setRecientes((r) => {
      const nuevas = [lista.map(({ id, nombre }) => ({ id, nombre })), ...r.filter((x) => x.map((e) => e.id).sort((a, b) => a - b).join(',') !== firma)].slice(0, 5);
      AsyncStorage.setItem(CLAVE_RECIENTES, JSON.stringify(nuevas)).catch(() => {});
      return nuevas;
    });
  }
  function borrarRecientes() {
    setRecientes([]);
    AsyncStorage.removeItem(CLAVE_RECIENTES).catch(() => {});
  }
  function verRecetas(lista = elegidos) {
    recordar(lista);
    nav.abrir('resultados', {
      tengo: lista.map((e) => e.id),
      maxFaltan, basicos, categoria,
      maxMinutos: rapida ? 30 : null,
    });
  }
  // Chefpu anima a elegir al menos 3 ingredientes
  useEffect(() => {
    if (!activa) return undefined;
    const t = setTimeout(() => {
      if (!elegidos.length) chefpu?.decir('buscar_vacio', 'Elige al menos 3 cosas y te armo el menú.', 'feliz');
      else if (elegidos.length < 3) chefpu?.decir('buscar_pocos', 'Vamos bien. Con uno o dos más, salen muchas más recetas.', 'pensando');
    }, 1200);
    return () => clearTimeout(t);
  }, [activa]);
  const [basicos, setBasicos] = useState(true);
  const [maxFaltan, setMaxFaltan] = useState(4);
  const [categoria, setCategoria] = useState(null);
  const [rapida, setRapida] = useState(false);

  async function usarNevera() {
    if (invitado) { pedirCuenta('Guarda tus ingredientes en tu nevera y búscalos con un toque'); return; }
    const { data, error } = await supabase.from('nevera').select('ingrediente_id, ingredientes(nombre)').eq('usuario_id', uid);
    if (error) return Alert.alert('Error', error.message);
    if (!data?.length) return Alert.alert('Tu nevera está vacía', 'Agrega alimentos en la pestaña Nevera.');
    const mapa = new Map(elegidos.map((e) => [e.id, e]));
    data.forEach((d) => mapa.set(d.ingrediente_id, { id: d.ingrediente_id, nombre: d.ingredientes.nombre }));
    setElegidos([...mapa.values()]);
  }

  const quitar = (id) => { efecto('desmarcar'); setElegidos((l) => l.filter((e) => e.id !== id)); };

  return (
    <View style={{ flex: 1 }}>
      <Pantalla
        pie={
          <Boton
            titulo="Ver recetas"
            icono="search"
            deshabilitado={!elegidos.length}
            onPress={() => verRecetas()}
          />
        }
      >
        <Encabezado titulo="¿Qué cocinamos hoy?" sub="Pon lo que tienes y te mostramos qué puedes hacer" />

        <Tarjeta style={{ gap: 12 }}>
          <View style={s.filaEntre}>
            <Text style={s.etiqueta}>Tengo</Text>
            <Text style={{ fontSize: 13, color: C.suave }}>{elegidos.length} {elegidos.length === 1 ? 'ingrediente' : 'ingredientes'}</Text>
          </View>
          {elegidos.length ? (
            <View style={s.chips}>
              {[...elegidos].reverse().map((e) => (
                <Chip key={e.id} texto={e.nombre} icono="close" onPress={() => quitar(e.id)} />
              ))}
            </View>
          ) : null}
          <View style={[s.input, s.fila, { gap: 10 }]}>
            <Ionicons name="search" size={20} color={C.suave} />
            <TextInput value={q} onChangeText={setQ} placeholder="¿Qué tienes? Ej: pollo" placeholderTextColor={C.suave}
              autoCorrect={false} returnKeyType="done" onSubmitEditing={() => { if (sugeridos[0]) elegir(sugeridos[0]); }} blurOnSubmit={false}
              accessibilityLabel="Escribe un ingrediente" style={{ flex: 1, fontSize: 16, color: C.texto, minHeight: 48 }} />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Borrar">
                <Ionicons name="close-circle" size={20} color={C.suave} />
              </Pressable>
            ) : null}
          </View>
          {q.trim().length >= 2 ? (
            <View style={{ marginTop: -4 }}>
              {sugeridos.map((ing) => {
                const ya = elegidos.some((e) => e.id === ing.id);
                return (
                  <Pressable key={ing.id} onPress={() => elegir(ing)} accessibilityRole="button" accessibilityLabel={ya ? `Quitar ${ing.nombre}` : `Agregar ${ing.nombre}`}
                    style={({ pressed }) => [s.fila, { gap: 12, minHeight: 48, borderBottomWidth: 1, borderBottomColor: C.linea, opacity: pressed ? 0.6 : 1 }]}>
                    <Ionicons name={ya ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={ya ? C.verde : C.tomate} />
                    <View style={{ flex: 1 }}><Resaltado texto={ing.nombre} q={q} /></View>
                    <Text style={{ fontSize: 12, color: C.suave }}>{ing.categoria}</Text>
                  </Pressable>
                );
              })}
              {!sugeridos.length ? <Text style={[s.sub, { paddingVertical: 10 }]}>Buscando «{q.trim()}»…</Text> : null}
            </View>
          ) : (
            <Pressable onPress={() => setSelector(true)} accessibilityRole="button" style={[s.fila, { minHeight: 40, gap: 6 }]}>
              <Ionicons name="grid-outline" size={16} color={C.tomate} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.tomate }}>Ver por categoría o agregar varios</Text>
            </Pressable>
          )}
        </Tarjeta>

        {recientes.length ? (
          <Seccion titulo="Búsquedas recientes" derecha={
            <Pressable onPress={borrarRecientes} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar búsquedas recientes">
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.suave }}>Borrar</Text>
            </Pressable>
          }>
            <View style={{ gap: 0 }}>
              {recientes.map((r, k) => (
                <Pressable key={k} onPress={() => { efecto('boton'); setElegidos(r); }} onLongPress={() => verRecetas(r)}
                  accessibilityRole="button" accessibilityLabel={`Usar ${resumen(r)}`} accessibilityHint="Mantén presionado para ver las recetas al tiro"
                  style={({ pressed }) => [s.fila, { gap: 12, minHeight: 48, borderBottomWidth: k === recientes.length - 1 ? 0 : 1, borderBottomColor: C.linea, opacity: pressed ? 0.6 : 1 }]}>
                  <Ionicons name="time-outline" size={20} color={C.suave} />
                  <Text style={{ flex: 1, fontSize: 15, color: C.texto }} numberOfLines={1}>{resumen(r)}</Text>
                  <Ionicons name="arrow-up-outline" size={18} color={C.suave} style={{ transform: [{ rotate: '-45deg' }] }} />
                </Pressable>
              ))}
            </View>
          </Seccion>
        ) : null}
        <Boton tipo="neutro" icono="file-tray-stacked-outline" titulo="Usar todo lo de mi nevera" onPress={usarNevera} />

        <Interruptor texto="Incluir despensa básica" sub="Sal, aceite, agua y pimienta" valor={basicos} onCambiar={setBasicos} />

        <Seccion titulo="¿Cuántos te pueden faltar?">
          <View style={s.chips}>
            {[0, 1, 2, 3, 4].map((n) => (
              <Chip key={n} texto={n === 0 ? 'Ninguno' : `Hasta ${n}`} activo={maxFaltan === n} onPress={() => setMaxFaltan(n)} />
            ))}
          </View>
        </Seccion>

        <Seccion titulo="Filtros">
          <View style={s.chips}>
            <Chip texto="30 min o menos" icono="time-outline" activo={rapida} onPress={() => setRapida(!rapida)} />
            {CATEGORIAS_RECETA.map((c) => (
              <Chip key={c} texto={c} activo={categoria === c} onPress={() => setCategoria(categoria === c ? null : c)} />
            ))}
          </View>
        </Seccion>
      </Pantalla>

      <SelectorIngredientes
        visible={selector}
        titulo="¿Qué tienes?"
        ya={elegidos}
        onAgregar={(i) => setElegidos((l) => (l.some((e) => e.id === i.id) ? l : [...l, { id: i.id, nombre: i.nombre }]))}
        onQuitar={(i) => quitar(i.id)}
        onCerrar={() => setSelector(false)}
      />
    </View>
  );
}
