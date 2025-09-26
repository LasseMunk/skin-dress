// Centralized Replicate API calls using fetch (no client lib)
// Expects process.env.REPLICATE_API_KEY to be set in .env.local

import Replicate from 'replicate'

// const REPLICATE_API_BASE = 'https://api.replicate.com/v1' // kept for any direct calls if needed

/**
 * Calls a Replicate model by owner/name with JSON input.
 * Returns parsed JSON response.
 * Adds verbose console.debug logs for request/response.
 */
export async function callReplicateModel({ model, input }) {
  const apiKey = import.meta.env.VITE_REPLICATE_API_KEY
  if (!apiKey) throw new Error('VITE_REPLICATE_API_KEY is not set')

  const replicate = new Replicate({ auth: apiKey })
  console.debug('[replicate] run() start', {
    model,
    hasInput: !!input,
    keys: Object.keys(input || {}),
  })
  const output = await replicate.run(model, { input })
  console.debug('[replicate] run() output', output)
  return output
}

/**
 * Normalize Replicate run() output to a public URL string when the model returns a file.
 * - If it's already a string, return it.
 * - If it's a FileOutput, return fileOutput.url().
 * - If it's an array, take the first element and recurse.
 */
export function resolveOutputToUrl(output) {
  if (output == null) return output
  if (typeof output === 'string') return output
  if (Array.isArray(output)) return resolveOutputToUrl(output[0])
  if (typeof output === 'object' && typeof output.url === 'function') {
    try {
      const url = output.url()
      return url
    } catch (e) {
      console.debug('[replicate] resolveOutputToUrl url() failed', e)
    }
  }
  return String(output)
}

/**
 * Polls a Replicate prediction until it completes or errors.
 * Returns the final prediction object.
 */
// Not needed when using replicate.run, kept for potential future use
export async function waitForPrediction() {
  throw new Error('waitForPrediction not used with replicate.run')
}

/**
 * Upload a binary blob to Replicate Files API and return the file URL token (urls.get).
 */
// With official client, just pass Buffers and it auto-uploads
export async function uploadBlobToReplicate({ blob }) {
  const ab = await blob.arrayBuffer()
  return Buffer.from(ab)
}

/**
 * Convert a data URL (data:mime;base64,XXXX) to a Blob.
 */
export function dataUrlToBlob(dataUrl) {
  if (!dataUrl.startsWith('data:')) {
    throw new Error('Not a data URL')
  }
  const [header, base64Data] = dataUrl.split(',')
  const mimeMatch = header.match(/^data:(.*?);base64$/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const buffer = Buffer.from(base64Data, 'base64')
  return new Blob([buffer], { type: mime })
}

/**
 * Takes an array of strings (data URLs or HTTP URLs). For data URLs, uploads to Replicate and returns URL tokens.
 */
export async function normalizeImageInputsToReplicateUrls(images) {
  const results = []
  for (let i = 0; i < images.length; i += 1) {
    const src = images[i]
    if (typeof src === 'string' && src.startsWith('data:')) {
      const blob = dataUrlToBlob(src)
      const buffer = await uploadBlobToReplicate({ blob })
      results.push(buffer)
    } else {
      results.push(src)
    }
  }
  console.debug(
    '[replicate] Normalized image inputs (buffers/urls)',
    results.map((v) => (Buffer.isBuffer(v) ? `Buffer(${v.length})` : v)),
  )
  return results
}
