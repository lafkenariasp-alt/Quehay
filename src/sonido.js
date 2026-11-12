import { useEffect, useState } from 'react';
import { Vibration, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sonidos y vibración de Qué Hay. Las librerías son opcionales: si Snack o el teléfono
// no las tienen, la app sigue funcionando en silencio.
let Audio = null;
try { Audio = require('expo-audio'); } catch (e) { Audio = null; }
let AV = null;
if (!Audio) { try { AV = require('expo-av'); } catch (e) { AV = null; } }
let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) { Haptics = null; }

const BASE = 'https://raw.githubusercontent.com/lafkenariasp-alt/Quehay/main/assets/sonidos';
const SONIDOS = ['tap', 'quitar', 'chefpu', 'blip', 'paso', 'xp', 'logro', 'nivel', 'fanfarria', 'error'];
const VOLUMEN = { tap: 0.5, quitar: 0.5, chefpu: 0.6, blip: 0.5, paso: 0.5, xp: 0.8, logro: 0.8, nivel: 0.9, fanfarria: 0.9, error: 0.6 };
const CLAVE = 'ajustes_sonido_v1';

let prefs = { sonido: true, vibracion: true };
const oyentes = new Set();
const players = {};
let preparado = false;

export async function prepararSonidos() {
  if (preparado) return;
  preparado = true;
  try { const v = await AsyncStorage.getItem(CLAVE); if (v) prefs = { ...prefs, ...JSON.parse(v) }; } catch (e) { /* valores por defecto */ }
  oyentes.forEach((f) => f(prefs));
  try {
    if (Audio?.setAudioModeAsync) {
      // respeta el modo silencio del iPhone y no corta la música que esté sonando
      await Audio.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', interruptionModeAndroid: 'duckOthers' });
    } else if (AV?.Audio?.setAudioModeAsync) {
      await AV.Audio.setAudioModeAsync({ playsInSilentModeIOS: false, staysActiveInBackground: false });
    }
  } catch (e) { /* sin modo de audio */ }
  if (Audio?.createAudioPlayer) {
    SONIDOS.forEach((n) => {
      try { const p = Audio.createAudioPlayer({ uri: `${BASE}/${n}.wav` }); p.volume = VOLUMEN[n]; players[n] = p; } catch (e) { /* sin este sonido */ }
    });
  }
}

export function sonar(nombre) {
  if (!prefs.sonido) return;
  try {
    const p = players[nombre];
    if (p) {
      p.seekTo(0);
      p.play();
      return;
    }
    if (AV?.Audio?.Sound) {
      AV.Audio.Sound.createAsync({ uri: `${BASE}/${nombre}.wav` }, { shouldPlay: true, volume: VOLUMEN[nombre] || 0.6 })
        .then(({ sound }) => sound.setOnPlaybackStatusUpdate((s) => { if (s.didJustFinish) sound.unloadAsync(); }))
        .catch(() => {});
    }
  } catch (e) { /* silencio */ }
}

// tipo: seleccion (toques), suave, medio, exito, aviso, error
export function vibrar(tipo = 'suave') {
  if (!prefs.vibracion) return;
  try {
    if (Haptics) {
      if (tipo === 'seleccion') return void Haptics.selectionAsync().catch(() => {});
      if (tipo === 'exito' || tipo === 'aviso' || tipo === 'error') {
        const t = { exito: 'Success', aviso: 'Warning', error: 'Error' }[tipo];
        return void Haptics.notificationAsync(Haptics.NotificationFeedbackType[t]).catch(() => {});
      }
      const f = { suave: 'Light', medio: 'Medium', fuerte: 'Heavy' }[tipo] || 'Light';
      return void Haptics.impactAsync(Haptics.ImpactFeedbackStyle[f]).catch(() => {});
    }
    // Sin la librería solo vibramos en los momentos grandes (en iPhone la vibración simple es larga)
    if (tipo === 'exito' || tipo === 'error') Vibration.vibrate(Platform.OS === 'android' ? 60 : 1);
  } catch (e) { /* sin vibración */ }
}

// Momentos de la app: cada uno con su sonido y su vibración
const MOMENTOS = {
  marcar: ['tap', 'seleccion'],
  desmarcar: ['quitar', 'seleccion'],
  boton: ['tap', 'suave'],
  chefpu: ['chefpu', 'suave'],
  tutorial: ['blip', 'seleccion'],
  paso: ['paso', 'seleccion'],
  me_gusta: ['tap', 'medio'],
  seguir: ['xp', 'suave'],
  xp: ['xp', 'exito'],
  logro: ['logro', 'exito'],
  nivel: ['nivel', 'exito'],
  regalo: ['fanfarria', 'exito'],
  error: ['error', 'error'],
};
export function efecto(momento) {
  const m = MOMENTOS[momento];
  if (!m) return;
  sonar(m[0]);
  vibrar(m[1]);
}

export function useAjustesSonido() {
  const [p, setP] = useState(prefs);
  useEffect(() => { oyentes.add(setP); return () => oyentes.delete(setP); }, []);
  const cambiar = (clave, valor) => {
    prefs = { ...prefs, [clave]: valor };
    AsyncStorage.setItem(CLAVE, JSON.stringify(prefs)).catch(() => {});
    oyentes.forEach((f) => f(prefs));
    if (valor) efecto(clave === 'sonido' ? 'boton' : 'xp');
  };
  return { ...p, cambiar, disponible: !!(Audio || AV), vibraDisponible: !!Haptics };
}
