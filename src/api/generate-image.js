import {
  callReplicateModel,
  normalizeImageInputsToReplicateUrls,
  resolveOutputToUrl,
} from './replicate'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  console.debug('[api/generate-image] Incoming', { method: req.method })
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { prompt, person_image, clothing_images, output_format = 'jpg' } = req.body || {}
    console.debug('[api/generate-image] Payload', {
      hasPrompt: !!prompt,
      hasPerson: !!person_image,
      clothingCount: Array.isArray(clothing_images) ? clothing_images.length : 0,
      output_format,
    })

    if (!person_image || !Array.isArray(clothing_images) || clothing_images.length < 1) {
      return res
        .status(400)
        .json({ error: 'person_image and at least one clothing_images item are required' })
    }

    // Normalize to Buffer if data URLs provided; otherwise pass through
    const normalized = await normalizeImageInputsToReplicateUrls([...clothing_images, person_image])
    const personInput = normalized[normalized.length - 1]
    const clothingInputs = normalized.slice(0, -1)
    console.debug(
      '[api/generate-image] Normalized inputs',
      Buffer.isBuffer(personInput)
        ? `Person(Buffer ${personInput.length})`
        : `Person(${String(personInput).slice(0, 64)})`,
      `ClothingCount=${clothingInputs.length}`,
    )

    // Use Google Nano Banana with multiple clothing images; keep person last to influence AR
    const output = await callReplicateModel({
      model: 'google/nano-banana',
      input: {
        prompt: prompt || '',
        image_input: [...clothingInputs, personInput],
        output_format,
      },
    })

    const imageUrl = resolveOutputToUrl(output)
    console.debug('[api/generate-image] Resolved imageUrl', imageUrl)
    return res.status(200).json({ imageUrl })
  } catch (err) {
    console.debug('[api/generate-image] Error', err)
    return res.status(500).json({ error: err?.message || 'Unknown error' })
  }
}
