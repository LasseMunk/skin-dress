<script setup lang="ts">
import { ref, onMounted, onUnmounted, watchEffect } from 'vue'
// @ts-ignore
import generateImageHandler from '../api/generate-image.js'

const { capturePhoto, generateImage, clothingDataUrls } = defineProps<{
  capturePhoto: boolean
  generateImage: boolean
  clothingDataUrls: string[]
}>()

const emit = defineEmits<{
  (e: 'disable:capturePhoto'): void
  (e: 'disable:generateImage'): void
  (e: 'update:clothingDataUrls', urls: string[]): void
}>()

// Reactive state
const webcamContainerRef = ref<HTMLDivElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
const capturedDataUrl = ref<string | null>(null)
const generatedImageUrl = ref<string | null>(null)
const generatedVideoUrl = ref<string | null>(null)
const loadingStep = ref<string | null>(null)
const currentStep = ref<'webcam' | 'captured' | 'image' | 'video'>('webcam')
const customPrompt = ref<string>('')
const selectedVideoModel = ref<string>('wan-2.2-i2v-fast')
const mediaStream = ref<MediaStream | null>(null)

// Default prompt
const defaultPrompt = `You are an expert virtual try-on AI. You will be given a 'model image' and a 'garment image'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the clothing from the 'garment image'.

**Crucial Rules:**
1.  **Complete Garment Replacement:** You MUST completely REMOVE and REPLACE the clothing item worn by the person in the 'model image' with the new garment. No part of the original clothing (e.g., collars, sleeves, patterns) should be visible in the final image.
2.  **Preserve the Model:** The person's face, hair, body shape, and pose from the 'model image' MUST remain unchanged.
3.  **Add a new background:** The background must be a clean, neutral studio backdrop (light gray, #f0f0f0).
4.  **Apply the Garment:** Realistically fit the new garment onto the person. It should adapt to their pose with natural folds, shadows, and lighting consistent with the original scene.
5.  **Output:** Return ONLY the final, edited image, showing the model from the model image wearing the garment from the garment image. Do not include any text.`

// Video constraints
const videoConstraints = {
  facingMode: 'user',
  width: { ideal: 2560 },
  height: { ideal: 1440 },
  aspectRatio: 16 / 9,
}

// Start webcam
const startWebcam = async () => {
  try {
    console.log('[UI] Starting webcam...')
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    })

    mediaStream.value = stream

    if (videoElement.value) {
      videoElement.value.srcObject = stream
    }
  } catch (error) {
    console.error('[UI] Webcam error:', error)
  }
}

// Stop webcam
const stopWebcam = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => track.stop())
    mediaStream.value = null
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null
  }
}

// Event handlers
const onVideoReady = () => {
  console.log('[UI] Webcam stream started')
}

const onVideoError = (error: Event) => {
  console.log('[UI] Webcam error', error)
}

const onVideoCanPlay = () => {
  console.log('[UI] Video can play, starting autoplay')
}

// Capture selfie
const handleCapture = () => {
  try {
    console.log('[UI] Capture Selfie clicked')

    const video = videoElement.value
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

    if (ctx) {
      // Set white background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, w, h)

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

      capturedDataUrl.value = dataUrl
      generatedImageUrl.value = null
      generatedVideoUrl.value = null
      currentStep.value = 'captured'
    }
  } catch (err) {
    console.log('[UI] Capture error', err)
  } finally {
    emit('disable:capturePhoto')
  }
}

// Generate image
const handleGenerateImage = async () => {
  console.log('[UI] Generate Image clicked', {
    hasCapture: Boolean(capturedDataUrl.value),
    clothingCount: clothingDataUrls?.length || 0,
  })

  if (!capturedDataUrl.value || !clothingDataUrls.length) return

  loadingStep.value = 'image'

  try {
    // Prepare payload for API handler
    const prompt = (customPrompt.value && customPrompt.value.trim()) || defaultPrompt
    const payload = {
      person_image: capturedDataUrl.value,
      clothing_images: clothingDataUrls,
      prompt,
      output_format: 'jpg',
    }
    console.log('[UI] Image payload', payload)

    // Create mock request and response objects for the handler
    const mockReq = {
      method: 'POST',
      body: payload,
    }

    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => ({
          status: code,
          json: () => Promise.resolve(data),
          ok: code >= 200 && code < 300,
          data,
        }),
      }),
    }

    console.log('[UI] Calling generate image handler directly')
    const result = await generateImageHandler(mockReq, mockRes)
    console.log('[UI] Handler result', result)

    if (result.status >= 200 && result.status < 300) {
      generatedImageUrl.value = result.data.imageUrl
      generatedVideoUrl.value = null
      currentStep.value = 'image'
    } else {
      throw new Error(result.data.error || 'Image generation failed')
    }
  } catch (err: any) {
    console.log('[UI] Generate image error', err)
    alert(err?.message || 'Error generating image')
  } finally {
    loadingStep.value = null
    emit('disable:generateImage')
  }
}

// Generate video
const handleGenerateVideo = async () => {
  console.log('[UI] Generate Video clicked', { hasImage: Boolean(generatedImageUrl.value) })
  if (!generatedImageUrl.value) return

  loadingStep.value = 'video'
  try {
    const userPrompt = (customPrompt.value && customPrompt.value.trim()) || defaultPrompt
    const audioSuffix =
      selectedVideoModel.value === 'google-veo-fast'
        ? ', immersive sound design: background music, dynamic transitions, impactful whooshes synced to motion'
        : ''
    const videoPrompt = `Close up shot of two people ${userPrompt}, fast-paced cinematography, high energy, dynamic, professional shot${audioSuffix}`
    const videoResolution = selectedVideoModel.value === 'google-veo-fast' ? '1080p' : '480p'

    const payload = {
      image: generatedImageUrl.value,
      prompt: videoPrompt,
      num_frames: 81,
      resolution: videoResolution,
      frames_per_second: 16,
      go_fast: true,
      video_model: selectedVideoModel.value,
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

    generatedVideoUrl.value = json.videoUrl
    currentStep.value = 'video'
  } catch (err: any) {
    console.log('[UI] Generate video error', err)
    alert(err?.message || 'Error generating video')
  } finally {
    loadingStep.value = null
  }
}

// Handle clothing file uploads
const onClothingFilesChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files ? Array.from(target.files) : []
  if (!files.length) return

  const readers = files.map(
    (file) =>
      new Promise<string | null>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
        reader.readAsDataURL(file)
      }),
  )

  Promise.all(readers).then((results) => {
    const urls = results.filter((v): v is string => typeof v === 'string')
    emit('update:clothingDataUrls', urls)
  })
}

// Lifecycle
onMounted(() => {
  startWebcam()
})

onUnmounted(() => {
  stopWebcam()
})

watchEffect(() => {
  if (capturePhoto) {
    handleCapture()
  } else {
    emit('disable:capturePhoto')
  }
})
watchEffect(() => {
  if (generateImage) {
    handleGenerateImage()
  } else {
    emit('disable:generateImage')
  }
})
</script>

<template>
  <div class="w-full h-full bg-white text-white relative overflow-hidden">
    <div class="absolute inset-0 flex items-center justify-center">
      <div
        class="bg-white relative"
        :style="{
          width: 'min(100vw, calc(100vh * 16 / 9))',
          height: 'min(100vh, calc(100vw * 9 / 16))',
        }"
      >
        <!-- Webcam (kept mounted; shown only in webcam step) -->
        <div
          ref="webcamContainerRef"
          :style="
            currentStep === 'webcam'
              ? { width: '100%', height: '100%' }
              : {
                  position: 'fixed',
                  top: '-10000px',
                  left: '-10000px',
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  pointerEvents: 'none',
                }
          "
        >
          <video
            ref="videoElement"
            autoplay
            muted
            playsinline
            :style="{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#000',
              transform: 'scaleX(-1)', // Mirror effect
            }"
            @loadedmetadata="onVideoReady"
            @error="onVideoError"
          />
        </div>

        <!-- Captured image -->
        <img
          v-if="currentStep === 'captured' && capturedDataUrl"
          :src="capturedDataUrl"
          alt="captured"
          class="w-full h-full object-contain"
        />

        <!-- Generated image -->
        <img
          v-if="currentStep === 'image' && generatedImageUrl"
          :src="generatedImageUrl"
          alt="generated"
          class="w-full h-full object-contain"
        />

        <!-- Generated video -->
        <video
          v-if="currentStep === 'video' && generatedVideoUrl"
          :src="generatedVideoUrl"
          autoplay
          muted
          loop
          playsinline
          controls
          class="w-full h-full object-contain bg-white"
          @canplay="onVideoCanPlay"
        />
      </div>
    </div>

    <!-- Button bar -->
    <div
      class="absolute left-0 right-0 bottom-0 p-3 flex flex-wrap items-center justify-center gap-2"
    >
      <!-- Clothing preview thumbnails -->
      <div v-if="clothingDataUrls.length > 0" class="flex gap-1 flex-wrap items-center max-w-60">
        <img
          v-for="(src, idx) in clothingDataUrls"
          :key="idx"
          :src="src"
          :alt="`clothing-${idx}`"
          class="h-9 w-9 object-cover rounded bg-gray-800"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom styles if needed */
button:disabled {
  cursor: not-allowed;
}
</style>
