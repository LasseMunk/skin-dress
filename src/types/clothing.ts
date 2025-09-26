export interface ClothingItem {
  imgSrc: string
  header: string
  data: string[]
}

export interface ClothingData {
  [key: string]: ClothingItem
}
