import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { C, CATEGORIAS_ING } from './theme';
import { s, Chip, Boton } from './ui';

// Ventana para elegir ingredientes del catálogo: por texto (con sinónimos) o por categoría.
// ya: ids ya elegidos (se muestran marcados). onListo(lista de ingredientes elegidos).
export default function SelectorIngredientes({ visible, titulo = 'Agregar ingredientes', ya = [], onListo, onCerrar }) {
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [elegidos, setElegidos] = useState({});

  useEffect(() => {
    if (!visible) { setQ(''); setCategoria(null); setElegidos({}); }
  }, [visible]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      let data = [];
      if (q.trim().length >= 2) {
        const r = await supabase.rpc('buscar_ingrediente', { q: q.trim() });
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

  const alternar = (ing) =>
    setElegidos((e) => {
      const n = { ...e };
      if (n[ing.id]) delete n[ing.id]; else n[ing.id] = ing;
      return n;
    });

  const cantidad = Object.keys(elegidos).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <View style={{ flex: 1, backgroundColor: C.fondo, padding: 20, gap: 14 }}>
        <View style={s.filaEntre}>
          <Text style={s.seccion}>{titulo}</Text>
          <Pressable onPress={onCerrar} hitSlop={10} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={26} color={C.texto} />
          </Pressable>
        </View>

        <View style={[s.input, s.fila]}>
          <Ionicons name="search" size={18} color={C.suave} />
          <TextInput
            value={q}
            onChangeText={(t) => { setQ(t); if (t) setCategoria(null); }}
            placeholder="Escribe: palta, pollo, fideos…"
            placeholderTextColor={C.suave}
            autoCorrect={false}
            style={{ flex: 1, fontSize: 15, color: C.texto }}
          />
        </View>

        <View style={s.chips}>
          {CATEGORIAS_ING.filter((c) => c !== 'Bebidas').map((c) => (
            <Chip key={c} texto={c} activo={categoria === c} onPress={() => { setQ(''); setCategoria(categoria === c ? null : c); }} />
          ))}
        </View>

        <FlatList
          data={resultados}
          keyExtractor={(i) => String(i.id)}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          ListEmptyComponent={
            <Text style={[s.sub, { textAlign: 'center', marginTop: 24 }]}>
              {q.length >= 2 ? 'No encontramos ese ingrediente' : 'Busca por nombre o elige una categoría'}
            </Text>
          }
          renderItem={({ item }) => {
            const marcado = !!elegidos[item.id] || ya.includes(item.id);
            return (
              <Pressable
                onPress={() => !ya.includes(item.id) && alternar(item)}
                style={[s.fila, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.linea }]}
              >
                <Ionicons name={marcado ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={marcado ? C.verde : C.suave} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.texto }}>{item.nombre}</Text>
                  <Text style={s.sub}>{ya.includes(item.id) ? 'Ya lo tienes' : item.categoria}</Text>
                </View>
              </Pressable>
            );
          }}
        />

        <Boton
          titulo={cantidad ? `Agregar ${cantidad}` : 'Elige ingredientes'}
          deshabilitado={!cantidad}
          onPress={() => onListo(Object.values(elegidos))}
        />
      </View>
    </Modal>
  );
}
