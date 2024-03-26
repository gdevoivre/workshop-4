import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  publicEncrypt,
  privateDecrypt,
  generateKeyPairSync,
} from 'crypto';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64');
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const buff = Buffer.from(base64, 'base64');
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

function simulateRsaCryptoKey(key: string, type: 'public' | 'private') {
  return {
    keyMaterial: key,
    algorithm: { name: 'RSA-OAEP' },
    extractable: true,
    type: type,
    exportKey: function () {
      return this.keyMaterial;
    },
  };
}

function simulateWebCryptoKey(key: Buffer, iv: Buffer) {
  return {
    key: key.toString('base64'),
    iv: iv.toString('base64'),
    algorithm: { name: 'AES-CBC' },
    extractable: true,
    type: 'secret',
    exportKey: function () {
      return this.key;
    },
  };
}

export function generateRsaKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    publicKey: simulateRsaCryptoKey(publicKey.toString(), 'public'),
    privateKey: simulateRsaCryptoKey(privateKey.toString(), 'private'),
  };
}

export function exportPubKey(keyObject: ReturnType<typeof simulateRsaCryptoKey>): string {
  return keyObject.exportKey();
}

export function exportPrvKey(keyObject: ReturnType<typeof simulateRsaCryptoKey>): string {
  return keyObject.exportKey();
}

export function importPubKey(strKey: string): ReturnType<typeof simulateRsaCryptoKey> {
  return simulateRsaCryptoKey(strKey, 'public');
}

export function importPrvKey(strKey: string): ReturnType<typeof simulateRsaCryptoKey> {
  return simulateRsaCryptoKey(strKey, 'private');
}

export function rsaEncrypt(data: string, publicKeyObj: ReturnType<typeof simulateRsaCryptoKey>): string {
  return publicEncrypt(publicKeyObj.keyMaterial, Buffer.from(data)).toString('base64');
}

export function rsaDecrypt(encryptedData: string, privateKeyObj: ReturnType<typeof simulateRsaCryptoKey>): string {
  return privateDecrypt(privateKeyObj.keyMaterial, Buffer.from(encryptedData, 'base64')).toString();
}

export function createRandomSymmetricKey() {
  const key = randomBytes(32);
  const iv = randomBytes(16);
  return simulateWebCryptoKey(key, iv);
}

export function exportSymKey(keyObject: ReturnType<typeof simulateWebCryptoKey>): ReturnType<typeof simulateWebCryptoKey> {
  return keyObject;
}

export function importSymKey(strKey: string, strIv: string): ReturnType<typeof simulateWebCryptoKey> {
  const key = Buffer.from(strKey, 'base64');
  const iv = Buffer.from(strIv, 'base64');
  return simulateWebCryptoKey(key, iv);
}

export function symEncrypt(keyObject: ReturnType<typeof simulateWebCryptoKey>, data: string): string {
  const key = Buffer.from(keyObject.key, 'base64');
  const iv = Buffer.from(keyObject.iv, 'base64');
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function symDecrypt(keyObject: ReturnType<typeof simulateWebCryptoKey>, encryptedData: string): string {
  const key = Buffer.from(keyObject.key, 'base64');
  const iv = Buffer.from(keyObject.iv, 'base64');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
