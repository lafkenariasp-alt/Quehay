import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Registro de eventos de uso para el futuro panel de métricas (CRM).
// Nunca bloquea la app: si falla, se ignora.
let dispositivo = null;

export async function idDispositivo() {
  if (dispositivo) return dispositivo;
  try {
    dispositivo = await AsyncStorage.getItem('dispositivo_id');
    if (!dispositivo) {
      dispositivo = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem('dispositivo_id', dispositivo);
    }
  } catch (e) { dispositivo = 'desconocido'; }
  return dispositivo;
}

export async function registrar(nombre, datos = {}, uid = null) {
  try {
    const d = await idDispositivo();
    await supabase.from('eventos_app').insert({ nombre, datos, usuario_id: uid, dispositivo: d });
  } catch (e) { /* las métricas nunca interrumpen al usuario */ }
}

// Ingredientes elegidos sin cuenta: se guardan para pasarlos a la nevera al registrarse
const CLAVE_INGREDIENTES = 'ingredientes_busqueda';

export async function guardarIngredientesInvitado(lista) {
  try { await AsyncStorage.setItem(CLAVE_INGREDIENTES, JSON.stringify(lista)); } catch (e) { /* sin acción */ }
}

export async function leerIngredientesInvitado() {
  try { return JSON.parse((await AsyncStorage.getItem(CLAVE_INGREDIENTES)) || '[]'); } catch (e) { return []; }
}

export async function borrarIngredientesInvitado() {
  try { await AsyncStorage.removeItem(CLAVE_INGREDIENTES); } catch (e) { /* sin acción */ }
}
