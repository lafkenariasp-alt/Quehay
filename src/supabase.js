import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Datos públicos del proyecto (la clave publishable está hecha para ir en la app;
// la seguridad la dan las reglas RLS de la base de datos).
const SUPABASE_URL = 'https://qkqwiyioigwznmiqgcma.supabase.co';
const SUPABASE_KEY = 'sb_publishable_L6cwZ1GzkYq_Zq25g8nBGw_y7of4igP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
