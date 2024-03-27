import { webcrypto } from 'crypto';

// Utility functions for encoding and decoding data
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Converts an ArrayBuffer to a Base64 string
  return Buffer.from(buffer).toString("base64");
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Converts a Base64 string to an ArrayBuffer
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// RSA key operations
export type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};

export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  // Generates a pair of RSA keys for encryption and decryption
  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true, // Specify that the keys can be exported
    ["encrypt", "decrypt"]
  );

  return { publicKey, privateKey };
}

export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  // Exports a public key to a Base64 string
  const exportedKey = await webcrypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exportedKey);
}

export async function exportPrvKey(key: webcrypto.CryptoKey | null): Promise<string | null> {
  // Exports a private key to a Base64 string
  if (!key) return null;
  const exportedKey = await webcrypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exportedKey);
}

export async function importPubKey(strKey: string): Promise<webcrypto.CryptoKey> {
  // Imports a public key from a Base64 string
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "spki",
    keyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true, // Specify that the key can be used for encryption
    ["encrypt"]
  );
}

export async function importPrvKey(strKey: string): Promise<webcrypto.CryptoKey> {
  // Imports a private key from a Base64 string
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true, // Specify that the key can be used for decryption
    ["decrypt"]
  );
}

// RSA Encryption/Decryption
export async function rsaEncrypt(b64Data: string, strPublicKey: string): Promise<string> {
  // Encrypts data using an RSA public key
  const publicKey = await importPubKey(strPublicKey);
  const dataBuffer = base64ToArrayBuffer(b64Data);
  const encrypted = await webcrypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    dataBuffer
  );
  return arrayBufferToBase64(encrypted);
}

export async function rsaDecrypt(data: string, privateKey: webcrypto.CryptoKey): Promise<string> {
  // Decrypts data using an RSA private key
  const dataBuffer = base64ToArrayBuffer(data);
  const decrypted = await webcrypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    dataBuffer
  );
  return arrayBufferToBase64(decrypted);
}

// Symmetric key operations
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  // Generates a random symmetric key for AES encryption
  return await webcrypto.subtle.generateKey(
    {
      name: "AES-CBC",
      length: 256, // Specifies the length of the key in bits
    },
    true, // Specify that the key can be exported
    ["encrypt", "decrypt"]
  );
}

export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  // Exports a symmetric key to a Base64 string
  const exportedKey = await webcrypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exportedKey);
}

export async function importSymKey(strKey: string): Promise<webcrypto.CryptoKey> {
  // Imports a symmetric key from a Base64 string
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      name: "AES-CBC",
    },
    true, // Specify that the key can be used for both encryption and decryption
    ["encrypt", "decrypt"]
  );
}

// Symmetric Encryption/Decryption
export async function symEncrypt(key: webcrypto.CryptoKey, data: string): Promise<string> {
  // Encrypts data using a symmetric key
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const iv = new Uint8Array(16); // Initialization vector for AES-CBC
  const encrypted = await webcrypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv: iv,
    },
    key,
    encodedData
  );

  return arrayBufferToBase64(encrypted);
}

export async function symDecrypt(
  strKey: string,
  encryptedDataWithIv: string
): Promise<string> {
  // Decrypts data using a symmetric key
  const key = await importSymKey(strKey);
  const encryptedDataWithIvBuffer = base64ToArrayBuffer(encryptedDataWithIv);
  const iv = new Uint8Array(16); // Assumes the IV is prepended to the encrypted data
  const decrypted = await webcrypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: iv,
    },
    key,
    encryptedDataWithIvBuffer
  );

  return new TextDecoder().decode(decrypted);
}

