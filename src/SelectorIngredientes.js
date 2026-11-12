import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { C, CATEGORIAS_ING } from './theme';
import { s, Chip } from './ui';
import { useApp } from './contexto';
import { efecto } from './sonido';

// Ventana para agregar ingredientes del catálogo.
// - Tocar un resultado lo agrega al tiro (y limpia el buscador para el siguiente).
// - Escribir varios separados por coma y presionar Intro agrega todos.
// - Tocar un chip de "agregados" lo quita.
// ya: [{ id, nombre }] lo que ya está agregado. onAgregar(ing) / onQuitar(ing) los maneja la pantalla que la abre.
export default function SelectorIngredientes({ visible, titulo = 'Agregar ingredientes', ya = [], onAgregar, onQuitar, onCerrar }) {
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [aviso, setAviso] = useState('');
  const input = useRef(null);
  const idsYa = new Set(ya.map((i) => i.id));
  const { uid } = useApp();
  const cerrar = () => { Keyboard.dismiss(); onCerrar(); };

  useEffect(() => {
    if (!visible) { setQ(''); setCategoria(null); setResultados([]); setAviso(''); }
  }, [visible]);

  // Busca mientras escribe (usa solo lo que va después de la última coma)
  useEffect(() => {
    let cancelado = false;
    const termino = q.split(',').pop().trim();
    async function cargar() {
      let data = [];
      if (termino.length >= 2) {
        const r = await supabase.rpc('buscar_ingrediente', { q: termino });
        data = r.data || [];
      } else if (categoria) {
        const r = await supabase.from('ingredientes').select('*').eq('categoria', categoria).eq('es_basico', false).order('nombre');
        data = r.data || [];
      }
      if (!cancelado) setResultados(data);
    }
    if (visible) cargar();
    return () => { cancelado = true; };
  }, [q, categoria, visible]);

  function agregar(ing) {
    if (idsYa.has(ing.id)) { efecto('desmarcar'); onQuitar && onQuitar(ing); return; }
    efecto('marcar');
    onAgregar(ing);
    // limpia solo el término actual, deja los anteriores separados por coma
    const partes = q.split(',');
    if (partes.length > 1) { partes.pop(); setQ(partes.join(',') + ', '); } else setQ('');
    setAviso(`${ing.nombre} agregado`);
    input.current && input.current.focus();
  }

  // Ingrediente que no está: se envía para revisión y se agrega al catálogo si se aprueba
  async function proponer() {
    const nombre = q.split(',').pop().trim();
    if (!uid) { setAviso('Crea tu cuenta para proponer ingredientes'); return; }
    const { error } = await supabase.from('propuestas_ingredientes').insert({ usuario_id: uid, nombre, categoria });
    setAviso(error ? 'No se pudo enviar la propuesta' : `¡Gracias! Revisaremos "${nombre}" para agregarlo al catálogo`);
  }

  // Intro: agrega cada término separado por coma (el primer resultado de cada uno)
  async function agregarVarios() {
    const terminos = q.split(',').map((t) => t.trim()).filter((t) => t.length >= 2);
    if (!terminos.length) { cerrar(); return; } // Intro con el campo vacío = terminé
    const agregados = [];
    const noEncontrados = [];
    for (const t of terminos) {
      const { data } = await supabase.rpc('buscar_ingrediente', { q: t });
      const ing = (data || [])[0];
      if (!ing) { noEncontrados.push(t); continue; }
      if (!idsYa.has(ing.id) && !agregados.some((a) => a.id === ing.id)) { onAgregar(ing); agregados.push(ing); }
    }
    setQ(noEncontrados.join(', '));
    setAviso([
      agregados.length ? `Agregados: ${agregados.map((a) => a.nombre).join(', ')}` : '',
      noEncontrados.length ? `No encontramos: ${noEncontrados.join(', ')}` : '',
    ].filter(Boolean).join(' · '));
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cerrar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.fondo, padding: 20, gap: 12 }}>
        <View style={s.filaEntre}>
          <Text style={s.seccion}>{titulo}</Text>
          <Pressable onPress={cerrar} hitSlop={10} accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: C.tomate }}>
            <Ionicons name="checkmark" size={18} color={C.blanco} />
            <Text style={{ color: C.blanco, fontWeight: '800', fontSize: 15 }}>Listo{ya.length ? ` (${ya.length})` : ''}</Text>
          </Pressable>
        </View>

        {ya.length ? (
          <View style={{ gap: 6 }}>
            <Text style={s.sub}>{ya.length} agregados · toca uno para quitarlo</Text>
            <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {[...ya].reverse().map((i) => (
                <Pressable key={i.id} onPress={() => { if (onQuitar) { efecto('desmarcar'); onQuitar(i); } }} accessibilityRole="button" accessibilityLabel={onQuitar ? `Quitar ${i.nombre}` : i.nombre} hitSlop={{ top: 4, bottom: 4 }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, minHeight: 36, borderRadius: 999, backgroundColor: C.verdeTinte, borderWidth: 1, borderColor: C.verde }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.verdeOscuro }}>{i.nombre}</Text>
                  {onQuitar ? <Ionicons name="close" size={14} color={C.verdeOscuro} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={[s.input, s.fila]}>
          <Ionicons name="search" size={18} color={C.suave} />
          <TextInput
            ref={input}
            value={q}
            onChangeText={(t) => { setQ(t); setAviso(''); if (t) setCategoria(null); }}
            onSubmitEditing={agregarVarios}
            blurOnSubmit={false}
            returnKeyType="done"
            placeholder="Ej: pollo, arroz, cebolla, ajo"
            placeholderTextColor={C.suave}
            autoCorrect={false}
            autoFocus
            style={{ flex: 1, fontSize: 15, color: C.texto }}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close-circle" size={18} color={C.suave} />
            </Pressable>
          ) : null}
        </View>
        <Text style={[s.sub, aviso ? { color: C.verde } : null]}>
          {aviso || 'Toca para agregar, o escribe varios con coma y presiona Intro. Intro con el campo vacío cierra.'}
        </Text>

        <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {CATEGORIAS_ING.filter((c) => c !== 'Bebidas').map((c) => (
            <Chip key={c} texto={c} activo={categoria === c} onPress={() => { setQ(''); setCategoria(categoria === c ? null : c); }} />
          ))}
        </ScrollView>

        <FlatList
          data={resultados}
          keyExtractor={(i) => String(i.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={{ flex: 1 }}
          ListEmptyComponent={
            q.split(',').pop().trim().length >= 2 ? (
              <View style={{ alignItems: 'center', gap: 10, marginTop: 24 }}>
                <Text style={s.sub}>No encontramos "{q.split(',').pop().trim()}" en el catálogo</Text>
                <Pressable onPress={proponer} accessibilityRole="button" style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.tomate, justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '800', color: C.tomate }}>Proponer "{q.split(',').pop().trim()}"</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={[s.sub, { textAlign: 'center', marginTop: 24 }]}>Escribe o elige una categoría</Text>
            )
          }
          renderItem={({ item }) => {
            const marcado = idsYa.has(item.id);
            return (
              <Pressable onPress={() => agregar(item)} accessibilityRole="button" accessibilityLabel={`Agregar ${item.nombre}`} style={[s.fila, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.linea }]}>
                <Ionicons name={marcado ? 'checkmark-circle' : 'add-circle-outline'} size={26} color={marcado ? C.verde : C.tomate} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.texto }}>{item.nombre}</Text>
                  <Text style={s.sub}>{marcado ? 'Agregado · toca para quitar' : item.categoria}</Text>
                </View>
              </Pressable>
            );
          }}
        />

      </KeyboardAvoidingView>
    </Modal>
  );
}
