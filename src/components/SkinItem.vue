<script setup lang="ts">
import type { ClothingItemWithIndex } from '@/types/clothing'

defineProps<{
  item: ClothingItemWithIndex
  isSelected: boolean
}>()

defineEmits<{
  (e: 'select', item: ClothingItemWithIndex): void
}>()
</script>

<template>
  <div
    :id="'skin-item-' + item.originalIndex"
    class="flex flex-col w-full relative hover:cursor-pointer rounded-lg p-2 bg-white skin-item-shadow"
    @click="$emit('select', item)"
  >
    <div class="absolute top-2 right-2">
      <div
        v-if="isSelected"
        class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center"
      >
        ✓
      </div>
    </div>
    <img :src="item.imgSrc" alt="" class="object-cover" />
    <div class="w-full bg-gray-100 rounded-b-lg">
      <h5 class="p-2">{{ item.header }}</h5>
      <div v-if="item.data.length > 1" class="flex flex-col flex-wrap gap-1">
        <span
          v-for="(dataItem, index) in item.data.slice(1)"
          :key="index + 1"
          class="px-2 py-1 rounded-sm text-sm"
          >{{ dataItem }}</span
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.skin-item-shadow {
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0));
  transition: filter 0.2s ease;
}

.skin-item-shadow:hover {
  filter: drop-shadow(8px 4px 12px rgba(0, 0, 0, 0.2));
}
</style>
