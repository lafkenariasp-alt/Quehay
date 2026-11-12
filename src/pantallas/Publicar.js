import React, { useState } from 'react';
import { View, Text, TextInput, Alert, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C, CATEGORIAS_RECETA } from '../theme';
import { Pantalla, Encabezado, Seccion, Chip, Boton, Tarjeta, s } from '../ui';
import { emojiDe } from '../emoji';
import SelectorIngredientes from '../SelectorIngredientes';
import { PideCuenta } from '../mascota';
import { elegirFoto, subirFoto } from '../fotos';
import { efecto } from '../sonido';

const VACIO = { foto: null, titulo: '', descripcion: '', minutos: '', porciones: '2', dificultad: 'Fácil', categorias: [], ingredientes: [], pasos: [''] };

export default function Publicar() {
  const { uid, invitado, nav, recargarPerfil, pedirCuenta } = useApp();
  const [f, setF] = useState(VACIO);
  const [selector, setSelector] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [paso, setPaso] = useState(0); // 0 foto y datos · 1 ingredientes · 2 preparación
  const cambiar = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const alternarCategoria = (c) =>
    cambiar('categorias', f.categorias.includes(c) ? f.categorias.filter((x) => x !== c) : [...f.categorias, c]);

  const cambiarIng = (id, k, v) =>
    cambiar('ingredientes', f.ingredientes.map((i) => (i.id === id ? { ...i, [k]: v } : i)));

  const cambiarPaso = (n, v) => cambiar('pasos', f.pasos.map((p, i) => (i === n ? v : p)));

  async function publicar() {
    const pasos = f.pasos.map((p) => p.trim()).filter(Boolean);
    const minutos = parseInt(f.minutos, 10);
    if (f.titulo.trim().length < 3) return Alert.alert('Falta el nombre', 'Ponle un nombre a tu receta.');
    if (!f.ingredientes.length) return Alert.alert('Faltan ingredientes', 'Agrega al menos un ingrediente.');
    if (!pasos.length) return Alert.alert('Faltan pasos', 'Escribe cómo se prepara.');
    if (!minutos) return Alert.alert('Falta el tiempo', '¿Cuántos minutos toma?');

    setGuardando(true);
    let foto_url = null;
    if (f.foto) {
      try { foto_url = await subirFoto(uid, f.foto, 'receta'); }
      catch (e) { setGuardando(false); return Alert.alert('No se pudo subir la foto', e.message); }
    }
    const { data, error } = await supabase.from('recetas').insert({
      autor_id: uid,
      foto_url,
      titulo: f.titulo.trim(),
      descripcion: f.descripcion.trim() || null,
      minutos,
      porciones: parseInt(f.porciones, 10) || 2,
      dificultad: f.dificultad,
      categorias: f.categorias,
      pasos,
    }).select('id').single();
    if (error) { setGuardando(false); return Alert.alert('Error', error.message); }

    const filas = f.ingredientes.map((i) => ({
      receta_id: data.id, ingrediente_id: i.id, cantidad: i.cantidad?.trim() || null, opcional: !!i.opcional,
    }));
    const r2 = await supabase.from('receta_ingredientes').insert(filas);
    setGuardando(false);
    if (r2.error) return Alert.alert('Error', r2.error.message);

    setF(VACIO);
    setPaso(0);
    recargarPerfil();
    efecto('xp');
    Alert.alert('¡Receta publicada!', 'Ganas 50 XP por receta (hasta 3 recetas con XP al día).');
    nav.abrir('receta', { id: data.id });
  }

  if (invitado) {
    return <PideCuenta titulo="Comparte tus recetas" texto="Publica lo que sabes cocinar, gana XP cada vez que alguien la prepara y sube de nivel." onCrear={() => pedirCuenta('Crea tu cuenta para publicar tus recetas')} />;
  }

  const PASOS = ['Foto y datos', 'Ingredientes', 'Preparación'];
  // Cada paso revisa lo suyo antes de avanzar
  function siguiente() {
    if (paso === 0) {
      if (f.titulo.trim().length < 3) return Alert.alert('Falta el nombre', 'Ponle un nombre a tu receta.');
      if (!parseInt(f.minutos, 10)) return Alert.alert('Falta el tiempo', '¿Cuántos minutos toma?');
    }
    if (paso === 1 && !f.ingredientes.length) return Alert.alert('Faltan ingredientes', 'Agrega al menos un ingrediente.');
    efecto('paso');
    setPaso(paso + 1);
  }
  const pie = (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {paso > 0 ? <Boton tipo="neutro" titulo="Atrás" icono="chevron-back" onPress={() => { efecto('paso'); setPaso(paso - 1); }} style={{ flex: 1 }} /> : null}
      {paso < 2
        ? <Boton titulo="Siguiente" icono="chevron-forward" onPress={siguiente} style={{ flex: 1 }} />
        : <Boton titulo="Publicar receta" icono="cloud-upload-outline" cargando={guardando} onPress={publicar} style={{ flex: 1.4 }} />}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Pantalla key={paso} pie={pie}>
        <Encabezado titulo="Publicar receta" sub="Comparte lo que sabes cocinar · +50 XP" />
        <View style={{ gap: 8 }} accessible accessibilityLabel={`Paso ${paso + 1} de 3: ${PASOS[paso]}`}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {PASOS.map((n, i) => (
              <View key={n} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= paso ? C.tomate : C.linea }} />
            ))}
          </View>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.tomate }}>Paso {paso + 1} de 3 · {PASOS[paso]}</Text>
        </View>

        {paso === 0 ? (
          <>
          <Pressable onPress={async () => { const foto = await elegirFoto(); if (foto) cambiar('foto', foto); }} accessibilityRole="button" accessibilityLabel={f.foto ? 'Cambiar foto de la receta' : 'Agregar foto de la receta'}
            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 18, borderWidth: 2, borderStyle: f.foto ? 'solid' : 'dashed', borderColor: f.foto ? C.verde : '#CBBBA5', backgroundColor: C.blanco, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {f.foto ? (
              <Image source={{ uri: f.foto.uri }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Ionicons name="camera-outline" size={40} color={C.suave} />
                <Text style={s.etiqueta}>Agrega una foto del plato</Text>
                <Text style={s.sub}>Las recetas con foto se cocinan mucho más</Text>
              </View>
            )}
          </Pressable>

          <View style={{ gap: 8 }}>
            <Text style={s.etiqueta}>Nombre</Text>
            <TextInput style={s.input} value={f.titulo} onChangeText={(v) => cambiar('titulo', v)} placeholder="Ej: Porotos con riendas de la abuela" placeholderTextColor={C.suave} maxLength={80} />
            <Text style={s.etiqueta}>Descripción (opcional)</Text>
            <TextInput style={[s.input, { minHeight: 70, paddingTop: 12 }]} multiline value={f.descripcion} onChangeText={(v) => cambiar('descripcion', v)} placeholder="Cuenta algo de esta receta" placeholderTextColor={C.suave} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={s.etiqueta}>Minutos</Text>
              <TextInput style={s.input} keyboardType="number-pad" value={f.minutos} onChangeText={(v) => cambiar('minutos', v.replace(/\D/g, ''))} placeholder="30" placeholderTextColor={C.suave} />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={s.etiqueta}>Porciones</Text>
              <TextInput style={s.input} keyboardType="number-pad" value={f.porciones} onChangeText={(v) => cambiar('porciones', v.replace(/\D/g, ''))} />
            </View>
          </View>

          <Seccion titulo="Dificultad">
            <View style={s.chips}>
              {['Fácil', 'Media', 'Difícil'].map((d) => (
                <Chip key={d} texto={d} activo={f.dificultad === d} onPress={() => cambiar('dificultad', d)} />
              ))}
            </View>
          </Seccion>

          <Seccion titulo="Categorías">
            <View style={s.chips}>
              {CATEGORIAS_RECETA.map((c) => (
                <Chip key={c} texto={c} activo={f.categorias.includes(c)} onPress={() => alternarCategoria(c)} />
              ))}
            </View>
          </Seccion>

          </>
        ) : paso === 1 ? (
          <Seccion titulo="Ingredientes" derecha={<Text style={s.sub}>{f.ingredientes.length}</Text>}>
            {f.ingredientes.map((i) => (
              <Tarjeta key={i.id} style={{ gap: 8 }}>
                <View style={s.filaEntre}>
                  <Text style={s.etiqueta}>{emojiDe(i.nombre)} {i.nombre}</Text>
                  <Pressable onPress={() => cambiar('ingredientes', f.ingredientes.filter((x) => x.id !== i.id))} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Quitar ${i.nombre}`}>
                    <Ionicons name="trash-outline" size={20} color={C.suave} />
                  </Pressable>
                </View>
                <TextInput style={s.input} value={i.cantidad} onChangeText={(v) => cambiarIng(i.id, 'cantidad', v)} placeholder="Cantidad (ej: 2 tazas)" placeholderTextColor={C.suave} />
                <Chip texto="Es opcional" icono={i.opcional ? 'checkbox' : 'square-outline'} activo={i.opcional} onPress={() => cambiarIng(i.id, 'opcional', !i.opcional)} />
              </Tarjeta>
            ))}
            <Boton tipo="neutro" icono="add" titulo="Agregar ingredientes" onPress={() => setSelector(true)} />
          </Seccion>

        ) : (
          <Seccion titulo="Preparación">
            {f.pasos.map((p, n) => (
              <View key={n} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, marginTop: 10, borderRadius: 8, backgroundColor: C.tomateTinte, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '800', color: C.tomateOscuro }}>{n + 1}</Text>
                </View>
                <TextInput style={[s.input, { flex: 1, minHeight: 60, paddingTop: 12 }]} multiline value={p} onChangeText={(v) => cambiarPaso(n, v)} placeholder="Describe este paso" placeholderTextColor={C.suave} />
              </View>
            ))}
            <Boton tipo="neutro" icono="add" titulo="Agregar paso" onPress={() => cambiar('pasos', [...f.pasos, ''])} />
          </Seccion>
        )}
      </Pantalla>

      <SelectorIngredientes
        visible={selector}
        titulo="Ingredientes de la receta"
        ya={f.ingredientes}
        onAgregar={(i) => setF((x) => (x.ingredientes.some((e) => e.id === i.id) ? x : { ...x, ingredientes: [...x.ingredientes, { id: i.id, nombre: i.nombre, cantidad: '', opcional: false }] }))}
        onQuitar={(i) => setF((x) => ({ ...x, ingredientes: x.ingredientes.filter((e) => e.id !== i.id) }))}
        onCerrar={() => setSelector(false)}
      />
    </View>
  );
}
