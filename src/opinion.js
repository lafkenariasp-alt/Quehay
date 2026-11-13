import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { C } from './theme';
import { Boton, Chip, s } from './ui';
import { Mascota } from './chefpu';
import { efecto } from './sonido';
import { idDispositivo, registrar } from './analitica';

// Opinión, idea o error: se abre desde el menú de Chefpu o desde el Perfil.
// Se guarda en la tabla opiniones (migración 012) con la pantalla donde estaba la persona.
let abrir = null;
export function abrirOpinion(pantalla) { if (abrir) abrir(pantalla); }

const CARAS = [['😣', 'Muy mal'], ['🙁', 'Mal'], ['😐', 'Más o menos'], ['🙂', 'Bien'], ['😍', 'Me encanta']];
const TIPOS = [
  ['opinion', 'Opinión', '¿Qué te gustó y qué no?'],
  ['idea', 'Idea o cambio', '¿Qué cambiarías o agregarías?'],
  ['error', 'Error o bug', '¿Qué pasó? ¿Qué estabas haciendo cuando falló?'],
];
const NOMBRES = { nevera: 'Nevera', buscar: 'Buscar', comunidad: 'Comunidad', publicar: 'Publicar', perfil: 'Perfil', resultados: 'Resultados', receta: 'Receta', usuarios: 'Cocineros', amigos: 'Cocineros', perfilPublico: 'Perfil de otra persona', tutorial: 'Tutorial' };

export function VentanaOpinion({ uid, alEnviar }) {
  const [pantalla, setPantalla] = useState(null); // null = cerrada
  const [nota, setNota] = useState(null);
  const [tipo, setTipo] = useState('opinion');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    abrir = (p) => { setPantalla(p || 'app'); setNota(null); setTipo('opinion'); setTexto(''); setError(null); };
    return () => { abrir = null; };
  }, []);

  const cerrar = () => setPantalla(null);
  const listo = texto.trim().length >= 3;

  async function enviar() {
    if (!listo || enviando) return;
    setEnviando(true);
    setError(null);
    const { error: e } = await supabase.from('opiniones').insert({
      usuario_id: uid || null,
      dispositivo: await idDispositivo(),
      tipo, nota, texto: texto.trim(), pantalla,
      plataforma: `${Platform.OS} ${Platform.Version || ''}`.trim(),
    });
    setEnviando(false);
    if (e) { setError('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.'); return; }
    registrar('opinion_enviada', { tipo, nota, pantalla }, uid);
    efecto('exito');
    cerrar();
    alEnviar?.(tipo);
  }

  if (!pantalla) return null;
  const tipoActual = TIPOS.find((t) => t[0] === tipo);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={cerrar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(42,33,28,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={cerrar} accessibilityLabel="Cerrar" />
        <View style={{ backgroundColor: C.fondo, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <View style={[s.fila, { gap: 12 }]}>
              <Mascota tam={56} expresion="feliz" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: C.texto }}>Cuéntame</Text>
                <Text style={s.sub}>Lo leo todo. Me ayuda a mejorar Qué Hay.</Text>
              </View>
              <Pressable onPress={cerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar"
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={26} color={C.suave} />
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={s.etiqueta}>¿Qué te pareció la app?</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {CARAS.map(([cara, nombre], i) => {
                  const sel = nota === i + 1;
                  return (
                    <Pressable key={cara} onPress={() => { efecto('marcar'); setNota(sel ? null : i + 1); }}
                      accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={nombre}
                      style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: sel ? C.doradoTinte : C.blanco, borderWidth: sel ? 2 : 1.5, borderColor: sel ? C.dorado : C.linea, opacity: nota && !sel ? 0.55 : 1 }}>
                      <Text style={{ fontSize: 28 }}>{cara}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={s.etiqueta}>Es sobre…</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TIPOS.map(([id, nombre]) => <Chip key={id} texto={nombre} activo={tipo === id} onPress={() => setTipo(id)} />)}
              </View>
            </View>

            <TextInput value={texto} onChangeText={setTexto} multiline maxLength={2000} placeholder={tipoActual[2]} placeholderTextColor={C.suave}
              accessibilityLabel={tipoActual[2]} textAlignVertical="top"
              style={[s.input, { minHeight: 120, paddingTop: 14 }]} />

            <Text style={{ fontSize: 13, color: C.suave }}>
              Se envía {uid ? 'con tu nick' : 'sin nombre'} y la pantalla donde estabas: {NOMBRES[pantalla] || 'App'}.
            </Text>
            {error ? <Text style={{ fontSize: 14, fontWeight: '700', color: C.tomate }}>{error}</Text> : null}
            <Boton titulo="Enviar" icono="send" onPress={enviar} cargando={enviando} deshabilitado={!listo} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
