// Copiar texto al portapapeles (token de la Pico W)
import * as ExpoClipboard from 'expo-clipboard';

export async function copiar(texto: string): Promise<boolean> {
  try { return await ExpoClipboard.setStringAsync(texto); } catch { return false; }
}
