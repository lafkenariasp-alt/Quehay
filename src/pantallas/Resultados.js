import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C } from '../theme';
import { Foco } from '../foco';
import { Pantalla, Encabezado, Seccion, TarjetaReceta, Vacio, Esqueleto, ErrorCarga, s } from '../ui';
import { Mascota } from '../mascota';
import { registrar } from '../analitica';
import { efecto } from '../sonido';
import { Cascada } from '../anim';

const GRUPOS = [
  { titulo: 'Puedes cocinarla ya', color: C.verde, f: (n) => n === 0 },
  { titulo: 'Te falta 1 ingrediente', color: C.ambarTexto, f: (n) => n === 1 },
  { titulo: 'Te faltan 2', color: C.ambarTexto, f: (n) => n === 2 },
  { titulo: 'Te faltan 3 o 4', color: C.ambarTexto, f: (n) => n >= 3 && n <= 4 },
  { titulo: 'Te faltan 5 o más', color: C.ambarTexto, f: (n) => n >= 5 },
];

export default function Resultados({ tengo = [], maxFaltan = 4, basicos = true, categoria = null, maxMinutos = null, prioridad = null, titulo, primeraVez = false }) {
  const { nav, uid, tutorial, chefpu } = useApp();
  const [recetas, setRecetas] = useState(null);
  const [error, setError] = useState(null);
  const [ayuda, setAyuda] = useState(primeraVez); // explicación de colores la primera vez
  const [cercanas, setCercanas] = useState(false); // sin resultados en el límite: mostramos las más cercanas

  const cargar = useCallback(async (refrescando) => {
    setError(null);
    if (refrescando !== true) setRecetas(null);
    {
      const buscar = (max) => supabase.rpc('buscar_recetas', {
        tengo, max_faltantes: max, incluir_basicos: basicos, categoria, max_minutos: maxMinutos, limite: 60,
      });
      let { data, error } = await buscar(maxFaltan);
      if (error) { setError(error.message.includes('fetch') ? null : error.message); setRecetas('error'); return; }
      if (!data?.length && !prioridad?.length) {
        const r2 = await buscar(20);
        if (!r2.error && r2.data?.length) { data = r2.data.slice(0, 10); setCercanas(true); }
      }
      let lista = data || [];
      // Para "aprovechar lo que vence": solo recetas que usan algo de lo que vence
      if (prioridad?.length) {
        const { data: ri } = await supabase.from('receta_ingredientes').select('receta_id').in('ingrediente_id', prioridad);
        const usan = new Set((ri || []).map((r) => r.receta_id));
        lista = lista.filter((r) => usan.has(r.receta_id));
      }
      setRecetas(lista);
      if (refrescando === true) return;
      // Chefpu comenta lo que encontró
      const listas = lista.filter((r) => r.faltan_n === 0).length;
      if (listas) efecto('listas');
      if (listas) chefpu?.decir('resultados_listas', `¡Tienes todo para ${listas} ${listas === 1 ? 'receta' : 'recetas'}! Parte por la de arriba.`, 'celebrando');
      else if (lista.some((r) => r.faltan_n === 1)) chefpu?.decir('resultados_falta1', 'Te falta solo 1 cosa para algunas. ¿La pides o la cambias?', 'pensando');
      else if (!lista.length) chefpu?.decir('resultados_nada', 'No encontré nada con eso… prueba agregando otro ingrediente.', 'triste');
      registrar('busqueda', { ingredientes: tengo.length, resultados: lista.length, cercanas: !data?.length }, uid);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (recetas === 'error') return <ErrorCarga mensaje={error} onReintentar={cargar} onVolver={nav.volver} />;
  if (!recetas) {
    return (
      <Pantalla scroll={false}>
        <Encabezado onVolver={nav.volver} titulo={titulo || 'Buscando recetas…'} sub={`Con ${tengo.length} ingredientes`} />
        <Esqueleto n={5} />
      </Pantalla>
    );
  }

  return (
    <Pantalla onRefrescar={() => cargar(true)} tituloFijo={titulo || `${recetas.length} ${recetas.length === 1 ? 'receta' : 'recetas'}`}>
      <Encabezado
        onVolver={nav.volver}
        titulo={titulo || `${recetas.length} ${recetas.length === 1 ? 'receta' : 'recetas'} para ti`}
        sub={`Con ${tengo.length} ingredientes${basicos ? ' + despensa básica' : ''}`}
      />
      <View style={[s.fila, { gap: 16, flexWrap: 'wrap' }]} accessible accessibilityLabel="Verde: lo tienes. Ámbar: te falta.">
        <View style={[s.fila, { gap: 6 }]}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.verde }} /><Text style={{ fontSize: 13, fontWeight: '700', color: C.verde }}>Verde: lo tienes</Text></View>
        <View style={[s.fila, { gap: 6 }]}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.ambar }} /><Text style={{ fontSize: 13, fontWeight: '700', color: C.ambarOscuro }}>Ámbar: te falta</Text></View>
      </View>
      {ayuda && !tutorial?.activo ? (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: C.blanco, borderWidth: 1.5, borderColor: C.linea }}>
          <Mascota tam={56} />
          <Text style={[s.etiqueta, { flex: 1 }]}>Toca una receta para ver cómo se hace.</Text>
          <Pressable onPress={() => setAyuda(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar ayuda">
            <Ionicons name="close" size={20} color={C.suave} />
          </Pressable>
        </View>
      ) : null}
      {cercanas ? (
        <View style={{ padding: 14, borderRadius: 16, backgroundColor: C.ambarTinte, borderWidth: 1, borderColor: '#F3C98B', gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.ambarOscuro }}>
            No hay recetas con {maxFaltan === 0 ? 'nada' : `hasta ${maxFaltan}`} {maxFaltan === 1 ? 'faltante' : 'faltantes'}
          </Text>
          <Text style={s.sub}>Estas son las más cercanas a lo que tienes. Agrega más ingredientes para mejores resultados.</Text>
        </View>
      ) : null}
      {recetas.length === 0 ? (
        <Vacio objeto="search" titulo="No encontramos recetas con eso" texto="Agrega más ingredientes o permite que falten algunos."
          accion={{ titulo: 'Cambiar ingredientes', icono: 'options-outline', onPress: nav.volver }} />
      ) : (
        GRUPOS.map((g, gi) => {
          const lista = recetas.filter((r) => g.f(r.faltan_n));
          const antes = recetas.filter((r) => GRUPOS.slice(0, gi).some((x) => x.f(r.faltan_n))).length; // posición en la cascada
          if (!lista.length) return null;
          const primerGrupo = GRUPOS.findIndex((x) => recetas.some((r) => x.f(r.faltan_n))) === gi;
          const seccion = (
            <Seccion titulo={g.titulo} derecha={<Text style={s.sub}>{lista.length}</Text>}>
              {lista.map((r, ri) => {
                const nota = Number(r.nota_promedio) > 0 ? ` · ${Number(r.nota_promedio).toFixed(1).replace('.', ',')} estrellas` : '';
                const tarjeta = (
                  <Cascada key={r.receta_id} i={antes + ri}><TarjetaReceta titulo={r.titulo} foto={r.foto_url}
                    meta={`${r.minutos} min · ${r.dificultad}${nota} · por ${r.autor}`}
                    estado={r.faltan_n > 0 ? 'falta' : 'ya'}
                    detalle={r.faltan_n > 0 ? `Te falta: ${r.faltantes.join(', ').toLowerCase()}` : 'Tienes todo'}
                    onPress={() => nav.abrir('receta', { id: r.receta_id, tengo, basicos })} /></Cascada>
                );
                // la primera receta de la lista es la que el tutorial señala
                return primerGrupo && ri === 0 ? <Foco key={r.receta_id} id="receta_0">{tarjeta}</Foco> : tarjeta;
              })}
            </Seccion>
          );
          const idGrupo = gi === 0 ? 'grupo_ya' : gi === 1 ? 'grupo_falta1' : null;
          return idGrupo ? <Foco key={g.titulo} id={idGrupo}>{seccion}</Foco> : <View key={g.titulo}>{seccion}</View>;
        })
      )}
    </Pantalla>
  );
}
