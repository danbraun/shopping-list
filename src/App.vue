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

// Screen reader announcements
const announcement = ref('')
function announce(message) {
  announcement.value = ''
  nextTick(() => {
    announcement.value = message
  })
}

// ============================================
// CUSTOM DRAG & DROP SYSTEM
// ============================================
// Supports both mouse and touch interactions

// Reactive state (template will update when these change)
const draggedItem = ref(null)      // The item being dragged
const dropIndex = ref(-1)          // Where the item will be dropped (for visual gap)

// Non-reactive tracking (internal use only)
let draggedIndex = -1              // Original index of dragged item
let dragClone = null               // The floating clone element
let dragStartY = 0                 // Pointer Y when drag started
let cloneStartTop = 0              // Initial top position for the clone
let itemHeight = 0                 // Height of each item for position calculations
let listTop = 0                    // Top of the list for calculating drop position
let isTouchDrag = false            // Track if current drag is touch-based

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
  announce(`Editing ${item.name}`)
  nextTick(() => {
    document.querySelector('.edit-input')?.focus()
  })
}

function handleItemKeydown(event, item) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    startEditing(item)
  }
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

// Create the visual clone for dragging
function createDragClone(itemEl) {
  dragClone = itemEl.cloneNode(true)
  dragClone.classList.add('drag-clone')
  const rect = itemEl.getBoundingClientRect()
  dragClone.style.position = 'fixed'
  dragClone.style.left = rect.left + 'px'
  dragClone.style.top = rect.top + 'px'
  dragClone.style.width = rect.width + 'px'
  cloneStartTop = rect.top
  document.body.appendChild(dragClone)
}

// Get clientY from pointer or touch event
function getClientY(event) {
  if (event.touches && event.touches.length > 0) {
    return event.touches[0].clientY
  }
  return event.clientY
}

// Start dragging when user presses on the handle
function startDrag(event, item, index) {
  // Ignore if drag is already in progress
  if (draggedItem.value !== null) {
    return
  }

  // Prevent text selection and default behavior
  event.preventDefault()

  // Determine if this is a touch interaction
  isTouchDrag = event.type === 'touchstart' || event.pointerType === 'touch'

  // Get the list element to calculate positions
  const listEl = event.target.closest('ul')
  const itemEl = event.target.closest('li')
  listTop = listEl.getBoundingClientRect().top
  itemHeight = itemEl.offsetHeight
  dragStartY = getClientY(event)

  // Start drag immediately
  draggedIndex = index
  createDragClone(itemEl)
  draggedItem.value = item
  dropIndex.value = index

  // Add event listeners for both pointer and touch events
  document.addEventListener('pointermove', onDrag)
  document.addEventListener('pointerup', endDrag)
  document.addEventListener('pointercancel', endDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', endDrag)
  document.addEventListener('touchcancel', endDrag)

  announce(`Grabbed ${item.name}. Use arrow keys or drag to reorder.`)
}

// Called continuously as the pointer/touch moves
function onDrag(event) {
  if (!dragClone) return

  // Prevent scrolling on touch devices while dragging
  event.preventDefault()

  const clientY = getClientY(event)

  // Move the clone vertically using absolute position from start
  const deltaY = clientY - dragStartY
  dragClone.style.top = (cloneStartTop + deltaY) + 'px'

  // Calculate which position we're hovering over
  const pointerY = clientY - listTop
  let newDropIndex = Math.floor(pointerY / itemHeight)

  // Clamp to valid range
  const maxIndex = store.activeItems.length - 1
  newDropIndex = Math.max(0, Math.min(newDropIndex, maxIndex))

  // Update drop position (Vue reactivity will update the display)
  dropIndex.value = newDropIndex
}

// Called when pointer/touch is released
function endDrag() {
  // Remove all document listeners
  document.removeEventListener('pointermove', onDrag)
  document.removeEventListener('pointerup', endDrag)
  document.removeEventListener('pointercancel', endDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', endDrag)
  document.removeEventListener('touchcancel', endDrag)

  // Remove the floating clone
  if (dragClone) {
    dragClone.remove()
    dragClone = null
  }

  // Perform the actual reorder if position changed
  const movedItem = draggedItem.value
  if (movedItem && dropIndex.value !== draggedIndex) {
    const newOrder = store.activeItems.filter(item => item.id !== movedItem.id)
    newOrder.splice(dropIndex.value, 0, movedItem)
    store.reorderActiveItems(newOrder)
    announce(`${movedItem.name} moved to position ${dropIndex.value + 1}`)
  } else if (movedItem) {
    announce(`${movedItem.name} dropped in original position`)
  }

  resetDragState()
}

// Reset all drag state variables
function resetDragState() {
  draggedItem.value = null
  dropIndex.value = -1
  draggedIndex = -1
  isTouchDrag = false
  cloneStartTop = 0
}

// Keyboard-based reordering for accessibility
function handleDragKeydown(event, item, index) {
  if (event.key === 'ArrowUp' && index > 0) {
    event.preventDefault()
    const newOrder = [...store.activeItems]
    newOrder.splice(index, 1)
    newOrder.splice(index - 1, 0, item)
    store.reorderActiveItems(newOrder)
    announce(`${item.name} moved up to position ${index}`)
    // Keep focus on the moved item
    nextTick(() => {
      const handles = document.querySelectorAll('.drag-handle')
      handles[index - 1]?.focus()
    })
  } else if (event.key === 'ArrowDown' && index < store.activeItems.length - 1) {
    event.preventDefault()
    const newOrder = [...store.activeItems]
    newOrder.splice(index, 1)
    newOrder.splice(index + 1, 0, item)
    store.reorderActiveItems(newOrder)
    announce(`${item.name} moved down to position ${index + 2}`)
    // Keep focus on the moved item
    nextTick(() => {
      const handles = document.querySelectorAll('.drag-handle')
      handles[index + 1]?.focus()
    })
  }
}

// Cleanup if component unmounts during drag
onUnmounted(() => {
  document.removeEventListener('pointermove', onDrag)
  document.removeEventListener('pointerup', endDrag)
  document.removeEventListener('pointercancel', endDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', endDrag)
  document.removeEventListener('touchcancel', endDrag)
  if (dragClone) dragClone.remove()
  resetDragState()
})
</script>

<template>
  <div class="container">
    <!-- Screen reader announcements -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      {{ announcement }}
    </div>

    <header>
      <h1>Shopping List</h1>
    </header>

    <main>
      <!-- Sort and filter controls -->
      <div class="controls" role="group" aria-label="List controls">
        <div class="control-field">
          <label for="sort-select">Sort:</label>
          <select id="sort-select" :value="store.sortOrder" @change="store.setSortOrder($event.target.value)">
            <option value="none">Manual order</option>
            <option value="category">By category</option>
            <option value="a-z">A to Z</option>
            <option value="z-a">Z to A</option>
          </select>
        </div>

        <div class="control-field">
          <label for="filter-select">Filter:</label>
          <select id="filter-select" :value="store.categoryFilter"
            @change="store.setCategoryFilter($event.target.value)">
            <option value="all">All categories</option>
            <option v-for="category in store.categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
      </div>

      <!-- Active items with custom drag & drop -->
      <TransitionGroup name="list" tag="ul" class="item-list" aria-label="Shopping items">
        <li v-for="(item, index) in displayItems" :key="item.id" :class="{
          'drop-placeholder': item.isPlaceholder,
          'is-dragging': draggedItem?.id === item.id
        }">
          <!-- Placeholder shows where item will drop -->
          <template v-if="item.isPlaceholder">
            <div class="placeholder-content" aria-hidden="true"></div>
          </template>

          <!-- Regular item -->
          <template v-else>
            <!-- Drag handle with keyboard and pointer support -->
            <div role="button" tabindex="0" class="drag-handle"
              :aria-label="`Reorder ${item.name}. Use arrow keys to move.`"
              @pointerdown="startDrag($event, item, index)" @touchstart="startDrag($event, item, index)"
              @keydown="handleDragKeydown($event, item, index)">⠿</div>

            <input type="checkbox" :id="`item-${item.id}`" v-model="item.completed"
              :aria-label="`Mark ${item.name} as ${item.completed ? 'incomplete' : 'complete'}`" />

            <!-- Editing mode -->
            <template v-if="editingId === item.id">
              <label :for="`edit-name-${item.id}`" class="sr-only">Edit item name</label>
              <input :id="`edit-name-${item.id}`" v-model="editingName" class="edit-input"
                @keydown="handleEditKeydown" />
              <label :for="`edit-category-${item.id}`" class="sr-only">Edit category</label>
              <select :id="`edit-category-${item.id}`" v-model="editingCategory" class="edit-category"
                @keydown="handleEditKeydown">
                <option v-for="category in store.categories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
              <button class="save-btn" @click="saveEdit">Save</button>
              <button type="button" class="cancel-btn" @click="cancelEdit">Cancel</button>
            </template>

            <!-- Display mode -->
            <template v-else>
              <span class="item-name" role="button" tabindex="0"
                :aria-label="`${item.name}. Click or press Enter to edit.`" @click="startEditing(item)"
                @keydown="handleItemKeydown($event, item)">{{ item.name }}</span>
              <span class="category-tag" :class="'category-' + item.category.toLowerCase()" aria-label="Category">{{
                item.category }}</span>
            </template>

            <button type="button" class="delete-btn" :aria-label="`Delete ${item.name}`"
              @click="store.deleteItem(item.id)">×</button>
          </template>
        </li>
      </TransitionGroup>

      <!-- Empty state -->
      <p v-if="store.activeItems.length === 0" class="empty-state">No items to show.</p>

      <!-- Completed items (not draggable) -->
      <section v-if="store.completedItems.length > 0" class="completed-section" aria-label="Completed items">
        <h2>Completed</h2>
        <TransitionGroup name="list" tag="ul">
          <li v-for="item in store.completedItems" :key="item.id">
            <input type="checkbox" :id="`completed-${item.id}`" v-model="item.completed"
              :aria-label="`Mark ${item.name} as incomplete`" />
            <label :for="`completed-${item.id}`" class="completed-label">
              <span class="completed-text">{{ item.name }}</span>
              <span class="category-tag" :class="'category-' + item.category.toLowerCase()" aria-label="Category">{{
                item.category }}</span>
            </label>
            <button type="button" class="delete-btn" :aria-label="`Delete ${item.name}`"
              @click="store.deleteItem(item.id)">×</button>
          </li>
        </TransitionGroup>
      </section>

      <!-- Add new item form -->
      <form @submit.prevent="handleAddItem" class="add-form" aria-label="Add new item">
        <div class="form-field">
          <label for="new-item-name" class="sr-only">Item name</label>
          <input id="new-item-name" v-model="newItemName" type="text" placeholder="Add an item..." autocomplete="off" />
        </div>
        <div class="form-field">
          <label for="new-item-category" class="sr-only">Category</label>
          <select id="new-item-category" v-model="newItemCategory">
            <option v-for="category in store.categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <button type="submit">Add</button>
      </form>
    </main>
  </div>
</template>

<style scoped>
/* List transition animations */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.list-leave-to {
  opacity: 0;
}

/* Leaving items are taken out of flow so remaining items animate smoothly */
.list-leave-active {
  position: absolute;
  width: calc(100% - 8px);
}

/* Screen reader only - visually hidden but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Barlow Condensed', system-ui, sans-serif;
  color: #f5f0ff;
}

header h1 {
  margin-top: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.completed-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
}

.completed-section h2 {
  font-size: 1rem;
  color: #d4c4f0;
}

.completed-text {
  text-decoration: line-through;
  color: #545454;
}

.completed-label {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.add-form {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  flex-wrap: wrap;
}

.form-field {
  flex: 1;
  min-width: 120px;
}

.add-form input {
  width: 100%;
  padding: 8px 10px;
  font-size: 0.95rem;
  border: 1px solid #545454;
  border-radius: 4px;
  box-sizing: border-box;
}

.add-form select {
  width: 100%;
  padding: 8px 10px;
  font-size: 0.95rem;
  border: 1px solid #545454;
  border-radius: 4px;
  box-sizing: border-box;
}

.add-form button {
  padding: 8px 16px;
  font-size: 0.95rem;
  cursor: pointer;
  min-height: 36px;
  border: none;
  background-color: #1565c0;
  color: white;
  border-radius: 4px;
}

.add-form button:hover {
  background-color: #0d47a1;
}

.controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.control-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-field label {
  color: #f5f0ff;
  font-weight: 500;
}

.controls select {
  padding: 8px 12px;
  font-size: 1rem;
  border: 1px solid #545454;
  border-radius: 4px;
  min-height: 44px;
}

.category-tag {
  margin-left: 4px;
  padding: 2px 6px;
  background-color: #e0e0e0;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #1a1a1a;
}

/* Category colors - pastel palette (WCAG AA 4.5:1 contrast) */
.category-produce {
  background-color: #c8e6c9;
  color: #1b5e20;
}

.category-bakery {
  background-color: #ffe0b2;
  color: #7a3d00;
}

.category-dairy {
  background-color: #bbdefb;
  color: #0d47a1;
}

.category-meat {
  background-color: #ffcdd2;
  color: #8e0000;
}

.category-frozen {
  background-color: #e0f7fa;
  color: #004d54;
}

.category-pantry {
  background-color: #fff9c4;
  color: #6d5c00;
}

.category-beverages {
  background-color: #e1bee7;
  color: #4a0072;
}

.category-bathroom {
  background-color: #d7ccc8;
  color: #3e2723;
}

.category-fitness {
  background-color: #ffccbc;
  color: #7a2000;
}

.category-bulk {
  background-color: #cfd8dc;
  color: #263238;
}

.category-other {
  background-color: #e0e0e0;
  color: #1a1a1a;
}

.empty-state {
  color: #d4c4f0;
  font-style: italic;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
}

li {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  transition: transform 0.15s ease;
  min-height: 36px;
  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  margin-bottom: 4px;
  color: #1a1a1a;
}

.drag-handle {
  cursor: grab;
  color: #545454;
  padding: 6px 2px 6px 6px;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 1rem;
  min-width: 28px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.drag-handle:hover {
  color: #1a1a1a;
  background-color: #f0f0f0;
}

.drag-handle:focus {
  outline: 2px solid #1565c0;
  outline-offset: 2px;
  color: #1a1a1a;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Checkbox styling */
li input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0 12px 0 0;
  cursor: pointer;
  accent-color: #1565c0;
}

/* Item being dragged in the list (faded out) */
.is-dragging {
  opacity: 0.3;
}

/* Drop placeholder - shows where item will land */
.drop-placeholder {
  background-color: #e3f2fd;
  border: 2px dashed #1565c0;
  border-radius: 4px;
}

.placeholder-content {
  height: 20px;
}

.delete-btn {
  background: none;
  border: 1px solid transparent;
  color: #545454;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px;
  min-width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.delete-btn:hover {
  color: #c62828;
  background-color: #ffebee;
}

.delete-btn:focus {
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}

.item-name {
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  flex: 1;
  min-height: 20px;
  display: flex;
  align-items: center;
  font-size: 0.95rem;
}

.item-name:hover {
  background-color: #f0f0f0;
}

.item-name:focus {
  outline: 2px solid #1565c0;
  outline-offset: 2px;
  background-color: #f0f0f0;
}

.edit-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 1rem;
  border: 2px solid #1565c0;
  border-radius: 4px;
  min-height: 40px;
}

.edit-input:focus {
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}

.edit-category {
  padding: 8px;
  font-size: 0.875rem;
  border: 2px solid #1565c0;
  border-radius: 4px;
  min-height: 40px;
}

.edit-category:focus {
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}

.save-btn {
  padding: 8px 16px;
  font-size: 0.875rem;
  background-color: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  min-height: 40px;
}

.save-btn:hover {
  background-color: #0d47a1;
}

.save-btn:focus {
  outline: 2px solid #1a1a1a;
  outline-offset: 2px;
}

.cancel-btn {
  padding: 8px 16px;
  font-size: 0.875rem;
  background-color: #f5f5f5;
  color: #1a1a1a;
  border: 1px solid #545454;
  border-radius: 4px;
  cursor: pointer;
  min-height: 40px;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.cancel-btn:focus {
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}

/* Focus visible for keyboard users */
*:focus-visible {
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}

/* Responsive design for mobile */
@media (max-width: 480px) {
  .container {
    padding: 16px;
  }

  .add-form {
    flex-direction: column;
    gap: 12px;
  }

  .form-field {
    width: 100%;
    min-width: unset;
  }

  .add-form button {
    width: 100%;
  }

  .controls {
    flex-direction: column;
    gap: 12px;
  }

  .control-field {
    width: 100%;
    justify-content: space-between;
  }

  .control-field select {
    flex: 1;
    max-width: 200px;
  }

  li {
    flex-wrap: nowrap;
    padding: 4px;
  }

  li:has(.edit-input) {
    flex-wrap: wrap;
  }

  .item-name {
    flex-basis: calc(100% - 140px);
  }

  .category-tag {
    margin-left: 0;
    margin-top: 4px;
  }

  .edit-input {
    flex-basis: 100%;
    margin-bottom: 8px;
  }

  .edit-category {
    flex: 1;
  }
}
</style>

<style>
/* Ensure page is scrollable on mobile */
html,
body {
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  min-height: 100vh;
}

body {
  background: linear-gradient(135deg,
      #1a0a2e 0%,
      #2d1b4e 35%,
      #4a2c6a 70%,
      #6b4c8a 100%);
  background-attachment: fixed;
  margin: 0;
}

/* Global styles for the floating drag clone (appended to body) */
.drag-clone {
  background-color: rgba(255, 255, 255, 0.95) !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
  list-style: none !important;
  z-index: 1000;
  pointer-events: none;
  font-family: 'Barlow Condensed', system-ui, sans-serif;
  color: #1a1a1a;
}

/* Ensure consistent focus styles globally */
*:focus {
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}

/* Remove default outline for mouse users, keep for keyboard */
*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}
</style>
