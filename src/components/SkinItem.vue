<script setup lang="ts">
defineProps<{
  index: number
  isSelected: boolean
  imgSrc: string
  header: string
  data: string[]
}>()

defineEmits<{
  (e: 'select', index: number): void
}>()
</script>

<template>
  <div
    :id="'skin-item-' + index"
    class="flex flex-col w-full relative hover:cursor-pointer rounded-lg p-2 bg-white skin-item-shadow"
    @click="$emit('select', index)"
  >
    <div class="absolute top-2 right-2">
      <div
        v-if="isSelected"
        class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center"
      >
        ✓
      </div>
    </div>
    <img :src="imgSrc" alt="" class="object-cover" />
    <div class="w-full bg-gray-100 rounded-b-lg">
      <h5 class="p-2">{{ header }}</h5>
      <div v-if="data.length > 1" class="flex flex-col flex-wrap gap-1">
        <span
          v-for="(item, index) in data.slice(1)"
          :key="index + 1"
          class="px-2 py-1 rounded-sm text-sm"
          >{{ item }}</span
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
