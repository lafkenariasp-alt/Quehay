import { Platform, Alert, Share, Linking } from 'react-native';

// Ajustes solo para la versión web (navegador). En el teléfono este archivo no hace nada.
// - Alert: en el navegador React Native no muestra nada, así que usamos los cuadros del navegador.
// - Compartir: si el navegador no sabe compartir, abre WhatsApp con el texto.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (titulo, mensaje, botones) => {
    const texto = [titulo, mensaje].filter(Boolean).join('\n\n');
    const lista = botones && botones.length ? botones : [{ text: 'OK' }];
    setTimeout(() => {
      if (lista.length === 1) {
        window.alert(texto);
        lista[0].onPress?.();
        return;
      }
      const cancelar = lista.find((b) => b.style === 'cancel');
      const opciones = lista.filter((b) => b !== cancelar);
      if (opciones.length === 1) {
        if (window.confirm(`${texto}\n\n¿${opciones[0].text}?`)) opciones[0].onPress?.();
        else cancelar?.onPress?.();
        return;
      }
      // Varias opciones: se elige escribiendo el número
      const r = window.prompt(`${texto}\n\n${opciones.map((b, i) => `${i + 1}. ${b.text}`).join('\n')}\n\nEscribe el número:`);
      const elegido = opciones[Number(r) - 1];
      if (elegido) elegido.onPress?.(); else cancelar?.onPress?.();
    }, 0);
  };

  const original = Share.share.bind(Share);
  Share.share = async (contenido, opts) => {
    if (typeof navigator !== 'undefined' && navigator.share) return original(contenido, opts);
    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(contenido.message || '')}`);
    return { action: Share.sharedAction };
  };

  // Evita que el navegador haga zoom o "rebote" la página completa al deslizar
  try {
    const meta = document.querySelector('meta[name=viewport]');
    if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.backgroundColor = '#FBF7F0';
  } catch (e) { /* sin ajustes */ }
}
