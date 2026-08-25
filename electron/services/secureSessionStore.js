'use strict';

const fs = require('fs');
const path = require('path');

function createSecureSessionStore({ safeStorage, storagePath, fileSystem = fs } = {}) {
  if (!storagePath) throw new Error('Secure session storage path is required.');
  const memory = new Map();

  function encryptionAvailable() {
    try {
      return Boolean(safeStorage?.isEncryptionAvailable?.());
    } catch {
      return false;
    }
  }

  function readContainer() {
    if (!encryptionAvailable() || !fileSystem.existsSync(storagePath)) return { version: 1, items: {} };
    try {
      const parsed = JSON.parse(fileSystem.readFileSync(storagePath, 'utf8'));
      return parsed?.version === 1 && parsed.items && typeof parsed.items === 'object'
        ? parsed
        : { version: 1, items: {} };
    } catch {
      return { version: 1, items: {} };
    }
  }

  function writeContainer(container) {
    fileSystem.mkdirSync(path.dirname(storagePath), { recursive: true });
    const temporaryPath = `${storagePath}.tmp`;
    fileSystem.writeFileSync(temporaryPath, JSON.stringify(container), { encoding: 'utf8', mode: 0o600 });
    fileSystem.renameSync(temporaryPath, storagePath);
  }

  async function setItem(key, value) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) throw new Error('Secure session storage key is required.');
    const text = String(value ?? '');
    memory.set(normalizedKey, text);
    if (!encryptionAvailable()) return;
    const container = readContainer();
    container.items[normalizedKey] = safeStorage.encryptString(text).toString('base64');
    writeContainer(container);
  }

  async function getItem(key) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return null;
    if (!encryptionAvailable()) return memory.get(normalizedKey) ?? null;
    const encrypted = readContainer().items[normalizedKey];
    if (!encrypted) return null;
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    } catch {
      return null;
    }
  }

  async function removeItem(key) {
    const normalizedKey = String(key || '').trim();
    memory.delete(normalizedKey);
    if (!encryptionAvailable()) return;
    const container = readContainer();
    if (!Object.prototype.hasOwnProperty.call(container.items, normalizedKey)) return;
    delete container.items[normalizedKey];
    writeContainer(container);
  }

  async function clear() {
    memory.clear();
    if (fileSystem.existsSync(storagePath)) fileSystem.rmSync(storagePath, { force: true });
  }

  function getStatus() {
    return {
      persistence: encryptionAvailable() ? 'OS_ENCRYPTED' : 'MEMORY_ONLY',
      encryptionAvailable: encryptionAvailable(),
      rawTokenPersistence: 'BLOCKED'
    };
  }

  return { setItem, getItem, removeItem, clear, getStatus };
}

module.exports = { createSecureSessionStore };
