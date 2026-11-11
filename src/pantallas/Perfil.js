import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C, RAREZA, xpParaNivel } from '../theme';
import { Pantalla, Seccion, Boton, Tarjeta, Cargando, s } from '../ui';

export default function Perfil({ activa }) {
  const { uid, perfil, recargarPerfil, nav } = useApp();
  const [logros, setLogros] = useState([]);
  const [mios, setMios] = useState(new Set());
  const [recetas, setRecetas] = useState([]);

  const cargar = useCallback(async () => {
    recargarPerfil();
    const [l, lu, rec] = await Promise.all([
      supabase.from('logros').select('*').eq('clase', 'base'),
      supabase.from('logros_usuario').select('codigo').eq('usuario_id', uid),
      supabase.from('recetas').select('id, titulo, num_likes, num_cocinadas').eq('autor_id', uid).order('creado_en', { ascending: false }),
    ]);
    setLogros(l.data || []);
    setMios(new Set((lu.data || []).map((x) => x.codigo)));
    setRecetas(rec.data || []);
  }, [uid]);

  useEffect(() => { if (activa) cargar(); }, [activa, cargar]); // recarga al volver a la pestaña

  if (!perfil) return <Cargando />;

  const base = xpParaNivel(perfil.nivel);
  const sig = xpParaNivel(perfil.nivel + 1);
  const avance = Math.min(1, (perfil.xp - base) / (sig - base));
  const iniciales = perfil.nombre.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const orden = ['Común', 'Poco común', 'Raro', 'Épico', 'Legendario'];
  const ordenados = [...logros].sort((a, b) => (mios.has(b.codigo) - mios.has(a.codigo)) || (orden.indexOf(a.rareza) - orden.indexOf(b.rareza)));

  return (
    <Pantalla>
      <View style={[s.fila, { gap: 16 }]}>
        <View>
          <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: C.dorado, backgroundColor: C.superficie, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: C.tomateOscuro }}>{iniciales}</Text>
          </View>
          <View style={{ position: 'absolute', right: -4, bottom: -4, minWidth: 32, height: 32, borderRadius: 10, backgroundColor: C.dorado, borderWidth: 3, borderColor: C.fondo, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontWeight: '800', color: C.texto }}>{perfil.nivel}</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.titulo}>{perfil.nombre}</Text>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: C.doradoTinte }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.ambarOscuro }}>{perfil.titulo}</Text>
          </View>
        </View>
      </View>

      <Tarjeta>
        <View style={s.filaEntre}>
          <Text style={s.etiqueta}>Nivel {perfil.nivel}</Text>
          <Text style={s.sub}>{perfil.xp - base} / {sig - base} XP</Text>
        </View>
        <View style={{ height: 12, borderRadius: 999, backgroundColor: C.grisTinte, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(avance * 100)}%`, height: '100%', backgroundColor: C.dorado, borderRadius: 999 }} />
        </View>
        <Text style={s.sub}>{perfil.xp} XP en total</Text>
      </Tarjeta>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          [recetas.length, 'Recetas'],
          [recetas.reduce((a, r) => a + r.num_cocinadas, 0), 'Cocinadas'],
          [recetas.reduce((a, r) => a + r.num_likes, 0), 'Me gusta'],
        ].map(([n, t]) => (
          <View key={t} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: C.superficie }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.texto }}>{n}</Text>
            <Text style={s.sub}>{t}</Text>
          </View>
        ))}
      </View>

      <Seccion titulo="Logros" derecha={<Text style={s.sub}>{mios.size} de {logros.length}</Text>}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ordenados.map((l) => {
            const ok = mios.has(l.codigo);
            const color = RAREZA[l.rareza];
            return (
              <View key={l.codigo} style={{ width: '31.5%', alignItems: 'center', gap: 6, padding: 10, borderRadius: 14, backgroundColor: C.blanco, borderWidth: ok ? 2 : 1, borderColor: ok ? color : C.linea, borderStyle: ok ? 'solid' : 'dashed' }}>
                <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: ok ? color : C.grisTinte, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] }}>
                  <Ionicons name={ok ? 'trophy' : 'lock-closed'} size={18} color={ok ? C.blanco : C.gris} style={{ transform: [{ rotate: '-45deg' }] }} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '800', textAlign: 'center', color: ok ? C.texto : '#57534E' }}>{l.nombre}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: ok ? color : C.suave }}>{l.rareza.toUpperCase()}</Text>
              </View>
            );
          })}
        </View>
      </Seccion>

      <Seccion titulo="Mis recetas">
        {recetas.length === 0 ? (
          <Boton tipo="secundario" icono="add" titulo="Publica tu primera receta" onPress={() => nav.irA('publicar')} />
        ) : recetas.map((r) => (
          <Tarjeta key={r.id} onPress={() => nav.abrir('receta', { id: r.id })}>
            <Text style={s.etiqueta}>{r.titulo}</Text>
            <Text style={s.sub}>{r.num_likes} me gusta · {r.num_cocinadas} la cocinaron</Text>
          </Tarjeta>
        ))}
      </Seccion>

      <Boton tipo="neutro" titulo="Cerrar sesión" icono="log-out-outline" onPress={() => Alert.alert('¿Cerrar sesión?', '', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ])} />
    </Pantalla>
  );
}
