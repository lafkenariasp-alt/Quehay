import { Alert } from 'react-native';
import { supabase } from './supabase';
import { registrar } from './analitica';

const MOTIVOS = ['Spam o publicidad', 'Contenido inadecuado u ofensivo', 'La foto no es real o no es comida', 'Otro'];

// Reportar una receta, un "así me quedó" o un perfil.
// tipo: 'receta' | 'asi_me_quedo' | 'perfil'
export function reportar({ uid, tipo, objetoId, pedirCuenta }) {
  if (!uid) { pedirCuenta('Crea tu cuenta para reportar contenido'); return; }
  Alert.alert('Reportar', '¿Qué problema tiene?', [
    ...MOTIVOS.map((motivo) => ({
      text: motivo,
      onPress: async () => {
        const { error } = await supabase.from('reportes').insert({ usuario_id: uid, tipo, objeto_id: String(objetoId), motivo });
        if (error && error.code !== '23505') { Alert.alert('No se pudo enviar', error.message); return; }
        registrar('reporte', { tipo, motivo }, uid);
        Alert.alert('Gracias por avisar', error ? 'Ya habías reportado esto. Lo estamos revisando.' : 'Lo revisaremos. Si varias personas lo reportan, se oculta mientras tanto.');
      },
    })),
    { text: 'Cancelar', style: 'cancel' },
  ]);
}
