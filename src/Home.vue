<script lang="ts" setup>
import { BModal, BVerticalLayout, BConfirmCancel, BButton, BInput } from '@firstnoodle-ui/bui'

import SkinItem from './components/SkinItem.vue'
import WebcamCapture from './components/WebcamCapture.vue'
import WebCamAIGen from './components/WebCamAIGen.vue'
import clothingDataRaw from './clothing-details-unique.json'
import type { ClothingData, ClothingItem, ClothingItemWithIndex } from './types/clothing'
import { ref, computed, watch, onUnmounted } from 'vue'

const modalRef = ref<typeof BModal | null>(null)
const showModal = ref<boolean>(false)

const searchQuery = ref<string>('')
const debouncedSearchQuery = ref<string>('')
const clothingData = clothingDataRaw as ClothingData
const items = Object.values(clothingData)
const selectedItems = ref<number[]>([])
const capturedPhoto = ref<string | null>(null)

const capturePhoto = ref<boolean>(false)
const generateImage = ref<boolean>(false)
const chosenPhotoUrls = ref<string[]>([])

let searchTimeout: number | null = null

// Watch for search query changes and debounce them
watch(searchQuery, (newQuery) => {
  // Cancel previous timeout
  if (searchTimeout !== null) {
    clearTimeout(searchTimeout)
  }

  // Set new timeout for debounced search
  searchTimeout = setTimeout(() => {
    debouncedSearchQuery.value = newQuery
    console.log('Debounced search executed:', newQuery)
  }, 300) // 300ms delay
})

const itemsToRender = computed<ClothingItemWithIndex[]>(() => {
  const query = debouncedSearchQuery.value.toLowerCase().trim()

  if (!query) {
    return items.map((item, index) => ({ ...item, originalIndex: index }))
  }

  const queryWords = query.split(/\s+/).filter((word) => word.length > 0)
  console.log({ query, queryWords })

  return items
    .map((item, index) => ({ ...item, originalIndex: index }))
    .filter((item) => {
      const searchText = [item.header.toLowerCase(), ...item.data.map((d) => d.toLowerCase())].join(
        ' ',
      )

      // Check if all query words are found in the combined text (fuzzy AND)
      return queryWords.every((word) => searchText.includes(word))
    })
})

const toggleItemSelection = async (item: ClothingItemWithIndex) => {
  if (selectedItems.value.includes(item.originalIndex)) {
    selectedItems.value = selectedItems.value.filter((i: number) => i !== item.originalIndex)
    chosenPhotoUrls.value = chosenPhotoUrls.value.filter((url) => url !== item.imgSrc)
  } else {
    selectedItems.value.push(item.originalIndex)
    chosenPhotoUrls.value.push(item.imgSrc)
  }

  const skinItem = document.getElementById('skin-item-' + item.originalIndex)
  if (skinItem) {
    skinItem.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })
  }
}

const onDressMe = () => {
  showModal.value = false
}

const onSearch = (event: string) => {
  searchQuery.value = event
}

const onPhotoCapture = (imageData: string) => {
  capturedPhoto.value = imageData
  console.log('Photo captured!', imageData.substring(0, 50) + '...')
}

const onWebcamError = (error: string) => {
  console.error('Webcam error:', error)
  alert(`Webcam error: ${error}`)
}

// Cleanup timeout on component unmount
onUnmounted(() => {
  if (searchTimeout !== null) {
    clearTimeout(searchTimeout)
  }
})
</script>
<template>
  <div class="h-full w-full">
    <BVerticalLayout>
      <template #header>
        <div class="w-full flex flex-row items-center justify-between p-4">
          <h5 class="text-2xl font-bold">Welcome to the Skin Shop!</h5>
          <div class="flex gap-2">
            <BButton v-if="!capturePhoto" @click="capturePhoto = true" :label="'Capture Photo'" />
            <BButton
              v-if="!generateImage"
              @click="generateImage = true"
              :label="'Generate Image'"
            />
            <BButton v-if="!showModal" @click="showModal = true" :label="'Dress me!'" />
          </div>
        </div>
      </template>
      <template #main>
        <!-- Webcam Section -->
        <div class="w-full h-full flex">
          <div class="flex-1 h-full">
            <WebCamAIGen
              :clothing-data-urls="chosenPhotoUrls"
              :capturePhoto="capturePhoto"
              :generate-image="generateImage"
              class="w-full h-full"
              @photo-capture="onPhotoCapture"
              @error="onWebcamError"
              @disable:capture-photo="capturePhoto = false"
              @disable:generate-image="generateImage = false"
              @update:clothing-data-urls="chosenPhotoUrls = $event"
            />
          </div>
          <div v-if="capturedPhoto" class="w-80 p-4">
            <h4 class="font-medium mb-2">Your Photo:</h4>
            <img :src="capturedPhoto" alt="Captured photo" class="w-full rounded-lg shadow" />
            <p class="text-sm text-gray-600 mt-2">
              You can use this photo to virtually try on the selected skins!
            </p>
          </div>
        </div>
      </template>
    </BVerticalLayout>
  </div>
  <BModal
    ref="modalRef"
    v-if="showModal"
    title="Select your favorite skins from the collection below"
    expand-vertically
    @close="showModal = false"
    :width-class="'max-w-6xl'"
  >
    <template #header>
      <BInput :value="searchQuery" @change="onSearch" placeholder="Search for skins..." />
    </template>
    <template #main>
      <BVerticalLayout>
        <template #main>
          <div class="grid grid-cols-3 gap-8 p-8">
            <SkinItem
              v-for="(item, index) in itemsToRender"
              :item="item"
              :key="item.originalIndex"
              :id="`skin-item-${item.originalIndex}`"
              :isSelected="selectedItems.includes(item.originalIndex)"
              @select="toggleItemSelection"
            />
          </div>
        </template>
      </BVerticalLayout>
    </template>
    <template #footer>
      <div class="w-full pt-2 flex justify-end">
        <BConfirmCancel
          :confirm-label="'dress me!'"
          :confirm-disabled="selectedItems.length === 0"
          @confirm="onDressMe"
          @cancel="showModal = false"
        />
      </div>
    </template>
  </BModal>
</template>
