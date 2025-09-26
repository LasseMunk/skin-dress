<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { BButton } from '@firstnoodle-ui/bui'

interface Props {
  mirrorVideo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mirrorVideo: true,
})

// Emitted events
const emit = defineEmits<{
  photoCapture: [imageData: string]
  cameraStart: []
  cameraStop: []
  error: [errorMessage: string]
}>()

// Reactive references
const videoElement = ref<HTMLVideoElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)
const isStreaming = ref(false)
const capturedImage = ref<string | null>(null)
const error = ref<string | null>(null)
const mirrorVideo = ref(props.mirrorVideo)
const mediaStream = ref<MediaStream | null>(null)

// Start camera function
const startCamera = async () => {
  try {
    error.value = null

    // Request camera permission and get stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user', // Front camera (selfie mode)
      },
      audio: false,
    })

    mediaStream.value = stream

    if (videoElement.value) {
      videoElement.value.srcObject = stream
      videoElement.value.onloadedmetadata = () => {
        isStreaming.value = true
        emit('cameraStart')
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
    error.value = `Camera error: ${errorMessage}`
    emit('error', errorMessage)
    console.error('Error accessing camera:', err)
  }
}

// Stop camera function
const stopCamera = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => track.stop())
    mediaStream.value = null
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null
  }

  isStreaming.value = false
  emit('cameraStop')
}

// Capture photo function
const capturePhoto = () => {
  if (!videoElement.value || !canvasElement.value || !isStreaming.value) {
    return
  }

  const canvas = canvasElement.value
  const video = videoElement.value
  const context = canvas.getContext('2d')

  // Set canvas size to match video's actual dimensions
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  canvas.width = videoWidth
  canvas.height = videoHeight

  if (context) {
    // If mirroring is enabled, flip the canvas horizontally
    if (mirrorVideo.value) {
      context.scale(-1, 1)
      context.drawImage(video, -videoWidth, 0, videoWidth, videoHeight)
      context.setTransform(1, 0, 0, 1, 0, 0) // Reset transform
    } else {
      context.drawImage(video, 0, 0, videoWidth, videoHeight)
    }

    // Convert canvas to data URL
    const imageData = canvas.toDataURL('image/png')
    capturedImage.value = imageData
    emit('photoCapture', imageData)
  }
} // Toggle mirror function
const toggleMirror = () => {
  mirrorVideo.value = !mirrorVideo.value
}

// Download photo function
const downloadPhoto = () => {
  if (!capturedImage.value) return

  const link = document.createElement('a')
  link.download = `webcam-capture-${new Date().getTime()}.png`
  link.href = capturedImage.value
  link.click()
}

// Clear photo function
const clearPhoto = () => {
  capturedImage.value = null
}

// Check camera availability
const checkCameraSupport = () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    error.value = 'Camera not supported in this browser'
    return false
  }
  return true
}

// Component lifecycle
onMounted(() => {
  checkCameraSupport()
})

onUnmounted(() => {
  stopCamera()
})

// Expose methods for parent component
defineExpose({
  startCamera,
  stopCamera,
  capturePhoto,
  clearPhoto,
})
</script>

<template>
  <div class="webcam-container w-full h-full flex flex-col">
    <!-- Video container with aspect ratio -->
    <div class="relative flex-1 w-full h-full video-aspect-container">
      <!-- Video element for webcam stream -->
      <video
        ref="videoElement"
        autoplay
        muted
        playsinline
        class="w-full h-full object-cover"
        :class="{ mirror: mirrorVideo }"
      ></video>

      <!-- Canvas for capturing photos (hidden) -->
      <canvas ref="canvasElement" class="hidden"></canvas>

      <!-- Controls overlay -->
      <div class="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
        <BButton v-if="!isStreaming" :label="'Start Camera'" @click="startCamera" />
        <BButton v-if="isStreaming" :label="'Capture Photo'" @click="capturePhoto" />
        <BButton v-if="isStreaming" :label="'Stop Camera'" @click="stopCamera" />
        <BButton @click="toggleMirror" :label="mirrorVideo ? 'Unmirror' : 'Mirror'" />
      </div>
    </div>

    <!-- Captured photo preview -->
    <div v-if="capturedImage" class="mt-4">
      <h3 class="text-lg font-semibold mb-2">Captured Photo:</h3>
      <img :src="capturedImage" :alt="'Captured photo'" class="rounded-lg shadow-lg max-w-full" />
      <div class="mt-2 flex gap-2">
        <BButton @click="downloadPhoto" :label="'Download'" />
        <BButton @click="clearPhoto" :label="'Clear'" />
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ error }}
    </div>

    <!-- Error message -->
    <div v-if="error" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.mirror {
  transform: scaleX(-1);
}

.webcam-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.video-aspect-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.video-aspect-container video {
  width: 100%;
  height: 100%;
  object-fit: contain; /* This maintains aspect ratio while fitting in container */
}

/* Ensure 16:9 aspect ratio when container allows it */
@media (min-aspect-ratio: 16/9) {
  .video-aspect-container video {
    width: auto;
    height: 100%;
  }
}

@media (max-aspect-ratio: 16/9) {
  .video-aspect-container video {
    width: 100%;
    height: auto;
  }
}
</style>
