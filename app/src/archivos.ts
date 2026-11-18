/**
 * Guardar y compartir archivos (CSV del historial, SVG de la sábana 3D).
 * En Android se escribe en la caché de la app y se abre el menú de compartir (Drive, correo, WhatsApp, Archivos…).
 * En el navegador (vista previa web) se descarga.
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function compartirArchivo(nombre: string, contenido: string, mime: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([contenido], { type: mime }));
      const a = document.createElement('a');
      a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { ok: true };
    }
    const archivo = new File(Paths.cache, nombre);
    archivo.create({ overwrite: true });
    archivo.write(contenido);
    if (!(await Sharing.isAvailableAsync())) return { ok: false, error: 'Este teléfono no permite compartir archivos.' };
    await Sharing.shareAsync(archivo.uri, { mimeType: mime, dialogTitle: nombre, UTI: mime === 'text/csv' ? 'public.comma-separated-values-text' : 'public.svg-image' });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: `No se pudo guardar el archivo: ${e?.message ?? e}` };
  }
}
