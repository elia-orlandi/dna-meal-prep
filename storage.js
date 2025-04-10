// storage.js - Handles saving/loading data to/from localStorage

const STORAGE_KEY_COMBINATIONS = 'foodMapCombinations';

/**
 * Loads combinations from localStorage.
 * @returns {Array} An array of combination objects or an empty array if none found.
 */
function loadCombinationsFromStorage() {
    try {
        const storedData = localStorage.getItem(STORAGE_KEY_COMBINATIONS);
        return storedData ? JSON.parse(storedData) : [];
    } catch (error) {
        console.error("Error loading combinations from localStorage:", error);
        return []; // Return empty array on error
    }
}

/**
 * Saves combinations to localStorage.
 * @param {Array} combinationsArray - The array of combination objects to save.
 */
function saveCombinationsToStorage(combinationsArray) {
    try {
        localStorage.setItem(STORAGE_KEY_COMBINATIONS, JSON.stringify(combinationsArray));
    } catch (error) {
        console.error("Error saving combinations to localStorage:", error);
    }
}

// Export functions if using modules later, otherwise they are globally available
// export { loadCombinationsFromStorage, saveCombinationsToStorage };