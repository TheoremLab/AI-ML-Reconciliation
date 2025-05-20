// Attempt at using indexedDB for storing uploaded files persistently
import { openDB } from 'idb';

const DB_NAME = 'ReconciliationFiles';
const STORE_NAME = 'uploaded_files';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

export async function saveFile(fileData) {
  const db = await initDB();
  await db.add(STORE_NAME, fileData);
}

export async function getAllFiles() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function clearFiles() {
  const db = await initDB();
  await db.clear(STORE_NAME);
}
