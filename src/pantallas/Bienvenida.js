import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { C } from '../theme';
import { Boton, Grilla, Casilla, s } from '../ui';
import { Mascota, Globo } from '../mascota';
import { registrar, guardarIngredientesInvitado } from '../analitica';
import { useApp } from '../contexto';
import { TOTAL_PASOS } from '../tutorial';
import SelectorIngredientes from '../SelectorIngredientes';

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
    supabase.from('ingredientes').select('id, nombre').in('nombre', TIPICOS)
      .then(({ data }) => setTipicos(TIPICOS.map((n) => (data || []).find((d) => d.nombre === n)).filter(Boolean)));
  }, []);

  const ids = new Set(elegidos.map((e) => e.id));
  const alternar = (ing) => setElegidos((l) => (ids.has(ing.id) ? l.filter((e) => e.id !== ing.id) : [...l, { id: ing.id, nombre: ing.nombre }]));

  async function verRecetas() {
    await guardarIngredientesInvitado(elegidos);
    registrar('bienvenida_resultados', { ingredientes: elegidos.length });
    tutorial.marcar('ingredientes');
    onTerminar({ pantalla: 'resultados', params: { tengo: elegidos.map((e) => e.id), primeraVez: true } });
  }

  if (paso === 0) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View />
        <View style={{ alignItems: 'center', gap: 22 }}>
          <Mascota tam={220} />
          <Text style={{ fontSize: 40, fontWeight: '800', color: C.tomate }}>Qué Hay</Text>
          <Globo texto="¿Hambre? Dime qué tienes en la cocina y te digo qué puedes preparar ahora mismo." style={{ maxWidth: 320 }} />
        </View>
        <View style={{ gap: 10 }}>
          <Boton titulo="Empezar" icono="arrow-forward" onPress={() => { tutorial.iniciar(); setPaso(1); }} />
          {repetir ? (
            <Pressable onPress={() => { tutorial.saltar(); nav.volver(); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: C.suave }}>Ahora no</Text>
            </Pressable>
          ) : (
          <Pressable onPress={() => { tutorial.saltar(); onTerminar({ pantalla: 'acceso', params: {} }); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.tomate }}>Ya tengo cuenta</Text>
          </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View style={[s.fila, { gap: 12, alignItems: 'flex-end' }]}>
          <Mascota tam={64} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.ambarOscuro, letterSpacing: 0.5 }}>TUTORIAL · PASO 1 DE {TOTAL_PASOS}</Text>
            <Globo texto="¿Qué tienes a mano? No tiene que ser todo: con 3 basta." />
          </View>
        </View>
        <Text style={s.titulo}>¿Qué tienes a mano?</Text>
        <Grilla>
          {tipicos.map((t) => (
            <Casilla key={t.id} nombre={t.nombre} estado={ids.has(t.id) ? 'tengo' : 'vacia_nombre'} onPress={() => alternar(t)} />
          ))}
        </Grilla>
        {elegidos.filter((e) => !TIPICOS.includes(e.nombre)).length ? (
          <View style={s.chips}>
            {elegidos.filter((e) => !TIPICOS.includes(e.nombre)).map((e) => (
              <Pressable key={e.id} onPress={() => alternar(e)} accessibilityRole="button" accessibilityLabel={`Quitar ${e.nombre}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, minHeight: 44, borderRadius: 999, backgroundColor: C.verdeTinte, borderWidth: 1, borderColor: C.verde }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: C.verdeOscuro }}>{e.nombre}</Text>
                <Ionicons name="close" size={14} color={C.verdeOscuro} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Boton tipo="neutro" icono="search" titulo="Buscar otro ingrediente" onPress={() => setSelector(true)} />
      </ScrollView>
      <View style={s.pie}>
        <Boton
          titulo={elegidos.length ? `Ver recetas con ${elegidos.length} ${elegidos.length === 1 ? 'ingrediente' : 'ingredientes'}` : 'Toca lo que tengas'}
          icono="restaurant-outline"
          deshabilitado={!elegidos.length}
          onPress={verRecetas}
        />
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
