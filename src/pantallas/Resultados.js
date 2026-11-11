import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C } from '../theme';
import { Pantalla, Encabezado, Seccion, Tarjeta, Estrellas, Vacio, Cargando, s } from '../ui';

const GRUPOS = [
  { titulo: 'Puedes cocinarla ya', color: C.verde, f: (n) => n === 0 },
  { titulo: 'Te falta 1 ingrediente', color: C.ambarTexto, f: (n) => n === 1 },
  { titulo: 'Te faltan 2', color: C.ambarTexto, f: (n) => n === 2 },
  { titulo: 'Te faltan 3 o 4', color: C.ambarTexto, f: (n) => n >= 3 && n <= 4 },
  { titulo: 'Te faltan 5 o más', color: C.ambarTexto, f: (n) => n >= 5 },
];

export default function Resultados({ tengo = [], maxFaltan = 4, basicos = true, categoria = null, maxMinutos = null, prioridad = null, titulo }) {
  const { nav } = useApp();
  const [recetas, setRecetas] = useState(null);
  const [cercanas, setCercanas] = useState(false); // sin resultados en el límite: mostramos las más cercanas

  useEffect(() => {
    (async () => {
      const buscar = (max) => supabase.rpc('buscar_recetas', {
        tengo, max_faltantes: max, incluir_basicos: basicos, categoria, max_minutos: maxMinutos, limite: 60,
      });
      let { data, error } = await buscar(maxFaltan);
      if (error) { Alert.alert('Error', error.message); setRecetas([]); return; }
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
    })();
  }, []);

  if (!recetas) return <Cargando />;

  return (
    <Pantalla>
      <Encabezado
        onVolver={nav.volver}
        titulo={titulo || `${recetas.length} ${recetas.length === 1 ? 'receta' : 'recetas'} para ti`}
        sub={`Con ${tengo.length} ingredientes${basicos ? ' + despensa básica' : ''}`}
      />
      {cercanas ? (
        <View style={{ padding: 14, borderRadius: 16, backgroundColor: C.ambarTinte, borderWidth: 1, borderColor: '#F3C98B', gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.ambarOscuro }}>
            No hay recetas con {maxFaltan === 0 ? 'nada' : `hasta ${maxFaltan}`} {maxFaltan === 1 ? 'faltante' : 'faltantes'}
          </Text>
          <Text style={s.sub}>Estas son las más cercanas a lo que tienes. Agrega más ingredientes para mejores resultados.</Text>
        </View>
      ) : null}
      {recetas.length === 0 ? (
        <Vacio texto={'No encontramos recetas con eso.\nPrueba permitir más faltantes o agrega ingredientes.'} />
      ) : (
        GRUPOS.map((g) => {
          const lista = recetas.filter((r) => g.f(r.faltan_n));
          if (!lista.length) return null;
          return (
            <Seccion key={g.titulo} titulo={g.titulo} color={g.color} derecha={<Text style={s.sub}>{lista.length}</Text>}>
              {lista.map((r) => (
                <Tarjeta key={r.receta_id} onPress={() => nav.abrir('receta', { id: r.receta_id, tengo, basicos })} style={r.foto_url ? { paddingTop: 0, overflow: 'hidden' } : null}>
                  {r.foto_url ? <Image source={{ uri: r.foto_url }} style={{ height: 150, marginHorizontal: -14, backgroundColor: C.superficie }} /> : null}
                  <Text style={{ fontSize: 18, fontWeight: '800', color: C.texto }}>{r.titulo}</Text>
                  <View style={[s.fila, { flexWrap: 'wrap', gap: 12 }]}>
                    {Number(r.nota_promedio) > 0 ? (
                      <View style={s.fila}>
                        <Estrellas valor={Number(r.nota_promedio)} tam={13} />
                        <Text style={s.sub}>{Number(r.nota_promedio).toFixed(1)}</Text>
                      </View>
                    ) : null}
                    <View style={[s.fila, { gap: 4 }]}>
                      <Ionicons name="time-outline" size={14} color={C.suave} />
                      <Text style={s.sub}>{r.minutos} min</Text>
                    </View>
                    <Text style={s.sub}>{r.dificultad}</Text>
                    <Text style={s.sub}>por {r.autor}</Text>
                  </View>
                  {r.faltan_n > 0 ? (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.ambarOscuro }}>
                      Te falta: {r.faltantes.join(', ').toLowerCase()}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.verde }}>Tienes todo</Text>
                  )}
                </Tarjeta>
              ))}
            </Seccion>
          );
        })
      )}
    </Pantalla>
  );
}
