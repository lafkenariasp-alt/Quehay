import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C, CATEGORIAS_RECETA } from '../theme';
import { Pantalla, Encabezado, Seccion, Chip, Boton, Tarjeta, Interruptor, s } from '../ui';
import SelectorIngredientes from '../SelectorIngredientes';
import { efecto } from '../sonido';
import { guardarIngredientesInvitado, leerIngredientesInvitado } from '../analitica';

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
            onPress={() => nav.abrir('resultados', {
              tengo: elegidos.map((e) => e.id),
              maxFaltan, basicos, categoria,
              maxMinutos: rapida ? 30 : null,
            })}
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
          <Pressable onPress={() => setSelector(true)} accessibilityRole="button" accessibilityLabel="Agregar ingrediente"
            style={[s.input, s.fila, { gap: 10 }]}>
            <Ionicons name="search" size={20} color={C.suave} />
            <Text style={{ fontSize: 16, color: C.suave }}>¿Qué tienes?</Text>
          </Pressable>
        </Tarjeta>
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
