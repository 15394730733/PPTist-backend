import CryptoJS from 'crypto-js'

const DEFAULT_KEY = 'pptist'

/**
 * Encrypt a string using AES encryption (CryptoJS compatible)
 * @param message - The message to encrypt
 * @param key - Encryption key (defaults to 'pptist' for PPTist compatibility)
 * @returns Encrypted string
 */
export function encrypt(message: string, key: string = DEFAULT_KEY): string {
  return CryptoJS.AES.encrypt(message, key).toString()
}

/**
 * Decrypt an AES encrypted string
 * @param ciphertext - The encrypted string
 * @param key - Decryption key (defaults to 'pptist' for PPTist compatibility)
 * @returns Decrypted string
 */
export function decrypt(ciphertext: string, key: string = DEFAULT_KEY): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

/**
 * Encrypt a JSON object
 * @param data - The object to encrypt
 * @param key - Encryption key
 * @returns Encrypted string
 */
export function encryptJSON(data: unknown, key?: string): string {
  const jsonString = JSON.stringify(data)
  return encrypt(jsonString, key)
}

/**
 * Decrypt and parse a JSON string
 * @param ciphertext - The encrypted JSON string
 * @param key - Decryption key
 * @returns Parsed JSON object
 */
export function decryptJSON<T = unknown>(ciphertext: string, key?: string): T {
  const decrypted = decrypt(ciphertext, key)
  return JSON.parse(decrypted) as T
}

export default { encrypt, decrypt, encryptJSON, decryptJSON }
