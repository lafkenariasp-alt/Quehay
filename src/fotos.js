import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const opciones = (cuadrada) => ({ mediaTypes: ['images'], allowsEditing: true, aspect: cuadrada ? [1, 1] : [4, 3], quality: 0.6, base64: true });

export async function desdeCamara(cuadrada = false) {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert('Sin permiso', 'Activa el acceso a la cámara en Ajustes para tomar la foto.');
    return null;
  }
  const r = await ImagePicker.launchCameraAsync(opciones(cuadrada));
  return r.canceled ? null : r.assets[0];
}

export async function desdeGaleria(cuadrada = false) {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert('Sin permiso', 'Activa el acceso a tus fotos en Ajustes para elegir una.');
    return null;
  }
  const r = await ImagePicker.launchImageLibraryAsync(opciones(cuadrada));
  return r.canceled ? null : r.assets[0];
}

// Pregunta cámara o galería y devuelve la foto elegida (o null)
export function elegirFoto() {
  return new Promise((resolver) => {
    Alert.alert('Agregar foto', '', [
      { text: 'Tomar foto', onPress: () => desdeCamara().then(resolver) },
      { text: 'Elegir de la galería', onPress: () => desdeGaleria().then(resolver) },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(null) },
    ], { cancelable: true, onDismiss: () => resolver(null) });
  });
}

// Sube la foto a la carpeta del usuario y devuelve su dirección pública
export async function subirFoto(uid, foto, tipo) {
  if (!foto?.base64) throw new Error('La foto no se pudo leer. Intenta con otra.');
  const ruta = `${uid}/${tipo}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('fotos').upload(ruta, decode(foto.base64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('fotos').getPublicUrl(ruta).data.publicUrl;
}
