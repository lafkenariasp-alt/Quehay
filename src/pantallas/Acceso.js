import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert, Pressable, Switch } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../supabase';
import { useApp } from '../contexto';
import { C } from '../theme';
import { Pantalla, Encabezado, Boton, s } from '../ui';
import { Mascota, Globo, PaqueteBienvenida } from '../mascota';
import { registrar } from '../analitica';

// Cuentas con nick: Supabase pide un correo, así que el nick se convierte en un correo interno
// (nick@usuarios.quehay.app). No se envía ningún correo: "Confirm email" debe estar apagado.
export const DOMINIO_NICK = 'usuarios.quehay.app';
const MIN_CLAVE = 8;
const CLAVE_RECORDAR = 'acceso_recordado_v1';

const limpiarNick = (t) => t.trim().toLowerCase();
const nickValido = (n) => /^[a-z0-9_.]{3,24}$/.test(n);
// Solo nick: el correo interno se arma por dentro y la persona nunca lo ve
const aCorreo = (t) => `${limpiarNick(t)}@${DOMINIO_NICK}`;

// Guardado cifrado en el llavero del teléfono. En web no existe: se ignora sin romper.
async function leerRecordado() {
  try { const v = await SecureStore.getItemAsync(CLAVE_RECORDAR); return v ? JSON.parse(v) : null; } catch { return null; }
}
async function guardarRecordado(datos) {
  try {
    if (datos) await SecureStore.setItemAsync(CLAVE_RECORDAR, JSON.stringify(datos));
    else await SecureStore.deleteItemAsync(CLAVE_RECORDAR);
  } catch { /* sin llavero disponible */ }
}

// Crear cuenta o entrar. Se abre cuando un invitado intenta algo que requiere cuenta.
// motivo: lo que intentaba hacer ("Tu plato y tus 20 XP están listos: guárdalos")
export default function Acceso({ motivo }) {
  const { nav } = useApp();
  const [modo, setModo] = useState(motivo ? 'registro' : 'entrar'); // entrar | registro
  const [nick, setNick] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    leerRecordado().then((d) => {
      if (d) { setNick(d.nick || ''); setClave(d.clave || ''); setRecordar(true); }
    });
  }, []);

  async function enviar() {
    const texto = nick.trim();
    if (modo === 'registro') {
      const n = limpiarNick(texto);
      if (!nickValido(n)) {
        Alert.alert('Revisa tu nick', 'Usa entre 3 y 24 caracteres: letras sin tilde, números, punto o guion bajo. Sin espacios.');
        return;
      }
    } else if (!nickValido(limpiarNick(texto))) {
      Alert.alert('Revisa tu nick', 'Escribe el nick con el que creaste tu cuenta.');
      return;
    }
    if (clave.length < MIN_CLAVE) {
      Alert.alert('Contraseña muy corta', `Usa al menos ${MIN_CLAVE} caracteres.`);
      return;
    }
    setCargando(true);
    try {
      if (modo === 'registro') {
        const n = limpiarNick(texto);
        const { data: libre, error: e1 } = await supabase.rpc('usuario_disponible', { p_usuario: n });
        if (e1) throw e1;
        if (!libre) { Alert.alert('Ese nick ya existe', 'Prueba con otro, por ejemplo agregando un número.'); return; }
        const { data, error } = await supabase.auth.signUp({
          email: aCorreo(n),
          password: clave,
          options: { data: { nombre: texto, usuario: n } },
        });
        if (error) throw error;
        registrar('registro', { motivo: motivo || null }, data.user?.id || null);
        if (!data.session) {
          Alert.alert('Cuenta creada', 'Ahora toca "Entrar" con tu nick y contraseña.');
          setModo('entrar');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: aCorreo(texto), password: clave });
        if (error) throw error;
      }
      await guardarRecordado(recordar ? { nick: texto, clave } : null);
    } catch (e) {
      Alert.alert('No se pudo', traducir(e.message));
    } finally {
      setCargando(false);
    }
  }

  function recuperar() {
    Alert.alert('¿Olvidaste tu contraseña?', 'Pídele a quien te invitó a la beta que te la restablezca. Con tu nick lo hace en un minuto.');
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
        <TextInput style={s.input} placeholder={modo === 'registro' ? 'Elige tu nick (ej. chef_lafken)' : 'Tu nick'}
          placeholderTextColor={C.suave} autoCapitalize="none" autoCorrect={false}
          textContentType="username" autoComplete="username" value={nick} onChangeText={setNick} />
        <View style={[s.fila, { gap: 8 }]}>
          <TextInput style={[s.input, { flex: 1 }]} placeholder={`Contraseña (mínimo ${MIN_CLAVE})`} placeholderTextColor={C.suave}
            secureTextEntry={!verClave} autoCapitalize="none" autoCorrect={false}
            textContentType={modo === 'registro' ? 'newPassword' : 'password'}
            autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
            passwordRules={`minlength: ${MIN_CLAVE};`} value={clave} onChangeText={setClave} onSubmitEditing={enviar} />
          <Pressable onPress={() => setVerClave(!verClave)} style={{ minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.suave }}>{verClave ? 'Ocultar' : 'Ver'}</Text>
          </Pressable>
        </View>
        <View style={[s.fila, { justifyContent: 'space-between' }]}>
          <Text style={{ fontSize: 15, color: C.texto, flex: 1 }}>Recordar mi nick y contraseña en este teléfono</Text>
          <Switch value={recordar} onValueChange={(v) => { setRecordar(v); if (!v) guardarRecordado(null); }}
            trackColor={{ true: C.verde, false: '#CBBBA5' }} />
        </View>
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
  if (msg.includes('Invalid login')) return 'Nick o contraseña incorrectos.';
  if (msg.includes('Email not confirmed')) return 'Tu cuenta aún no está activada. Avísale a quien te invitó.';
  if (msg.includes('already registered')) return 'Ese nick ya existe. Prueba con otro o toca "Ya tengo cuenta".';
  if (msg.includes('Password should be')) return 'La contraseña es muy corta o muy simple.';
  if (msg.includes('rate limit')) return 'Demasiados intentos seguidos. Espera un minuto y prueba de nuevo.';
  if (msg.includes('Database error')) return 'No se pudo crear la cuenta. Prueba con otro nick.';
  return msg;
}
