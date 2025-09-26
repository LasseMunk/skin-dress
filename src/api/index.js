export default function Home() {
  const webcamContainerRef = useRef(null)
  const [capturedDataUrl, setCapturedDataUrl] = useState(null)

  const [generatedImageUrl, setGeneratedImageUrl] = useState(null)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null)
  const [loadingStep, setLoadingStep] = useState(null)
  const [currentStep, setCurrentStep] = useState('webcam')
  const [customPrompt, setCustomPrompt] = useState('')
  const [showPromptInput, setShowPromptInput] = useState(false)
  const [selectedVideoModel, setSelectedVideoModel] = useState('wan-2.2-i2v-fast')
  const [clothingDataUrls, setClothingDataUrls] = useState([])

  const defaultPrompt = `You are an expert virtual try-on AI. You will be given a 'model image' and a 'garment image'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the clothing from the 'garment image'.

**Crucial Rules:**
1.  **Complete Garment Replacement:** You MUST completely REMOVE and REPLACE the clothing item worn by the person in the 'model image' with the new garment. No part of the original clothing (e.g., collars, sleeves, patterns) should be visible in the final image.
2.  **Preserve the Model:** The person's face, hair, body shape, and pose from the 'model image' MUST remain unchanged.
3.  **Add a new background:** The background must be a clean, neutral studio backdrop (light gray, #f0f0f0).
4.  **Apply the Garment:** Realistically fit the new garment onto the person. It should adapt to their pose with natural folds, shadows, and lighting consistent with the original scene.
5.  **Output:** Return ONLY the final, edited image, showing the model from the model image wearing the garment from the garment image. Do not include any text.`

  //"Generate a photorealistic close-up fashion runway photo of the person wearing the provided clothing image(s). Keep the person’s identity and facial features accurate. Prioritize tight framing on the face and upper body; only include full body if boots, skirts, or pants are part of the outfit. Ensure fit and drape match the clothing images, and if multiple items are provided, merge them into a cohesive outfit. Use professional runway lighting, close up shot, minimalistic runway fashion background, and capture fine detail in a sharp, close-up composition.";
  //"Generate a photorealistic close-up fashion runway photo of the person wearing the provided clothing image(s). Keep the person’s identity and facial features accurate. Prioritize tight framing on the face and upper body; only include full body if boots, skirts, or pants are part of the outfit. Ensure fit and drape match the clothing images, and if multiple items are provided, merge them into a cohesive outfit. Use professional runway lighting, close up shot, minimalistic runway fashion background, and capture fine detail in a sharp, close-up composition."
  //"Create a photorealistic fashion runway photo of the person wearing the provided clothing image(s). Maintain the person's identity and facial features. Fit and drape should match the clothing images. If multiple items are provided, layer and merge them into a cohesive outfit. Full-body framing, professional runway lighting, dynamic background, high detail.";

  const videoConstraints = useMemo(
    () => ({
      facingMode: 'user',
      // Prefer high resolution but adapt to the user's webcam capabilities
      width: { ideal: 2560 },
      height: { ideal: 1440 },
      aspectRatio: 16 / 9,
    }),
    [],
  )

  const handleCapture = useCallback(() => {
    try {
      console.log('[UI] Capture Selfie clicked')
      const root = webcamContainerRef.current
      const video = root ? root.querySelector('video') : null
      if (!video) {
        console.log('[UI] No video element found yet')
        return
      }
      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) {
        console.log('[UI] Video dimensions not ready', { w, h })
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      // Mirror horizontally to match on-screen mirrored webcam feed
      ctx.save()
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, w, h)
      ctx.restore()
      const dataUrl = canvas.toDataURL('image/png')
      console.log('[UI] Screenshot captured', {
        hasData: Boolean(dataUrl),
        bytes: dataUrl?.length,
        w,
        h,
      })
      setCapturedDataUrl(dataUrl)

      setGeneratedImageUrl(null)
      setGeneratedVideoUrl(null)
      setCurrentStep('captured')
    } catch (err) {
      console.log('[UI] Capture error', err)
    }
  }, [])

  // No longer splitting the capture; we use the full-frame image directly

  const handleGenerateImage = async (capturedDataUrl, clothingDataUrls, customPrompt) => {
    console.log('[UI] Generate Image clicked', {
      hasCapture: Boolean(capturedDataUrl),
      clothingCount: clothingDataUrls?.length || 0,
    })
    if (!capturedDataUrl || !Array.isArray(clothingDataUrls) || clothingDataUrls.length < 1) return
    setLoadingStep('image')
    try {
      // Prepare payload for Nano Banana
      const prompt = (customPrompt && customPrompt.trim()) || defaultPrompt
      const payload = {
        person_image: capturedDataUrl,
        clothing_images: clothingDataUrls,
        prompt,
        output_format: 'jpg',
      }
      console.log('[UI] Image payload', payload)

      const resp = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      console.log('[UI] Image API status', resp.status)
      const json = await resp.json()
      console.log('[UI] Image API JSON', json)
      if (!resp.ok) throw new Error(json.error || 'Image generation failed')
      setGeneratedImageUrl(json.imageUrl)
      setGeneratedVideoUrl(null)
      setCurrentStep('image')
    } catch (err) {
      console.log('[UI] Generate image error', err)
      alert(err?.message || 'Error generating image')
    } finally {
      setLoadingStep(null)
    }
  }

  const handleGenerateVideo = useCallback(async () => {
    console.log('[UI] Generate Video clicked', { hasImage: Boolean(generatedImageUrl) })
    if (!generatedImageUrl) return
    setLoadingStep('video')
    try {
      const userPrompt = (customPrompt && customPrompt.trim()) || defaultPrompt
      const audioSuffix =
        selectedVideoModel === 'google-veo-fast'
          ? ', immersive sound design: background music, dynamic transitions, impactful whooshes synced to motion'
          : ''
      const videoPrompt = `Close up shot of two people ${userPrompt}, fast-paced cinematography, high energy, dynamic, professional shot${audioSuffix}`
      const videoResolution = selectedVideoModel === 'google-veo-fast' ? '1080p' : '480p'
      const payload = {
        image: generatedImageUrl,
        prompt: videoPrompt,
        num_frames: 81,
        resolution: videoResolution,
        frames_per_second: 16,
        go_fast: true,
        video_model: selectedVideoModel,
      }
      console.log('[UI] Video payload', payload)
      const resp = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      console.log('[UI] Video API status', resp.status)
      const json = await resp.json()
      console.log('[UI] Video API JSON', json)
      if (!resp.ok) throw new Error(json.error || 'Video generation failed')
      setGeneratedVideoUrl(json.videoUrl)
      setCurrentStep('video')
    } catch (err) {
      console.log('[UI] Generate video error', err)
      alert(err?.message || 'Error generating video')
    } finally {
      setLoadingStep(null)
    }
  }, [generatedImageUrl, customPrompt, selectedVideoModel])

  return (
    <>
      <Head>
        <title>Usie Fight MVP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#000',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 'min(100vw, calc(100vh * 16 / 9))',
              height: 'min(100vh, calc(100vw * 9 / 16))',
              background: '#000',
              position: 'relative',
            }}
          >
            {/* Webcam (kept mounted; shown only in webcam step) */}
            <div
              ref={webcamContainerRef}
              style={
                currentStep === 'webcam'
                  ? { width: '100%', height: '100%' }
                  : {
                      position: 'fixed',
                      top: '-10000px',
                      left: '-10000px',
                      width: 1,
                      height: 1,
                      opacity: 0,
                      pointerEvents: 'none',
                    }
              }
            >
              <Webcam
                audio={false}
                screenshotFormat="image/png"
                videoConstraints={videoConstraints}
                mirrored
                onUserMedia={() => console.log('[UI] Webcam stream started')}
                onUserMediaError={(e) => console.log('[UI] Webcam error', e)}
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />
            </div>

            {/* Split indicator removed */}

            {/* Captured image */}
            {currentStep === 'captured' && capturedDataUrl && (
              <img
                src={capturedDataUrl}
                alt="captured"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )}

            {/* Split view removed: we now use the full captured frame */}

            {/* Generated image */}
            {currentStep === 'image' && generatedImageUrl && (
              <img
                src={generatedImageUrl}
                alt="generated"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )}

            {/* Generated video */}
            {currentStep === 'video' && generatedVideoUrl && (
              <video
                src={generatedVideoUrl}
                autoPlay
                muted
                loop
                playsInline
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                onCanPlay={() => console.log('[UI] Video can play, starting autoplay')}
              />
            )}
          </div>
        </div>

        {/* Button bar (kept visible) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <button
            onClick={() => {
              setCurrentStep('webcam')
              setGeneratedImageUrl(null)
              setGeneratedVideoUrl(null)
            }}
          >
            Webcam
          </button>
          <button onClick={handleCapture}>Capture Selfie</button>
          <button
            onClick={handleGenerateImage}
            disabled={
              !capturedDataUrl ||
              !Array.isArray(clothingDataUrls) ||
              clothingDataUrls.length < 1 ||
              loadingStep === 'image'
            }
          >
            {loadingStep === 'image' ? 'Generating Image...' : 'Generate Image'}
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : []
                if (!files.length) return
                const readers = files.map(
                  (file) =>
                    new Promise((resolve) => {
                      const reader = new FileReader()
                      reader.onload = () =>
                        resolve(typeof reader.result === 'string' ? reader.result : null)
                      reader.readAsDataURL(file)
                    }),
                )
                Promise.all(readers).then((results) => {
                  const urls = results.filter((v) => typeof v === 'string')
                  setClothingDataUrls(urls)
                })
              }}
              style={{ color: '#fff' }}
            />
          </label>
          {Array.isArray(clothingDataUrls) && clothingDataUrls.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
                maxWidth: 240,
              }}
            >
              {clothingDataUrls.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`clothing-${idx}`}
                  style={{
                    height: 36,
                    width: 36,
                    objectFit: 'cover',
                    borderRadius: 4,
                    background: '#222',
                  }}
                />
              ))}
            </div>
          )}
          <button
            onClick={handleGenerateVideo}
            disabled={!generatedImageUrl || loadingStep === 'video'}
          >
            {loadingStep === 'video' ? 'Generating Video...' : 'Generate Video'}
          </button>
          <select
            value={selectedVideoModel}
            onChange={(e) => setSelectedVideoModel(e.target.value)}
            style={{ color: '#000', padding: '6px 10px', borderRadius: 4 }}
          >
            <option value="wan-2.2-i2v-fast">WAN 2.2 (i2v fast)</option>
            <option value="google-veo-fast">Google Veo 3 Fast</option>
          </select>
          <button onClick={() => setShowPromptInput((v) => !v)}>
            {showPromptInput ? 'Hide Prompt' : 'Edit Prompt'}
          </button>
          {showPromptInput && (
            <input
              type="text"
              placeholder="Enter prompt (leave empty for default)"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              style={{ minWidth: 240, padding: '6px 10px', color: '#000', borderRadius: 4 }}
            />
          )}
        </div>
      </div>
    </>
  )
}
