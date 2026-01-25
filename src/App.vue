<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { useShoppingListStore } from './stores/shoppingList'

const store = useShoppingListStore()

// Local component state for the form
const newItemName = ref('')
const newItemCategory = ref('Other')

// Editing state
const editingId = ref(null)
const editingName = ref('')
const editingCategory = ref('')

// ============================================
// CUSTOM DRAG & DROP SYSTEM
// ============================================
// Vue concept: We use refs for reactive state that the template responds to,
// and regular variables for internal tracking that doesn't need reactivity.

// Reactive state (template will update when these change)
const draggedItem = ref(null)      // The item being dragged
const dropIndex = ref(-1)          // Where the item will be dropped (for visual gap)

// Non-reactive tracking (internal use only)
let draggedIndex = -1              // Original index of dragged item
let dragClone = null               // The floating clone element
let dragStartY = 0                 // Mouse Y when drag started
let itemHeight = 0                 // Height of each item for position calculations
let listTop = 0                    // Top of the list for calculating drop position

// Computed: items with a "gap" inserted where we'll drop
// Vue concept: computed() creates a derived value that auto-updates when dependencies change
const displayItems = computed(() => {
  const items = [...store.activeItems]
  if (draggedItem.value && dropIndex.value >= 0) {
    // Remove dragged item from its original position
    const filtered = items.filter(item => item.id !== draggedItem.value.id)
    // Insert a placeholder at drop position
    filtered.splice(dropIndex.value, 0, { id: 'drop-placeholder', isPlaceholder: true })
    return filtered
  }
  return items
})

function handleAddItem() {
  store.addItem(newItemName.value, newItemCategory.value)
  newItemName.value = ''
}

function startEditing(item) {
  editingId.value = item.id
  editingName.value = item.name
  editingCategory.value = item.category
  nextTick(() => {
    document.querySelector('.edit-input')?.focus()
  })
}

function saveEdit() {
  if (editingId.value !== null) {
    store.updateItem(editingId.value, editingName.value, editingCategory.value)
    cancelEdit()
  }
}

function cancelEdit() {
  editingId.value = null
  editingName.value = ''
  editingCategory.value = ''
}

function handleEditKeydown(event) {
  if (event.key === 'Enter') {
    saveEdit()
  } else if (event.key === 'Escape') {
    cancelEdit()
  }
}

// Start dragging when user presses on the handle
function startDrag(event, item, index) {
  // Prevent text selection while dragging
  event.preventDefault()

  // Store what we're dragging
  draggedItem.value = item
  draggedIndex = index
  dragStartY = event.clientY

  // Get the list element to calculate positions
  const listEl = event.target.closest('ul')
  const itemEl = event.target.closest('li')
  listTop = listEl.getBoundingClientRect().top
  itemHeight = itemEl.offsetHeight

  // Create a floating clone of the item
  // Vue concept: Sometimes you need direct DOM manipulation for visual effects
  dragClone = itemEl.cloneNode(true)
  dragClone.classList.add('drag-clone')
  const rect = itemEl.getBoundingClientRect()
  dragClone.style.position = 'fixed'
  dragClone.style.left = rect.left + 'px'
  dragClone.style.top = rect.top + 'px'
  dragClone.style.width = rect.width + 'px'
  document.body.appendChild(dragClone)

  // Set initial drop index
  dropIndex.value = index

  // Listen for mouse movement on the whole document
  // Vue concept: For drag operations, we attach listeners to document
  // so dragging continues even if mouse leaves the element
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
}

// Called continuously as the mouse moves
function onDrag(event) {
  if (!dragClone) return

  // Move the clone vertically (Y-axis only - this is the key!)
  const deltaY = event.clientY - dragStartY
  const startTop = parseFloat(dragClone.style.top) || 0
  dragClone.style.top = (startTop + deltaY) + 'px'
  dragStartY = event.clientY  // Update for next frame

  // Calculate which position we're hovering over
  const mouseY = event.clientY - listTop
  let newDropIndex = Math.floor(mouseY / itemHeight)

  // Clamp to valid range
  const maxIndex = store.activeItems.length - 1
  newDropIndex = Math.max(0, Math.min(newDropIndex, maxIndex))

  // Update drop position (Vue reactivity will update the display)
  dropIndex.value = newDropIndex
}

// Called when mouse is released
function endDrag() {
  // Remove document listeners
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)

  // Remove the floating clone
  if (dragClone) {
    dragClone.remove()
    dragClone = null
  }

  // Perform the actual reorder if position changed
  if (draggedItem.value && dropIndex.value !== draggedIndex) {
    // Build new order: remove from old position, insert at new
    const newOrder = store.activeItems.filter(item => item.id !== draggedItem.value.id)
    newOrder.splice(dropIndex.value, 0, draggedItem.value)
    store.reorderActiveItems(newOrder)
  }

  // Reset drag state
  draggedItem.value = null
  dropIndex.value = -1
  draggedIndex = -1
}

// Cleanup if component unmounts during drag
// Vue concept: onUnmounted lifecycle hook for cleanup
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  if (dragClone) dragClone.remove()
})
</script>

<template>
  <div class="container">
    <h1>Shopping List</h1>

    <!-- Add new item form -->
    <form @submit.prevent="handleAddItem" class="add-form">
      <input v-model="newItemName" type="text" placeholder="Add an item..." />
      <select v-model="newItemCategory">
        <option v-for="category in store.categories" :key="category" :value="category">
          {{ category }}
        </option>
      </select>
      <button type="submit">Add</button>
    </form>

    <!-- Sort and filter controls -->
    <div class="controls">
      <label>
        Sort:
        <select :value="store.sortOrder" @change="store.setSortOrder($event.target.value)">
          <option value="none">Manual order</option>
          <option value="category">By category</option>
          <option value="a-z">A to Z</option>
          <option value="z-a">Z to A</option>
        </select>
      </label>

      <label>
        Filter:
        <select
          :value="store.categoryFilter"
          @change="store.setCategoryFilter($event.target.value)"
        >
          <option value="all">All categories</option>
          <option v-for="category in store.categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </label>
    </div>

    <!-- Active items with custom drag & drop -->
    <!-- Vue concept: v-for iterates over displayItems (which includes the drop placeholder) -->
    <ul class="item-list">
      <li
        v-for="(item, index) in displayItems"
        :key="item.id"
        :class="{
          'drop-placeholder': item.isPlaceholder,
          'is-dragging': draggedItem?.id === item.id
        }"
      >
        <!-- Placeholder shows where item will drop -->
        <template v-if="item.isPlaceholder">
          <div class="placeholder-content"></div>
        </template>

        <!-- Regular item -->
        <template v-else>
          <!-- Vue concept: @mousedown.prevent starts drag, .prevent stops text selection -->
          <span
            class="drag-handle"
            @mousedown="startDrag($event, item, index)"
          >⠿</span>
          <input type="checkbox" v-model="item.completed" />

          <!-- Editing mode -->
          <template v-if="editingId === item.id">
            <input
              v-model="editingName"
              class="edit-input"
              @keydown="handleEditKeydown"
            />
            <select v-model="editingCategory" class="edit-category" @keydown="handleEditKeydown">
              <option v-for="category in store.categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
            <button class="save-btn" @click="saveEdit">Save</button>
          </template>

          <!-- Display mode -->
          <template v-else>
            <span class="item-name" @click="startEditing(item)">{{ item.name }}</span>
            <span class="category-tag">{{ item.category }}</span>
          </template>

          <button class="delete-btn" @click="store.deleteItem(item.id)">×</button>
        </template>
      </li>
    </ul>

    <!-- Empty state -->
    <p v-if="store.activeItems.length === 0" class="empty-state">No items to show.</p>

    <!-- Completed items (not draggable) -->
    <div v-if="store.completedItems.length > 0" class="completed-section">
      <h2>Completed</h2>
      <ul>
        <li v-for="item in store.completedItems" :key="item.id">
          <label>
            <input type="checkbox" v-model="item.completed" />
            <span class="completed-text">{{ item.name }}</span>
            <span class="category-tag">{{ item.category }}</span>
          </label>
          <button class="delete-btn" @click="store.deleteItem(item.id)">×</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  font-family: system-ui, sans-serif;
}

.completed-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ccc;
}

.completed-section h2 {
  font-size: 1rem;
  color: #666;
}

.completed-text {
  text-decoration: line-through;
  color: #888;
}

.add-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.add-form input {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
}

.add-form select {
  padding: 8px;
  font-size: 1rem;
}

.add-form button {
  padding: 8px 16px;
  font-size: 1rem;
  cursor: pointer;
}

.controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.controls select {
  padding: 4px 8px;
  font-size: 1rem;
}

.category-tag {
  margin-left: 8px;
  padding: 2px 6px;
  background-color: #e0e0e0;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #666;
}

.empty-state {
  color: #888;
  font-style: italic;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  transition: transform 0.15s ease;
}

li label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  cursor: grab;
  color: #999;
  padding: 4px;
  user-select: none;
}

.drag-handle:hover {
  color: #666;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Item being dragged in the list (faded out) */
.is-dragging {
  opacity: 0.3;
}

/* Drop placeholder - shows where item will land */
.drop-placeholder {
  background-color: #e3f2fd;
  border: 2px dashed #90caf9;
  border-radius: 4px;
}

.placeholder-content {
  height: 20px;  /* Approximate height of item content */
}

.delete-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0 8px;
}

.delete-btn:hover {
  color: #e53935;
}

.item-name {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  flex: 1;
}

.item-name:hover {
  background-color: #f0f0f0;
}

.edit-input {
  flex: 1;
  padding: 4px 8px;
  font-size: 1rem;
  border: 1px solid #2196f3;
  border-radius: 3px;
  outline: none;
}

.edit-category {
  padding: 4px;
  font-size: 0.875rem;
  border: 1px solid #2196f3;
  border-radius: 3px;
}

.save-btn {
  padding: 4px 8px;
  font-size: 0.875rem;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.save-btn:hover {
  background-color: #1976d2;
}

</style>

<style>
/* Global styles for the floating drag clone (appended to body) */
.drag-clone {
  background-color: #e3f2fd !important;
  border-radius: 4px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  list-style: none !important;
  z-index: 1000;
  pointer-events: none;  /* Don't interfere with mouse events */
  opacity: 0.95;
}
</style>
