// utils/saveFile.ts
export async function saveFile(blob: Blob, suggestedName: string) {
  // Detect Tauri at runtime
  const isTauri = "__TAURI_IPC__" in (window as any);
  if (!isTauri) {
    // fallback for web
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = suggestedName; a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');

  const path = await save({ defaultPath: suggestedName }); // native Save As…
  if (!path) return;

  const buf = new Uint8Array(await blob.arrayBuffer());
  await writeFile(path, buf); // writes to the chosen path
}
