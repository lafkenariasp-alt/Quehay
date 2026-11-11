import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Switch, Alert } from 'react-native';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C, CATEGORIAS_RECETA } from '../theme';
import { Pantalla, Encabezado, Seccion, Grilla, Casilla, Chip, Boton, Tarjeta, s } from '../ui';
import SelectorIngredientes from '../SelectorIngredientes';
import { guardarIngredientesInvitado, leerIngredientesInvitado } from '../analitica';

export default function Buscar() {
  const { uid, invitado, nav, pedirCuenta } = useApp();
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

  const quitar = (id) => setElegidos((l) => l.filter((e) => e.id !== id));

  return (
    <View style={{ flex: 1 }}>
      <Pantalla
        pie={
          <Boton
            titulo="Ver recetas"
            icono="search"
            deshabilitado={!elegidos.length}
            onPress={() => nav.abrir('resultados', {
              tengo: elegidos.map((e) => e.id),
              maxFaltan, basicos, categoria,
              maxMinutos: rapida ? 30 : null,
            })}
          />
        }
      >
        <Encabezado titulo="¿Qué cocinamos hoy?" sub="Pon lo que tienes y te mostramos qué puedes hacer" />

        <Seccion titulo="Tengo" derecha={<Text style={s.sub}>{elegidos.length} ingredientes</Text>}>
          <Grilla>
            <Casilla estado="vacia" onPress={() => setSelector(true)} />
            {[...elegidos].reverse().map((e) => (
              <Casilla key={e.id} nombre={e.nombre} estado="tengo" detalle="toca para quitar" onPress={() => quitar(e.id)} />
            ))}
          </Grilla>
          <Boton tipo="neutro" icono="file-tray-stacked-outline" titulo="Usar todo lo de mi nevera" onPress={usarNevera} />
        </Seccion>

        <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.etiqueta}>Incluir despensa básica</Text>
            <Text style={s.sub}>Sal, aceite, agua y pimienta</Text>
          </View>
          <Switch value={basicos} onValueChange={setBasicos} trackColor={{ true: C.verde, false: '#CBBBA5' }} />
        </Tarjeta>

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
