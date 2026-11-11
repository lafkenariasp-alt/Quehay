import React, { useState } from 'react';
import { View, Text, TextInput, Alert, Pressable } from 'react-native';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C } from '../theme';
import { Pantalla, Encabezado, Boton, s } from '../ui';
import { Mascota, Globo, PaqueteBienvenida } from '../mascota';
import { registrar } from '../analitica';

// Crear cuenta o entrar. Se abre cuando un invitado intenta algo que requiere cuenta.
// motivo: lo que intentaba hacer ("Tu plato y tus 20 XP están listos: guárdalos")
export default function Acceso({ motivo }) {
  const { nav } = useApp();
  const [modo, setModo] = useState(motivo ? 'registro' : 'entrar'); // entrar | registro
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
        registrar('registro', { motivo: motivo || null }, data.user?.id || null);
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

  async function recuperar() {
    if (!correo.includes('@')) { Alert.alert('Escribe tu correo', 'Pon el correo de tu cuenta y vuelve a tocar "Olvidé mi contraseña".'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(correo.trim());
    Alert.alert(error ? 'No se pudo' : 'Revisa tu correo', error ? traducir(error.message) : 'Te enviamos un enlace para crear una contraseña nueva.');
  }

  return (
    <Pantalla>
      <Encabezado onVolver={nav.volver} titulo={modo === 'registro' ? 'Crea tu cuenta' : 'Entrar'} />

      {modo === 'registro' ? (
        <>
          <View style={[s.fila, { gap: 12, alignItems: 'flex-end' }]}>
            <Mascota tam={80} accesorio="delantal_bienvenida" />
            <Globo texto={motivo || '¡Te tengo un regalo! Crea tu cuenta para abrirlo.'} style={{ flex: 1 }} />
          </View>
          <PaqueteBienvenida />
        </>
      ) : (
        <View style={[s.fila, { gap: 12, alignItems: 'flex-end' }]}>
          <Mascota tam={80} />
          <Globo texto="¡Qué bueno verte de nuevo!" style={{ flex: 1 }} />
        </View>
      )}

      <View style={{ gap: 12 }}>
        {modo === 'registro' ? (
          <TextInput style={s.input} placeholder="Tu nombre" placeholderTextColor={C.suave} value={nombre} onChangeText={setNombre} />
        ) : null}
        <TextInput style={s.input} placeholder="Correo" placeholderTextColor={C.suave} autoCapitalize="none"
          keyboardType="email-address" autoComplete="email" value={correo} onChangeText={setCorreo} />
        <TextInput style={s.input} placeholder="Contraseña (mínimo 6)" placeholderTextColor={C.suave} secureTextEntry value={clave} onChangeText={setClave} />
        <Boton titulo={modo === 'registro' ? 'Crear cuenta y abrir regalo' : 'Entrar'} icono={modo === 'registro' ? 'gift-outline' : 'log-in-outline'} onPress={enviar} cargando={cargando} />
        {modo === 'entrar' ? (
          <Pressable onPress={recuperar} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.suave }}>Olvidé mi contraseña</Text>
          </Pressable>
        ) : null}
        <Boton tipo="neutro" titulo={modo === 'registro' ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}
          onPress={() => setModo(modo === 'registro' ? 'entrar' : 'registro')} />
        <Pressable onPress={nav.volver} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.suave }}>Ahora no, sigo mirando recetas</Text>
        </Pressable>
      </View>
    </Pantalla>
  );
}

function traducir(msg = '') {
  if (msg.includes('Invalid login')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('Email not confirmed')) return 'Primero confirma tu correo con el enlace que te enviamos.';
  if (msg.includes('already registered')) return 'Ese correo ya tiene cuenta. Prueba entrar.';
  return msg;
}
