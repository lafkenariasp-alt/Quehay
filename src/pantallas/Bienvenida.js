import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { C } from '../theme';
import { Boton, Grilla, Casilla, s } from '../ui';
import { emojiDe } from '../emoji';
import { Mascota, Globo } from '../mascota';
import { registrar, guardarIngredientesInvitado } from '../analitica';
import { useApp } from '../contexto';
import { Foco } from '../foco';
import SelectorIngredientes from '../SelectorIngredientes';
import { efecto } from '../sonido';

// Lo más común en una cocina chilena: se toca y listo
const TIPICOS = ['Huevos', 'Arroz', 'Pollo', 'Cebolla', 'Papas', 'Tomate', 'Ajo', 'Fideos', 'Leche', 'Queso', 'Zanahoria', 'Pan'];

// Primera vez que se abre la app: de "tengo hambre" a recetas en menos de un minuto, sin registrarse
export default function Bienvenida({ onTerminar, repetir = false }) {
  const { tutorial, nav } = useApp();
  const [paso, setPaso] = useState(0);
  const [tipicos, setTipicos] = useState([]);
  const [elegidos, setElegidos] = useState([]); // [{ id, nombre }]
  const [selector, setSelector] = useState(false);

  useEffect(() => {
    registrar('bienvenida_inicio');
    tutorial.iniciar(); // la historia de Chefpu parte aquí
    supabase.from('ingredientes').select('id, nombre').in('nombre', TIPICOS)
      .then(({ data }) => setTipicos(TIPICOS.map((n) => (data || []).find((d) => d.nombre === n)).filter(Boolean)));
  }, []);

  const ids = new Set(elegidos.map((e) => e.id));
  const alternar = (ing) => {
    if (!ids.has(ing.id)) { tutorial.evento('casilla'); efecto('marcar'); } else efecto('desmarcar');
    setElegidos((l) => (l.some((e) => e.id === ing.id) ? l.filter((e) => e.id !== ing.id) : [...l, { id: ing.id, nombre: ing.nombre }]));
  };

  async function verRecetas() {
    await guardarIngredientesInvitado(elegidos);
    registrar('bienvenida_resultados', { ingredientes: elegidos.length });
    tutorial.evento('ver_recetas');
    onTerminar({ pantalla: 'resultados', params: { tengo: elegidos.map((e) => e.id), primeraVez: true } });
  }

  if (paso === 0) {
    return (
      <Foco id="pantalla_bienvenida" style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View />
        <View style={{ alignItems: 'center', gap: 22 }}>
          <Mascota tam={220} />
          <Text style={{ fontSize: 40, fontWeight: '800', color: C.tomate }}>Qué Hay</Text>
          <Globo texto="¿Hambre? Dime qué tienes en la cocina y te digo qué puedes preparar ahora mismo." style={{ maxWidth: 320 }} />
        </View>
        <View style={{ gap: 10 }}>
          <Foco id="empezar"><Boton titulo="Empezar" icono="arrow-forward" onPress={() => { tutorial.evento('empezar'); setPaso(1); }} /></Foco>
          {repetir ? (
            <Pressable onPress={() => { tutorial.saltar(); nav.volver(); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: C.suave }}>Saltar tutorial</Text>
            </Pressable>
          ) : (
          <Pressable onPress={() => { tutorial.saltar(); onTerminar({ pantalla: 'acceso', params: {} }); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.tomate }}>Ya tengo cuenta</Text>
          </Pressable>
          )}
        </View>
      </Foco>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
        <View style={[s.fila, { gap: 12, alignItems: 'flex-end' }]}>
          <Mascota tam={72} expresion="pensando" />
          <View style={{ flex: 1, gap: 6 }}>
            <Globo texto="¿Qué tienes a mano? No tiene que ser todo: con 3 basta." />
          </View>
        </View>
        <Foco id="grilla"><Grilla>
          {tipicos.map((t) => (
            <Casilla key={t.id} ancho="31%" emoji={emojiDe(t.nombre)} nombre={t.nombre} estado={ids.has(t.id) ? 'tengo' : 'vacia_nombre'} onPress={() => alternar(t)} />
          ))}
        </Grilla></Foco>
        {elegidos.filter((e) => !TIPICOS.includes(e.nombre)).length ? (
          <View style={s.chips}>
            {elegidos.filter((e) => !TIPICOS.includes(e.nombre)).map((e) => (
              <Pressable key={e.id} onPress={() => alternar(e)} accessibilityRole="button" accessibilityLabel={`Quitar ${e.nombre}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, minHeight: 44, borderRadius: 999, backgroundColor: C.verdeTinte, borderWidth: 1, borderColor: C.verde }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: C.verdeOscuro }}>{emojiDe(e.nombre)} {e.nombre}</Text>
                <Ionicons name="close" size={14} color={C.verdeOscuro} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Foco id="buscar_otro"><Boton tipo="neutro" icono="search" titulo="Buscar otro ingrediente" onPress={() => setSelector(true)} /></Foco>
      </ScrollView>
      <View style={s.pie}>
        <Foco id="ver_recetas"><Boton
          titulo={elegidos.length ? `Ver recetas con ${elegidos.length} ${elegidos.length === 1 ? 'ingrediente' : 'ingredientes'}` : 'Toca lo que tengas'}
          icono="restaurant-outline"
          deshabilitado={!elegidos.length}
          onPress={verRecetas}
        /></Foco>
      </View>
      <SelectorIngredientes
        visible={selector}
        titulo="¿Qué más tienes?"
        ya={elegidos}
        onAgregar={(i) => setElegidos((l) => (l.some((e) => e.id === i.id) ? l : [...l, { id: i.id, nombre: i.nombre }]))}
        onQuitar={(i) => setElegidos((l) => l.filter((e) => e.id !== i.id))}
        onCerrar={() => setSelector(false)}
      />
    </View>
  );
}
