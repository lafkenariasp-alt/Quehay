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
// El iPhone necesita los sonidos como archivo: se descargan una vez a la memoria del teléfono y se reproducen desde ahí.
let FS = null;
try { FS = require('expo-file-system/legacy'); } catch (e) { try { FS = require('expo-file-system'); } catch (e2) { FS = null; } }
const ARCHIVOS = {};
async function archivoLocal(n) {
  try {
    if (!FS?.downloadAsync || !FS?.cacheDirectory) return null;
    const destino = `${FS.cacheDirectory}quehay_sonido_${n}.wav`;
    const info = await FS.getInfoAsync(destino);
    if (info?.exists && info.size > 1000) return destino;
    const r = await FS.downloadAsync(`${BASE}/${n}.wav`, destino);
    return r?.status === 200 ? r.uri : null;
  } catch (e) { diag.error = `descarga ${n}: ${e?.message || e}`; return null; }
}
const fuente = (n) => (ARCHIVOS[n] ? { uri: ARCHIVOS[n] } : { uri: `${BASE}/${n}.wav` });

// Diagnóstico visible en Perfil → Sonido y vibración ("Probar sonido")
const diag = { libreria: Audio ? 'expo-audio' : AV ? 'expo-av' : 'ninguna', vibracion: Haptics ? 'expo-haptics' : 'básica', archivos: FS ? 'sí' : 'no', error: null };
export const diagnosticoSonido = () => {
  const cargados = Object.values(players).filter((p) => p && p.isLoaded).length;
  return { ...diag, forma: diag.forma || (forma === 'normal' ? 'normal' : 'ninguna'), sonando: diag.sonando || 0, cargados, descargados: Object.keys(ARCHIVOS).length, total: SONIDOS.length, prefs: { ...prefs } };
};
const VOLUMEN = { tap: 0.5, quitar: 0.5, chefpu: 0.6, blip: 0.5, paso: 0.5, xp: 0.8, logro: 0.8, nivel: 0.9, fanfarria: 0.9, error: 0.6 };
const CLAVE = 'ajustes_sonido_v1';
// Prioridad: un sonido más importante no se tapa con uno menor que llegue justo después
const PRIORIDAD = { tap: 1, quitar: 1, paso: 1, chefpu: 2, blip: 2, error: 3, xp: 4, logro: 5, nivel: 6, fanfarria: 6 };

let prefs = { sonido: true, vibracion: true, enSilencio: false };
const oyentes = new Set();
const players = {};
let preparado = false;
let ultimo = { t: 0, prioridad: 0 };

async function modoAudio() {
  try {
    if (Audio?.setAudioModeAsync) {
      // enSilencio: suena aunque el iPhone tenga el interruptor de silencio; sin cortar la música
      await Audio.setAudioModeAsync({ playsInSilentMode: !!prefs.enSilencio, interruptionMode: 'mixWithOthers', interruptionModeAndroid: 'duckOthers', shouldPlayInBackground: false });
    } else if (AV?.Audio?.setAudioModeAsync) {
      await AV.Audio.setAudioModeAsync({ playsInSilentModeIOS: !!prefs.enSilencio, staysActiveInBackground: false });
    }
  } catch (e) { diag.error = `modo audio: ${e?.message || e}`; }
}

// Expo Go puede traer una versión más nueva del reproductor que la de Snack (pide 5 datos y Snack manda 3).
// Si pasa eso, se crea directo con la forma nueva; la que funcione queda recordada.
let forma = null;
const FORMAS = [
  (Nativo, src) => new Nativo(src, 500, false, 0, false),
  (Nativo, src) => new Nativo(src, 500, false, false, false),
  (Nativo, src) => new Nativo(src, 500, false, 0, null),
  (Nativo, src) => new Nativo(src, 500, false, null, null),
];
function crearPlayer(n) {
  const src = fuente(n);
  let p = null;
  if (forma === null) {
    try { p = Audio.createAudioPlayer(src); forma = 'normal'; } catch (e) { diag.error = `crear ${n}: ${e?.message || e}`; }
  } else if (forma === 'normal') {
    try { p = Audio.createAudioPlayer(src); } catch (e) { diag.error = `crear ${n}: ${e?.message || e}`; }
  }
  const Nativo = Audio?.AudioModule?.AudioPlayer;
  if (!p && Nativo) {
    const lista = typeof forma === 'number' ? [forma] : FORMAS.map((_, i) => i);
    for (const i of lista) {
      try { p = FORMAS[i](Nativo, src); forma = i; diag.forma = `directa ${i + 1}`; diag.error = null; break; } catch (e) { diag.error = `crear ${n} (forma ${i + 1}): ${e?.message || e}`; }
    }
  }
  if (!p) return null;
  try { p.volume = VOLUMEN[n]; } catch (e) { /* volumen por defecto */ }
  players[n] = p;
  return p;
}

export async function prepararSonidos() {
  if (preparado) return;
  preparado = true;
  try { const v = await AsyncStorage.getItem(CLAVE); if (v) prefs = { ...prefs, ...JSON.parse(v) }; } catch (e) { /* valores por defecto */ }
  oyentes.forEach((f) => f(prefs));
  await modoAudio();
  // primero el archivo en el teléfono; si no se pudo, desde internet
  await Promise.all(SONIDOS.map(async (n) => { const f = await archivoLocal(n); if (f) ARCHIVOS[n] = f; }));
  if (Audio?.createAudioPlayer) SONIDOS.forEach(crearPlayer);
  diag.preparado = true;
}

// Si un sonido aún no termina de descargarse, suena apenas esté listo (máx. 2 s; después ya no tiene sentido)
function cuandoCargue(p) {
  const desde = Date.now();
  let sub = null;
  try {
    sub = p.addListener('playbackStatusUpdate', (s) => {
      if (s?.isLoaded) { sub?.remove(); if (Date.now() - desde < 2000) { try { p.play(); } catch (e) { /* silencio */ } } }
    });
  } catch (e) { /* sin aviso de carga */ }
  setTimeout(() => sub?.remove(), 2500);
}

export function sonar(nombre) {
  if (!prefs.sonido) return;
  // nunca dos a la vez: uno menor justo después de uno mayor no suena
  const ahora = Date.now(), pr = PRIORIDAD[nombre] || 1;
  if (ahora - ultimo.t < 600 && pr < ultimo.prioridad) return;
  ultimo = { t: ahora, prioridad: pr };
  diag.sonando = (diag.sonando || 0) + 1;
  try {
    if (Audio?.createAudioPlayer) {
      const p = players[nombre] || crearPlayer(nombre);
      if (!p) return;
      if (p.isLoaded === false) { cuandoCargue(p); return; }
      const r = p.seekTo(0);
      if (r && r.then) r.then(() => p.play(), () => p.play()); else p.play();
      return;
    }
    if (AV?.Audio?.Sound) {
      AV.Audio.Sound.createAsync(fuente(nombre), { shouldPlay: true, volume: VOLUMEN[nombre] || 0.6 })
        .then(({ sound }) => sound.setOnPlaybackStatusUpdate((s) => { if (s.didJustFinish) sound.unloadAsync(); }))
        .catch((e) => { diag.error = `expo-av ${nombre}: ${e?.message || e}`; });
    }
  } catch (e) { diag.error = `sonar ${nombre}: ${e?.message || e}`; }
}

// tipo: seleccion (toques), suave, medio, exito, aviso, error
export function vibrar(tipo = 'suave') {
  if (!prefs.vibracion) return;
  diag.vibraciones = (diag.vibraciones || 0) + 1;
  try {
    if (Haptics) {
      if (tipo === 'seleccion') return void Haptics.selectionAsync().catch(() => {});
      if (tipo === 'exito' || tipo === 'aviso' || tipo === 'error') {
        const t = { exito: 'Success', aviso: 'Warning', error: 'Error' }[tipo];
        return void Haptics.notificationAsync(Haptics.NotificationFeedbackType[t]).catch((e) => { diag.error = `vibrar: ${e?.message || e}`; });
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
  seguir: ['tap', 'suave'],
  listas: ['logro', 'exito'],
  temporizador: ['fanfarria', 'exito'],
  guardar: ['tap', 'medio'],
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
    if (clave === 'enSilencio') modoAudio().then(() => { if (valor) efecto('xp'); });
    else if (valor) efecto(clave === 'sonido' ? 'xp' : 'boton');
  };
  return { ...p, cambiar, disponible: !!(Audio || AV), vibraDisponible: !!Haptics };
}
