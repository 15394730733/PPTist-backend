import { encrypt } from '../../../utils/crypto.js'
import { getConfig } from '../../../config/index.js'
import type { PPTistPresentation } from '../types/pptist.js'

/**
 * Encrypt a PPTist presentation to .pptist format
 * @param presentation - The presentation object to encrypt
 * @returns Encrypted string ready for file output
 */
export function encryptPresentation(presentation: PPTistPresentation): string {
  const config = getConfig()

  // Serialize to JSON
  const jsonString = JSON.stringify(presentation)

  // Encrypt using CryptoJS AES
  const encrypted = encrypt(jsonString, config.CRYPTO_KEY)

  return encrypted
}

/**
 * Encrypt raw JSON string
 * @param jsonString - JSON string to encrypt
 * @returns Encrypted string
 */
export function encryptJson(jsonString: string): string {
  const config = getConfig()
  return encrypt(jsonString, config.CRYPTO_KEY)
}

export default {
  encryptPresentation,
  encryptJson,
}
