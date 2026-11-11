import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { C, CATEGORIAS_ING } from './theme';
import { s, Chip, Boton } from './ui';

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
    if (idsYa.has(ing.id)) { onQuitar && onQuitar(ing); return; }
    onAgregar(ing);
    // limpia solo el término actual, deja los anteriores separados por coma
    const partes = q.split(',');
    if (partes.length > 1) { partes.pop(); setQ(partes.join(',') + ', '); } else setQ('');
    setAviso(`${ing.nombre} agregado`);
    input.current && input.current.focus();
  }

  // Intro: agrega cada término separado por coma (el primer resultado de cada uno)
  async function agregarVarios() {
    const terminos = q.split(',').map((t) => t.trim()).filter((t) => t.length >= 2);
    if (!terminos.length) return;
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <View style={{ flex: 1, backgroundColor: C.fondo, padding: 20, gap: 12 }}>
        <View style={s.filaEntre}>
          <Text style={s.seccion}>{titulo}</Text>
          <Pressable onPress={onCerrar} hitSlop={10} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={26} color={C.texto} />
          </Pressable>
        </View>

        {ya.length ? (
          <View style={{ gap: 6 }}>
            <Text style={s.sub}>{ya.length} agregados · toca uno para quitarlo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {ya.map((i) => (
                <Pressable key={i.id} onPress={() => onQuitar && onQuitar(i)}
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
            <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close-circle" size={18} color={C.suave} />
            </Pressable>
          ) : null}
        </View>
        <Text style={[s.sub, aviso ? { color: C.verde } : null]}>
          {aviso || 'Toca un resultado para agregarlo, o escribe varios separados por coma y presiona Intro.'}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {CATEGORIAS_ING.filter((c) => c !== 'Bebidas').map((c) => (
            <Chip key={c} texto={c} activo={categoria === c} onPress={() => { setQ(''); setCategoria(categoria === c ? null : c); }} />
          ))}
        </ScrollView>

        <FlatList
          data={resultados}
          keyExtractor={(i) => String(i.id)}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          ListEmptyComponent={
            <Text style={[s.sub, { textAlign: 'center', marginTop: 24 }]}>
              {q.split(',').pop().trim().length >= 2 ? 'No encontramos ese ingrediente' : 'Escribe o elige una categoría'}
            </Text>
          }
          renderItem={({ item }) => {
            const marcado = idsYa.has(item.id);
            return (
              <Pressable onPress={() => agregar(item)} style={[s.fila, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.linea }]}>
                <Ionicons name={marcado ? 'checkmark-circle' : 'add-circle-outline'} size={26} color={marcado ? C.verde : C.tomate} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.texto }}>{item.nombre}</Text>
                  <Text style={s.sub}>{marcado ? 'Agregado · toca para quitar' : item.categoria}</Text>
                </View>
              </Pressable>
            );
          }}
        />

        <Boton titulo={ya.length ? `Listo (${ya.length})` : 'Listo'} icono="checkmark" onPress={onCerrar} />
      </View>
    </Modal>
  );
}
