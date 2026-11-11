import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C, RAREZA, xpParaNivel } from '../theme';
import { Pantalla, Seccion, Boton, Tarjeta, Cargando, Chip, Estrellas, Avatar, s } from '../ui';
import { desdeCamara, desdeGaleria, subirFoto } from '../fotos';

export default function Perfil({ activa }) {
  const { uid, perfil, recargarPerfil, nav } = useApp();
  const [logros, setLogros] = useState([]);
  const [mios, setMios] = useState(new Set());
  const [recetas, setRecetas] = useState([]);
  const [conteo, setConteo] = useState({ seguidores: 0, siguiendo: 0 });
  const [orden, setOrden] = useState('nuevas'); // nuevas | antiguas | nota

  const cargar = useCallback(async () => {
    recargarPerfil();
    const cuenta = (col) => supabase.from('seguidores').select('*', { count: 'exact', head: true }).eq(col, uid);
    const [l, lu, rec, c1, c2] = await Promise.all([
      
      supabase.from('logros').select('*').eq('clase', 'base'),
      supabase.from('logros_usuario').select('codigo').eq('usuario_id', uid),
      supabase.from('recetas').select('id, titulo, foto_url, num_likes, num_cocinadas, nota_promedio, num_notas, creado_en').eq('autor_id', uid),
      cuenta('seguido_id'), cuenta('seguidor_id'),
    ]);
    setLogros(l.data || []);
    setMios(new Set((lu.data || []).map((x) => x.codigo)));
    setRecetas(rec.data || []);
    setConteo({ seguidores: c1.count || 0, siguiendo: c2.count || 0 });
  }, [uid]);

  useEffect(() => { if (activa) cargar(); }, [activa, cargar]); // recarga al volver a la pestaña

  if (!perfil) return <Cargando />;

  const base = xpParaNivel(perfil.nivel);
  const sig = xpParaNivel(perfil.nivel + 1);
  const avance = Math.min(1, (perfil.xp - base) / (sig - base));

  function cambiarFoto() {
    const guardar = async (foto) => {
      if (!foto) return;
      try {
        const url = await subirFoto(uid, foto, 'avatar');
        const { error } = await supabase.from('perfiles').update({ avatar_url: url }).eq('id', uid);
        if (error) throw error;
        recargarPerfil();
      } catch (e) { Alert.alert('No se pudo cambiar la foto', e.message); }
    };
    const opciones = [
      { text: 'Tomar foto', onPress: () => desdeCamara(true).then(guardar) },
      { text: 'Elegir de la galería', onPress: () => desdeGaleria(true).then(guardar) },
    ];
    if (perfil.avatar_url) {
      opciones.push({ text: 'Eliminar foto', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('perfiles').update({ avatar_url: null }).eq('id', uid);
        if (error) Alert.alert('Error', error.message); else recargarPerfil();
      } });
    }
    opciones.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Foto de perfil', perfil.avatar_url ? 'Cámbiala o elimínala' : 'Agrega tu foto', opciones);
  }
  const rarezas = ['Común', 'Poco común', 'Raro', 'Épico', 'Legendario'];
  const ordenados = [...logros].sort((a, b) => (mios.has(b.codigo) - mios.has(a.codigo)) || (rarezas.indexOf(a.rareza) - rarezas.indexOf(b.rareza)));
  const fecha = (r) => new Date(r.creado_en).getTime();
  const misRecetas = [...recetas].sort((a, b) => {
    // si dos recetas tienen la misma fecha, desempata el orden en que se crearon
    if (orden === 'antiguas') return (fecha(a) - fecha(b)) || (a.id - b.id);
    if (orden === 'nota') return (Number(b.nota_promedio) - Number(a.nota_promedio)) || (b.num_notas - a.num_notas) || (fecha(b) - fecha(a));
    return (fecha(b) - fecha(a)) || (b.id - a.id);
  });
  const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Pantalla>
      <View style={[s.fila, { gap: 16 }]}>
        <Pressable onPress={cambiarFoto} accessibilityLabel="Cambiar foto de perfil">
          <Avatar url={perfil.avatar_url} nombre={perfil.nombre} tam={84} borde={C.dorado} />
          <View style={{ position: 'absolute', left: -4, bottom: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: C.tomate, borderWidth: 3, borderColor: C.fondo, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera" size={14} color={C.blanco} />
          </View>
          <View style={{ position: 'absolute', right: -4, bottom: -4, minWidth: 32, height: 32, borderRadius: 10, backgroundColor: C.dorado, borderWidth: 3, borderColor: C.fondo, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontWeight: '800', color: C.texto }}>{perfil.nivel}</Text>
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.titulo}>{perfil.nombre}</Text>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: C.doradoTinte }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.ambarOscuro }}>{perfil.titulo}</Text>
          </View>
          <Text style={s.sub}>{conteo.seguidores} seguidores · {conteo.siguiendo} siguiendo</Text>
        </View>
      </View>

      <Boton tipo="secundario" icono="people-outline" titulo="Buscar cocineros y amigos" onPress={() => nav.abrir('usuarios')} />

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

      <Seccion titulo="Mis recetas" derecha={<Text style={s.sub}>{recetas.length}</Text>}>
        {recetas.length === 0 ? (
          <Boton tipo="secundario" icono="add" titulo="Publica tu primera receta" onPress={() => nav.irA('publicar')} />
        ) : (
          <>
            <View style={s.chips}>
              <Chip texto="Más nuevas" icono="arrow-down" activo={orden === 'nuevas'} onPress={() => setOrden('nuevas')} />
              <Chip texto="Más antiguas" icono="arrow-up" activo={orden === 'antiguas'} onPress={() => setOrden('antiguas')} />
              <Chip texto="Mejor calificadas" icono="star" activo={orden === 'nota'} onPress={() => setOrden('nota')} />
            </View>
            {misRecetas.map((r) => (
              <Tarjeta key={r.id} onPress={() => nav.abrir('receta', { id: r.id })} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {r.foto_url ? (
                  <Image source={{ uri: r.foto_url }} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: C.superficie }} />
                ) : (
                  <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: C.superficie, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="restaurant-outline" size={24} color="#B9A68E" />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.etiqueta}>{r.titulo}</Text>
                  <View style={s.fila}>
                    <Estrellas valor={Number(r.nota_promedio)} tam={12} />
                    <Text style={s.sub}>{r.num_notas ? `${Number(r.nota_promedio).toFixed(1)} (${r.num_notas})` : 'Sin notas'}</Text>
                  </View>
                  <Text style={s.sub}>{fechaCorta(r.creado_en)} · {r.num_likes} me gusta · {r.num_cocinadas} la cocinaron</Text>
                </View>
              </Tarjeta>
            ))}
          </>
        )}
      </Seccion>

      <Boton tipo="neutro" titulo="Cerrar sesión" icono="log-out-outline" onPress={() => Alert.alert('¿Cerrar sesión?', '', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ])} />
    </Pantalla>
  );
}
