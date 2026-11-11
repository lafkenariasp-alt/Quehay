import React, { useState } from 'react';
import { View, Text, TextInput, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C, CATEGORIAS_RECETA } from '../theme';
import { Pantalla, Encabezado, Seccion, Chip, Boton, Tarjeta, s } from '../ui';
import SelectorIngredientes from '../SelectorIngredientes';

const VACIO = { titulo: '', descripcion: '', minutos: '', porciones: '2', dificultad: 'Fácil', categorias: [], ingredientes: [], pasos: [''] };

export default function Publicar() {
  const { uid, nav, recargarPerfil } = useApp();
  const [f, setF] = useState(VACIO);
  const [selector, setSelector] = useState(false);
  const [guardando, setGuardando] = useState(false);
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
    const { data, error } = await supabase.from('recetas').insert({
      autor_id: uid,
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
    recargarPerfil();
    Alert.alert('¡Receta publicada!', 'Ganaste 50 XP.');
    nav.abrir('receta', { id: data.id });
  }

  return (
    <View style={{ flex: 1 }}>
      <Pantalla pie={<Boton titulo="Publicar receta" icono="cloud-upload-outline" cargando={guardando} onPress={publicar} />}>
        <Encabezado titulo="Publicar receta" sub="Comparte lo que sabes cocinar · +50 XP" />

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

        <Seccion titulo="Ingredientes" derecha={<Text style={s.sub}>{f.ingredientes.length}</Text>}>
          {f.ingredientes.map((i) => (
            <Tarjeta key={i.id} style={{ gap: 8 }}>
              <View style={s.filaEntre}>
                <Text style={s.etiqueta}>{i.nombre}</Text>
                <Pressable onPress={() => cambiar('ingredientes', f.ingredientes.filter((x) => x.id !== i.id))} hitSlop={10} accessibilityLabel={`Quitar ${i.nombre}`}>
                  <Ionicons name="trash-outline" size={20} color={C.suave} />
                </Pressable>
              </View>
              <TextInput style={s.input} value={i.cantidad} onChangeText={(v) => cambiarIng(i.id, 'cantidad', v)} placeholder="Cantidad (ej: 2 tazas)" placeholderTextColor={C.suave} />
              <Chip texto="Es opcional" icono={i.opcional ? 'checkbox' : 'square-outline'} activo={i.opcional} onPress={() => cambiarIng(i.id, 'opcional', !i.opcional)} />
            </Tarjeta>
          ))}
          <Boton tipo="neutro" icono="add" titulo="Agregar ingredientes" onPress={() => setSelector(true)} />
        </Seccion>

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
      </Pantalla>

      <SelectorIngredientes
        visible={selector}
        titulo="Ingredientes de la receta"
        ya={f.ingredientes.map((i) => i.id)}
        onListo={(lista) => { setSelector(false); cambiar('ingredientes', [...f.ingredientes, ...lista.map((i) => ({ id: i.id, nombre: i.nombre, cantidad: '', opcional: false }))]); }}
        onCerrar={() => setSelector(false)}
      />
    </View>
  );
}
