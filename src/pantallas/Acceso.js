import React, { useState } from 'react';
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../supabase';
import { C } from '../theme';
import { Pantalla, Boton, s } from '../ui';

export default function Acceso() {
  const [modo, setModo] = useState('entrar'); // entrar | registro
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    if (!correo.includes('@') || clave.length < 6) {
      Alert.alert('Revisa tus datos', 'Usa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }
    setCargando(true);
    try {
      if (modo === 'registro') {
        const { data, error } = await supabase.auth.signUp({
          email: correo.trim(),
          password: clave,
          options: { data: { nombre: nombre.trim() || 'Cocinero' } },
        });
        if (error) throw error;
        if (!data.session) {
          Alert.alert('Revisa tu correo', 'Te enviamos un enlace para confirmar tu cuenta. Después vuelve y entra.');
          setModo('entrar');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
        if (error) throw error;
      }
    } catch (e) {
      Alert.alert('No se pudo', traducir(e.message));
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla>
        <View style={{ gap: 6, marginTop: 40 }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: C.tomate }}>Qué Hay</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: C.texto }}>
            Cocina con lo que tienes, comparte y sube de nivel.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {modo === 'registro' ? (
            <TextInput style={s.input} placeholder="Tu nombre" placeholderTextColor={C.suave} value={nombre} onChangeText={setNombre} />
          ) : null}
          <TextInput
            style={s.input}
            placeholder="Correo"
            placeholderTextColor={C.suave}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={correo}
            onChangeText={setCorreo}
          />
          <TextInput
            style={s.input}
            placeholder="Contraseña"
            placeholderTextColor={C.suave}
            secureTextEntry
            value={clave}
            onChangeText={setClave}
          />
          <Boton titulo={modo === 'registro' ? 'Crear cuenta' : 'Entrar'} onPress={enviar} cargando={cargando} />
          <Boton
            tipo="neutro"
            titulo={modo === 'registro' ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}
            onPress={() => setModo(modo === 'registro' ? 'entrar' : 'registro')}
          />
        </View>
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

function traducir(msg = '') {
  if (msg.includes('Invalid login')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('Email not confirmed')) return 'Primero confirma tu correo con el enlace que te enviamos.';
  if (msg.includes('already registered')) return 'Ese correo ya tiene cuenta. Prueba entrar.';
  return msg;
}
