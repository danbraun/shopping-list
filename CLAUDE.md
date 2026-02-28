# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- **Never commit or push to git** unless explicitly requested by the user.

## Development Commands

- `npm run dev` - Start Vite dev server with hot-reload
- `npm run build` - Build production bundle to `dist/`
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

## Architecture

This is a Vue 3 + Vite shopping list app using Pinia for state management. All data persists to browser localStorage (no backend).

### Key Files

- `src/App.vue` - Main component with UI, add/edit forms, and custom drag-drop implementation
- `src/stores/shoppingList.js` - Pinia store managing items, sorting, and filtering
- `src/main.js` - Vue app bootstrap with Pinia initialization

### State Management

The shopping list store (`shoppingList.js`) maintains:

- **items**: Array of `{ id, name, category, checked }` objects
- **sortOrder**: 'none' | 'a-z' | 'z-a' | 'by-category'
- **filterCategory**: Category string or empty for all

Computed properties `activeItems` and `completedItems` handle filtering/sorting. All state changes auto-sync to localStorage.

### Categories

Produce, Bakery, Dairy, Meat, Frozen, Pantry, Beverages, Other

### Drag & Drop

Custom vanilla JS implementation in App.vue - creates visual clone during drag, shows drop placeholder, and calls `reorderItems()` action on drop.

## Code Style

- Vue 3 Composition API with `<script setup>` syntax
- No semicolons, single quotes, 100 char line width (Prettier)
- Path alias: `@` maps to `./src`

## Deployment

- Compatible with modern browsers on desktop
- Responsive mobile design
- Works with both mouse and touch interactions

### Accessibility

- This application conforms to Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA
