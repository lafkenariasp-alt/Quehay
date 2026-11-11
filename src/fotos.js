import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const ANCHO_MAX = 1080; // las fotos se reducen a este ancho antes de subirlas

const opciones = (cuadrada) => ({ mediaTypes: ['images'], allowsEditing: true, aspect: cuadrada ? [1, 1] : [4, 3], quality: 1 });

// Reduce tamaño y peso (una foto de cámara pasa de ~4 MB a ~200 KB)
async function reducir(asset) {
  const ancho = Math.min(ANCHO_MAX, asset.width || ANCHO_MAX);
  try {
    if (ImageManipulator.ImageManipulator?.manipulate) {
      const ctx = ImageManipulator.ImageManipulator.manipulate(asset.uri);
      ctx.resize({ width: ancho });
      const img = await ctx.renderAsync();
      const r = await img.saveAsync({ compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      return { uri: r.uri, base64: r.base64 };
    }
    const r = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: ancho } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    return { uri: r.uri, base64: r.base64 };
  } catch (e) {
    Alert.alert('No se pudo preparar la foto', 'Intenta tomarla de nuevo.');
    return null;
  }
}

export async function desdeCamara(cuadrada = false) {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert('Sin permiso', 'Activa el acceso a la cámara en Ajustes para tomar la foto.');
    return null;
  }
  const r = await ImagePicker.launchCameraAsync(opciones(cuadrada));
  return r.canceled ? null : reducir(r.assets[0]);
}

export async function desdeGaleria(cuadrada = false) {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert('Sin permiso', 'Activa el acceso a tus fotos en Ajustes para elegir una.');
    return null;
  }
  const r = await ImagePicker.launchImageLibraryAsync(opciones(cuadrada));
  return r.canceled ? null : reducir(r.assets[0]);
}

// Cámara o galería (para la foto de una receta publicada o del perfil)
export function elegirFoto() {
  return new Promise((resolver) => {
    Alert.alert('Agregar foto', '', [
      { text: 'Tomar foto', onPress: () => desdeCamara().then(resolver) },
      { text: 'Elegir de la galería', onPress: () => desdeGaleria().then(resolver) },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(null) },
    ], { cancelable: true, onDismiss: () => resolver(null) });
  });
}

// "Lo cociné": SOLO cámara en el momento, con huella digital para que la misma foto no se use dos veces
export async function fotoDelPlato() {
  const foto = await desdeCamara(false);
  if (!foto) return null;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, foto.base64);
  return { ...foto, hash };
}

// Sube la foto a la carpeta del usuario y devuelve su dirección pública
export async function subirFoto(uid, foto, tipo) {
  if (!foto?.base64) throw new Error('La foto no se pudo leer. Intenta con otra.');
  const ruta = `${uid}/${tipo}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('fotos').upload(ruta, decode(foto.base64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('fotos').getPublicUrl(ruta).data.publicUrl;
}
