<script setup>
import { ref, nextTick } from 'vue'
import { useShoppingListStore } from './stores/shoppingList'

const store = useShoppingListStore()

// Local component state for the form
const newItemName = ref('')
const newItemCategory = ref('Other')

// Editing state
const editingId = ref(null)
const editingName = ref('')
const editingCategory = ref('')

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

    <!-- Active items -->
    <ul>
      <li v-for="item in store.activeItems" :key="item.id">
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
      </li>
    </ul>

    <!-- Empty state -->
    <p v-if="store.activeItems.length === 0" class="empty-state">No items to show.</p>

    <!-- Completed items -->
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
}

li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

li label {
  flex: 1;
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
