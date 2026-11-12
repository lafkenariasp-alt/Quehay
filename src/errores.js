import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { C } from './theme';
import { registrar } from './analitica';

// Si una pantalla falla, en vez de quedar en blanco se muestra qué pasó y un botón para seguir.
// El error queda guardado en Supabase (eventos_app, nombre 'error_app') para revisarlo.
export default class Errores extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, intento: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    registrar('error_app', {
      mensaje: String(error?.message || error).slice(0, 500),
      donde: String(info?.componentStack || '').split('\n').filter(Boolean).slice(0, 6).join(' < ').slice(0, 500),
      plataforma: Platform.OS,
    });
  }

  render() {
    const { error, intento } = this.state;
    if (!error) return <React.Fragment key={intento}>{this.props.children}</React.Fragment>;
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.texto }}>Uy, algo falló</Text>
        <Text style={{ fontSize: 16, color: C.suave }}>Ya quedó registrado para arreglarlo. Si puedes, toma una captura de esta pantalla.</Text>
        <ScrollView style={{ maxHeight: 160, backgroundColor: C.superficie, borderRadius: 12 }} contentContainerStyle={{ padding: 12 }}>
          <Text selectable style={{ fontSize: 13, color: C.texto, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{String(error?.message || error)}</Text>
        </ScrollView>
        <Pressable onPress={() => this.setState((s) => ({ error: null, intento: s.intento + 1 }))} accessibilityRole="button"
          style={{ minHeight: 56, borderRadius: 18, backgroundColor: C.tomate, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.blanco, fontSize: 17, fontWeight: '800' }}>Volver a la app</Text>
        </Pressable>
      </View>
    );
  }
}
