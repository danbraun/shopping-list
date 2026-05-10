<script setup>
import { ref, nextTick } from 'vue'
import { useShoppingListStore } from './stores/shoppingList'

const store = useShoppingListStore()

// Local component state for the form
const newItemName = ref('')
const newItemCategory = ref('Other')

// Modal state
const showModal = ref(false)
const addButtonRef = ref(null)

function openModal() {
  showModal.value = true
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', handleModalKeydown)
  nextTick(() => {
    document.getElementById('new-item-name')?.focus()
  })
}

function closeModal() {
  showModal.value = false
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  document.removeEventListener('keydown', handleModalKeydown)
  nextTick(() => {
    addButtonRef.value?.focus()
  })
}

function handleModalKeydown(event) {
  if (event.key === 'Escape') closeModal()
}

// Editing state
const editingId = ref(null)
const editingName = ref('')
const editingCategory = ref('')

function handleAddItem() {
  if (!newItemName.value.trim()) return
  store.addItem(newItemName.value, newItemCategory.value)
  newItemName.value = ''
  closeModal()
}

function startEditing(item) {
  editingId.value = item.id
  editingName.value = item.name
  editingCategory.value = item.category
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
</script>

<template>
  <div class="container">
    <header>
      <h1>Shopping List</h1>
    </header>

    <main>
      <!-- Sort and filter controls -->
      <div class="controls" role="group" aria-label="List controls">
        <div class="control-field">
          <label for="sort-select">Sort:</label>
          <select id="sort-select" :value="store.sortOrder" @change="store.setSortOrder($event.target.value)">
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

      <!-- Active items -->
      <TransitionGroup name="list" tag="ul" class="item-list" aria-label="Shopping items">
        <li v-for="item in store.activeItems" :key="item.id">
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
        </li>
      </TransitionGroup>

      <!-- Empty state -->
      <p v-if="store.activeItems.length === 0" class="empty-state">No items to show.</p>

      <!-- Completed items -->
      <section v-if="store.completedItems.length > 0" class="completed-section" aria-label="Completed items">
        <h2>Completed</h2>
        <TransitionGroup name="list" tag="ul">
          <li v-for="item in store.completedItems" :key="item.id">
            <input type="checkbox" :id="`completed-${item.id}`" v-model="item.completed"
              :aria-label="`Mark ${item.name} as incomplete`" />
            <label :for="`completed-${item.id}`" class="completed-label" @click.prevent>
              <span class="completed-text">{{ item.name }}</span>
              <span class="category-tag" :class="'category-' + item.category.toLowerCase()" aria-label="Category">{{
                item.category }}</span>
            </label>
            <button type="button" class="delete-btn" :aria-label="`Delete ${item.name}`"
              @click="store.deleteItem(item.id)">×</button>
          </li>
        </TransitionGroup>
      </section>

    </main>
  </div>

  <!-- Fixed add button bar -->
  <div class="add-bar">
    <button ref="addButtonRef" type="button" class="add-bar-btn" @click="openModal">+ Add Item</button>
  </div>

  <!-- Add item modal -->
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title" class="modal-title">Add Item</h2>
        <form @submit.prevent="handleAddItem" class="modal-form">
          <div class="modal-field">
            <label for="new-item-name">Item name</label>
            <input id="new-item-name" v-model="newItemName" type="text" placeholder="Enter item name..."
              autocomplete="off" />
          </div>
          <div class="modal-field">
            <label for="new-item-category">Category</label>
            <select id="new-item-category" v-model="newItemCategory">
              <option v-for="category in store.categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="modal-cancel-btn" @click="closeModal">Cancel</button>
            <button type="submit" class="modal-add-btn">Add</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
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
  padding: 20px 20px 100px;
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

/* Fixed add button bar */
.add-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #1a0a2e;
  padding: 16px 20px;
  display: flex;
  justify-content: center;
  z-index: 50;
  font-family: 'Barlow Condensed', system-ui, sans-serif;
}

.add-bar-btn {
  background: linear-gradient(135deg, #7c4daf 0%, #9c6bc0 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 40px;
  font-size: 1rem;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.add-bar-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 77, 175, 0.4);
}

.add-bar-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(156, 123, 192, 0.5);
}

/* Modal overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  touch-action: none;
  padding-inline: 1rem;
}

/* Modal panel */
.modal-panel {
  background: #2d1b4e;
  border-radius: 12px;
  padding: 28px 24px 24px;
  width: 90%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  font-family: 'Barlow Condensed', system-ui, sans-serif;
}

.modal-title {
  color: #f5f0ff;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 20px;
  font-family: 'Barlow Condensed', system-ui, sans-serif;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-field label {
  color: #d4c4f0;
  font-size: 0.95rem;
  font-weight: 500;
}

.modal-field input,
.modal-field select {
  padding: 10px 12px;
  font-size: 0.95rem;
  border: 2px solid #6b4c8a;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.95);
  font-family: inherit;
  box-sizing: border-box;
  width: 100%;
}

.modal-field input:focus,
.modal-field select:focus {
  outline: none;
  border-color: #9c7bc0;
  box-shadow: 0 0 0 3px rgba(156, 123, 192, 0.3);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 4px;
}

.modal-cancel-btn {
  padding: 10px 20px;
  font-size: 0.95rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: #d4c4f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: background-color 0.15s ease;
}

.modal-cancel-btn:hover {
  background-color: rgba(255, 255, 255, 0.18);
}

.modal-cancel-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(156, 123, 192, 0.5);
}

.modal-add-btn {
  padding: 10px 24px;
  font-size: 0.95rem;
  background: linear-gradient(135deg, #7c4daf 0%, #9c6bc0 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.modal-add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 77, 175, 0.4);
}

.modal-add-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(156, 123, 192, 0.5);
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
  border: 2px solid #6b4c8a;
  border-radius: 6px;
  min-height: 44px;
  background-color: rgba(255, 255, 255, 0.95);
  font-family: inherit;
}

.controls select:focus {
  outline: none;
  border-color: #9c7bc0;
  box-shadow: 0 0 0 3px rgba(156, 123, 192, 0.3);
}

.category-tag {
  margin-left: 4px;
  padding: 2px 6px;
  background-color: #e0e0e0;
  border-radius: 4px;
  font-size: 0.85rem;
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

/* Checkbox styling */
li input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0 12px 0 0;
  cursor: pointer;
  accent-color: #7c4daf;
}

.delete-btn {
  background: none;
  border: 1px solid transparent;
  color: #6b4c8a;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px;
  min-width: 28px;
  min-height: 28px;
  display: none;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.delete-btn:hover {
  color: #c62828;
  background-color: #ffebee;
}

.delete-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(124, 77, 175, 0.4);
}

li:has(.edit-input) .delete-btn {
  display: flex;
}

.item-name {
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  flex: 1;
  min-height: 20px;
  display: flex;
  align-items: center;
  font-size: 1.1rem;
}

.item-name:hover {
  background-color: #f0f0f0;
}

.item-name:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(124, 77, 175, 0.4);
  background-color: #f0f0f0;
}

.edit-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 1rem;
  border: 2px solid #7c4daf;
  border-radius: 6px;
  min-height: 40px;
  font-family: inherit;
}

.edit-input:focus {
  outline: none;
  border-color: #9c7bc0;
  box-shadow: 0 0 0 3px rgba(156, 123, 192, 0.3);
}

.edit-category {
  padding: 8px;
  font-size: 0.875rem;
  border: 2px solid #7c4daf;
  border-radius: 6px;
  min-height: 40px;
  font-family: inherit;
}

.edit-category:focus {
  outline: none;
  border-color: #9c7bc0;
  box-shadow: 0 0 0 3px rgba(156, 123, 192, 0.3);
}

.save-btn {
  padding: 8px 16px;
  font-size: 0.875rem;
  background: linear-gradient(135deg, #7c4daf 0%, #9c6bc0 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  min-height: 40px;
  font-family: inherit;
  font-weight: 500;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 77, 175, 0.4);
}

.save-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(156, 123, 192, 0.5);
}

.cancel-btn {
  padding: 8px 16px;
  font-size: 0.875rem;
  background-color: rgba(255, 255, 255, 0.9);
  color: #4a2c6a;
  border: 2px solid #6b4c8a;
  border-radius: 6px;
  cursor: pointer;
  min-height: 40px;
  font-family: inherit;
  font-weight: 500;
  transition: background-color 0.15s ease;
}

.cancel-btn:hover {
  background-color: rgba(235, 230, 245, 0.95);
}

.cancel-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(156, 123, 192, 0.5);
}

/* Responsive design for mobile */
@media (max-width: 480px) {
  .container {
    padding: 16px 16px 100px;
  }

  /* Pin modal to top so the keyboard doesn't cover it when a field is focused */
  .modal-overlay {
    align-items: flex-start;
    padding-top: 1.5rem;
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
    padding: 4px 8px 4px 4px;
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
  background-color: #6b4c8a;
  margin: 0;
}

/* Ensure consistent focus styles globally */
*:focus {
  outline: 2px solid #9c7bc0;
  outline-offset: 2px;
}

/* Remove default outline for mouse users, keep for keyboard */
*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid #9c7bc0;
  outline-offset: 2px;
}
</style>
