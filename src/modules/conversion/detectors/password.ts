import JSZip from 'jszip'
import { Errors } from '../../../utils/errors.js'

/**
 * Check if a PPTX file is password protected
 * Password protected files have an EncryptedPackage entry
 */
export async function detectPasswordProtection(buffer: Buffer): Promise<boolean> {
  const zip = new JSZip()

  try {
    const contents = await zip.loadAsync(buffer)

    // Check for encrypted package indicator
    if (contents.file('EncryptedPackage')) {
      return true
    }

    // Check for encryption info
    if (contents.file('EncryptionInfo')) {
      return true
    }

    return false
  } catch {
    // If we can't load the ZIP, it might be encrypted
    return false
  }
}

/**
 * Validate and throw error if file is password protected
 */
export async function validateNotPasswordProtected(buffer: Buffer): Promise<void> {
  const isProtected = await detectPasswordProtection(buffer)
  if (isProtected) {
    throw Errors.protectedFile()
  }
}

/**
 * Quick sync check for password protection (less reliable)
 * Uses magic bytes and structure check
 */
export function quickPasswordCheck(buffer: Buffer): boolean {
  // PPTX files are ZIP files starting with PK
  if (buffer.length < 4) return false

  // Check ZIP magic bytes
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b // 'PK'

  if (!isZip) return false

  // Look for 'EncryptedPackage' string in first few KB
  const searchBuffer = buffer.slice(0, Math.min(buffer.length, 8192))
  const searchString = searchBuffer.toString('binary')
  return searchString.includes('EncryptedPackage')
}

export default {
  detectPasswordProtection,
  validateNotPasswordProtected,
  quickPasswordCheck,
}
