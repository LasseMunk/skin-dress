<script lang="ts" setup>
import { BModal, BVerticalLayout, BConfirmCancel, BButton, BInput } from '@firstnoodle-ui/bui'

import SkinItem from './components/SkinItem.vue'
import clothingDataRaw from './clothing-details-unique.json'
import type { ClothingData, ClothingItem } from './types/clothing'
import { ref, computed, watch, onUnmounted } from 'vue'

interface ClothingItemWithIndex extends ClothingItem {
  originalIndex: number
}

const modalRef = ref<typeof BModal | null>(null)
const showModal = ref<boolean>(true)

const searchQuery = ref<string>('')
const debouncedSearchQuery = ref<string>('')
const clothingData = clothingDataRaw as ClothingData
const items = Object.values(clothingData)
const selectedItems = ref<number[]>([])

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

const toggleItemSelection = async (selectedIndex: number) => {
  if (selectedItems.value.includes(selectedIndex)) {
    selectedItems.value = selectedItems.value.filter((i: number) => i !== selectedIndex)
  } else {
    selectedItems.value.push(selectedIndex)
  }

  const skinItem = document.getElementById('skin-item-' + selectedIndex)
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
        <div class="w-full flex flex-row items-center justify-between p-4 border-b border-gray-200">
          <h5 class="text-2xl font-bold">Welcome to the Skin Shop!</h5>
          <BButton v-if="!showModal" @click="showModal = true" :label="'Dress me!'" />
        </div>
      </template>
      <template #main> </template>
    </BVerticalLayout>
  </div>
  <BModal
    ref="modalRef"
    v-if="showModal"
    title="Select your favorite skins from the collection below"
    expand-vertically
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
              :index="item.originalIndex"
              :key="item.originalIndex"
              :id="`skin-item-${item.originalIndex}`"
              :imgSrc="item.imgSrc"
              :header="item.header"
              :data="item.data"
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
