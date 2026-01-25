import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'shopping-list-items'

// Predefined categories - ordered by typical store layout
const CATEGORIES = ['Produce', 'Bakery', 'Dairy', 'Meat', 'Frozen', 'Pantry', 'Beverages', 'Other']

export const useShoppingListStore = defineStore('shoppingList', () => {
  // Load initial data from localStorage, or use defaults
  const savedItems = localStorage.getItem(STORAGE_KEY)
  const initialItems = savedItems
    ? JSON.parse(savedItems)
    : [
        // Produce
        { id: 1, name: 'Apples', completed: false, category: 'Produce' },
        { id: 2, name: 'Bananas', completed: false, category: 'Produce' },
        { id: 3, name: 'Spinach', completed: false, category: 'Produce' },
        { id: 4, name: 'Tomatoes', completed: false, category: 'Produce' },
        { id: 5, name: 'Onions', completed: false, category: 'Produce' },
        { id: 6, name: 'Garlic', completed: false, category: 'Produce' },
        // Bakery
        { id: 7, name: 'Sourdough bread', completed: false, category: 'Bakery' },
        { id: 8, name: 'Bagels', completed: false, category: 'Bakery' },
        { id: 9, name: 'Croissants', completed: false, category: 'Bakery' },
        // Dairy
        { id: 10, name: 'Milk', completed: false, category: 'Dairy' },
        { id: 11, name: 'Eggs', completed: false, category: 'Dairy' },
        { id: 12, name: 'Cheddar cheese', completed: false, category: 'Dairy' },
        { id: 13, name: 'Greek yogurt', completed: false, category: 'Dairy' },
        { id: 14, name: 'Butter', completed: false, category: 'Dairy' },
        // Meat
        { id: 15, name: 'Chicken breast', completed: false, category: 'Meat' },
        { id: 16, name: 'Ground beef', completed: false, category: 'Meat' },
        { id: 17, name: 'Bacon', completed: false, category: 'Meat' },
        // Frozen
        { id: 18, name: 'Frozen peas', completed: false, category: 'Frozen' },
        { id: 19, name: 'Ice cream', completed: false, category: 'Frozen' },
        { id: 20, name: 'Frozen pizza', completed: false, category: 'Frozen' },
        // Pantry
        { id: 21, name: 'Pasta', completed: false, category: 'Pantry' },
        { id: 22, name: 'Rice', completed: false, category: 'Pantry' },
        { id: 23, name: 'Olive oil', completed: false, category: 'Pantry' },
        { id: 24, name: 'Canned tomatoes', completed: false, category: 'Pantry' },
        { id: 25, name: 'Peanut butter', completed: false, category: 'Pantry' },
        // Beverages
        { id: 26, name: 'Orange juice', completed: false, category: 'Beverages' },
        { id: 27, name: 'Coffee', completed: false, category: 'Beverages' },
        { id: 28, name: 'Sparkling water', completed: false, category: 'Beverages' },
      ]

  const items = ref(initialItems)

  // Sort order: 'none', 'a-z', 'z-a'
  const savedSortOrder = localStorage.getItem(STORAGE_KEY + '-sort')
  const sortOrder = ref(savedSortOrder || 'none')

  // Category filter: 'all' or a specific category
  const savedCategoryFilter = localStorage.getItem(STORAGE_KEY + '-filter')
  const categoryFilter = ref(savedCategoryFilter || 'all')

  // Watch for changes and save to localStorage
  watch(
    items,
    (newItems) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems))
    },
    { deep: true },
  )

  watch(sortOrder, (newOrder) => {
    localStorage.setItem(STORAGE_KEY + '-sort', newOrder)
  })

  watch(categoryFilter, (newFilter) => {
    localStorage.setItem(STORAGE_KEY + '-filter', newFilter)
  })

  // Helper function to sort items
  function sortItems(itemList) {
    if (sortOrder.value === 'none') return itemList

    return [...itemList].sort((a, b) => {
      if (sortOrder.value === 'category') {
        // Sort by category order, then alphabetically within category
        const categoryDiff = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)
        if (categoryDiff !== 0) return categoryDiff
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      }

      // Alphabetical sort
      const comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      return sortOrder.value === 'a-z' ? comparison : -comparison
    })
  }

  // Helper function to filter by category
  function filterByCategory(itemList) {
    if (categoryFilter.value === 'all') return itemList
    return itemList.filter((item) => item.category === categoryFilter.value)
  }

  // Computed properties - filter first, then sort
  const activeItems = computed(() =>
    sortItems(filterByCategory(items.value.filter((item) => !item.completed))),
  )
  const completedItems = computed(() =>
    sortItems(filterByCategory(items.value.filter((item) => item.completed))),
  )

  // Actions
  function addItem(name, category = 'Other') {
    const trimmedName = name.trim()
    if (!trimmedName) return

    items.value.push({
      id: Date.now(),
      name: trimmedName,
      completed: false,
      category,
    })
  }

  function setSortOrder(order) {
    sortOrder.value = order
  }

  function setCategoryFilter(category) {
    categoryFilter.value = category
  }

  function deleteItem(id) {
    const index = items.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
    }
  }

  function updateItem(id, newName, newCategory) {
    const item = items.value.find((item) => item.id === id)
    if (item) {
      const trimmed = newName.trim()
      if (trimmed) {
        item.name = trimmed
      }
      if (newCategory) {
        item.category = newCategory
      }
    }
  }

  return {
    items,
    activeItems,
    completedItems,
    sortOrder,
    categoryFilter,
    categories: CATEGORIES,
    addItem,
    setSortOrder,
    setCategoryFilter,
    deleteItem,
    updateItem,
  }
})
