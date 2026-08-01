import { load, Store } from '@tauri-apps/plugin-store';

const SETTINGS_FILE = "settings.json";
const LAST_OPENED_FILE_KEY = "lastOpenedFile";

let storePromise: Promise<Store> | null = null;
function getStore(): Promise<Store> {
  if (!storePromise) { storePromise = load(SETTINGS_FILE, { autoSave: true }); }
  return storePromise;
}

export async function getLastOpenedFile(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>(LAST_OPENED_FILE_KEY)) ?? null;
}

export async function setLastOpenedFile(filePath: string): Promise<void> {
  const store = await getStore();
  await store.set(LAST_OPENED_FILE_KEY, filePath);
}
