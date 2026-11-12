import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C, RAREZA, xpParaNivel } from '../theme';
import { Pantalla, Seccion, Boton, Tarjeta, TarjetaReceta, Pastilla, Interruptor, Cargando, Chip, Avatar, s } from '../ui';
import { desdeCamara, desdeGaleria, subirFoto } from '../fotos';
import { Mascota, PideCuenta } from '../mascota';
import { useAjustesSonido } from '../sonido';

// Sonidos y vibración se pueden apagar; en iPhone el modo silencio también los apaga
function AjustesSonido() {
  const a = useAjustesSonido();
  return (
    <Tarjeta style={{ gap: 6 }}>
      <Text style={[s.etiqueta, { fontSize: 16 }]}>Sonido y vibración</Text>
      <Interruptor icono="volume-high-outline" texto="Sonidos" valor={a.sonido} onCambiar={(v) => a.cambiar('sonido', v)} />
      <Interruptor icono="phone-portrait-outline" texto="Vibración" valor={a.vibracion} onCambiar={(v) => a.cambiar('vibracion', v)} />
    </Tarjeta>
  );
}

const TRAJES = ['Clásico', 'Andino', 'Patriota', 'Gourmet', 'Aventurero']; // por ahora solo el Clásico está disponible

export default function Perfil({ activa }) {
  const { uid, invitado, perfil, recargarPerfil, nav, pedirCuenta, tutorial, chefpu } = useApp();
  const repetirTutorial = () => { tutorial.reiniciar(); nav.abrir('tutorial'); };
  const [logros, setLogros] = useState([]);
  const [mios, setMios] = useState(new Set());
  const [recetas, setRecetas] = useState([]);
  const [conteo, setConteo] = useState({ seguidores: 0, siguiendo: 0 });
  const [orden, setOrden] = useState('nuevas'); // nuevas | antiguas | nota

  const cargar = useCallback(async () => {
    if (!uid) return;
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
  // Chefpu avisa cuando falta poco para subir de nivel
  useEffect(() => {
    if (!activa || !perfil) return;
    const falta = xpParaNivel(perfil.nivel + 1) - perfil.xp;
    if (falta > 0 && falta < 20) chefpu?.decir('perfil_cerca', '¡Estás a un plato de subir de nivel!', 'feliz');
  }, [activa, perfil?.xp]);

  if (invitado) {
    return (
      <View style={{ flex: 1 }}>
        <PideCuenta titulo="Tu perfil de cocinero" texto="Sube de nivel, desbloquea logros y clases, y muestra tus recetas." onCrear={() => pedirCuenta('Crea tu cuenta y abre tu regalo de bienvenida')} />
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 10 }}>
          <Boton tipo="neutro" icono="school-outline" titulo="Repetir tutorial con Chefpu" onPress={repetirTutorial} />
        </View>
      </View>
    );
  }
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

  const falta = sig - perfil.xp;
  const lugar = [`@${perfil.usuario}`, perfil.ciudad].filter(Boolean).join(' · ');
  const stats = [
    [conteo.seguidores, 'Seguidores', () => nav.abrir('amigos', { pestana: 'seguidores' })],
    [conteo.siguiendo, 'Siguiendo', () => nav.abrir('amigos', { pestana: 'siguiendo' })],
    [recetas.length, 'Recetas', null],
  ];
  return (
    <Pantalla>
      <View style={[s.fila, { gap: 14 }]}>
        <Pressable onPress={cambiarFoto} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil">
          <Avatar url={perfil.avatar_url} nombre={perfil.nombre} tam={84} borde={C.dorado} />
          <View style={{ position: 'absolute', left: -4, bottom: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: C.tomate, borderWidth: 3, borderColor: C.fondo, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera" size={14} color={C.blanco} />
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.texto, letterSpacing: -0.5 }}>{perfil.nombre}</Text>
          <Text style={{ fontSize: 14, color: C.suave }}>{lugar}</Text>
          {perfil.fundador ? <Pastilla texto="Fundador" icono="ribbon-outline" /> : null}
        </View>
      </View>

      <Tarjeta style={{ gap: 8 }}>
        <Text style={[s.etiqueta, { fontSize: 16 }]}>Nivel {perfil.nivel} · {perfil.titulo}</Text>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(avance * 100) }}
          style={{ height: 10, borderRadius: 5, backgroundColor: C.linea, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(avance * 100)}%`, height: '100%', backgroundColor: C.dorado }} />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.suave }}>
          {perfil.xp - base} / {sig - base} XP{falta > 0 ? ` · ¡Te faltan ${falta} para subir!` : ''}
        </Text>
      </Tarjeta>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {stats.map(([n, t, fn]) => (
          <Pressable key={t} onPress={fn} disabled={!fn} accessibilityRole={fn ? 'button' : 'text'} accessibilityLabel={`${n} ${t}`}
            style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: 18, backgroundColor: C.blanco, borderWidth: 1.5, borderColor: C.linea }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.texto }}>{n}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.suave }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Boton tipo="neutro" icono="people-outline" titulo="Amigos" onPress={() => nav.abrir('amigos')} />

      <Tarjeta>
        <Text style={[s.etiqueta, { fontSize: 16 }]}>Tu mascota</Text>
        <View style={[s.fila, { gap: 12 }]}>
          <View style={{ marginRight: 6 }}><Mascota tam={80} accesorio={(perfil.accesorios || [])[0]} /></View>
          <View style={{ flex: 1, gap: 6 }}>
            {TRAJES.map((nombre, i) => (
              <View key={nombre} style={[s.fila, { gap: 6 }]}>
                <Ionicons name={i === 0 ? 'checkmark-circle' : 'lock-closed'} size={15} color={i === 0 ? C.verde : C.suave} />
                <Text style={{ fontSize: 13, fontWeight: i === 0 ? '800' : '700', color: i === 0 ? C.texto : C.suave }}>{nombre}{i === 0 ? ' (puesto)' : ''}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 12, color: C.suave }}>Gana trajes nuevos al subir de nivel.</Text>
          </View>
        </View>
      </Tarjeta>

      <Seccion titulo="Logros" derecha={<Text style={s.sub}>{mios.size} de {logros.length}</Text>}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ordenados.map((l) => {
            const ok = mios.has(l.codigo);
            const color = RAREZA[l.rareza];
            return (
              <View key={l.codigo} style={{ width: '31.5%', alignItems: 'center', gap: 6, padding: 10, borderRadius: 16, backgroundColor: C.blanco, borderWidth: ok ? 2 : 1.5, borderColor: ok ? color : C.linea, borderStyle: ok ? 'solid' : 'dashed' }}>
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
              <Chip texto="Más nuevas" activo={orden === 'nuevas'} onPress={() => setOrden('nuevas')} />
              <Chip texto="Más antiguas" activo={orden === 'antiguas'} onPress={() => setOrden('antiguas')} />
              <Chip texto="Mejor calificadas" activo={orden === 'nota'} onPress={() => setOrden('nota')} />
            </View>
            {misRecetas.map((r) => (
              <TarjetaReceta key={r.id} titulo={r.titulo} foto={r.foto_url}
                meta={`${r.num_notas ? `${Number(r.nota_promedio).toFixed(1).replace('.', ',')} estrellas (${r.num_notas})` : 'Sin notas'} · ${fechaCorta(r.creado_en)}`}
                abajo={<Text style={{ fontSize: 13, color: C.suave }}>{r.num_likes} me gusta · {r.num_cocinadas} la cocinaron</Text>}
                onPress={() => nav.abrir('receta', { id: r.id })} />
            ))}
          </>
        )}
      </Seccion>

      <AjustesSonido />
      <Boton tipo="neutro" icono="school-outline" titulo="Repetir tutorial con Chefpu" onPress={repetirTutorial} />
      <Boton tipo="neutro" titulo="Cerrar sesión" icono="log-out-outline" onPress={() => Alert.alert('¿Cerrar sesión?', 'Tu nevera y tus recetas quedan guardadas en tu cuenta.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ])} />
    </Pantalla>
  );
}
