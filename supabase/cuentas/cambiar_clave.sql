-- =====================================================================
-- Qué Hay · Restablecer la contraseña de alguien que la olvidó
-- Cambia NICK y NUEVA_CLAVE (mínimo 8 caracteres) y presiona Run.
-- Dale la clave nueva a la persona; puede seguir usándola.
-- =====================================================================
update auth.users
   set encrypted_password = extensions.crypt('NUEVA_CLAVE', extensions.gen_salt('bf')),
       updated_at = now()
 where email = lower('NICK') || '@usuarios.quehay.app'
returning email as cuenta_actualizada;
