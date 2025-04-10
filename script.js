document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const foodListContainer = document.getElementById('foodListContainer');
    const searchInput = document.getElementById('searchInput');
    const legendSwitcher = document.querySelector('.legend-switcher');
    const footerLegendDisplay = document.getElementById('footerLegendDisplay');

    // --- Application State ---
    let state = {
        allFoodData: [],
        currentlyDisplayedData: [],
        activeLegendId: 'original',
        isDataLoaded: false,
        isCollapseListenerAttached: false
    };

    // --- Legend Definitions ---
    const legendDefs = {
        original: {
            id: 'original',
            name: 'Standard',
            ranges: [
                { min: 0, max: 15, colorClass: 'color-red', label: '0 - 15' },
                { min: 16, max: 35, colorClass: 'color-orange', label: '16 - 35' },
                { min: 36, max: 70, colorClass: 'color-yellow', label: '36 - 70' },
                { min: 71, max: 100, colorClass: 'color-green', label: '71 - 100' }
            ]
        },
        alternative: {
            id: 'alternative',
            name: 'Alternativa',
            ranges: [
                { min: 0, max: 19, colorClass: 'color-red', label: '0 - 19' },
                { min: 20, max: 34, colorClass: 'color-orange', label: '20 - 34' },
                { min: 35, max: 70, colorClass: 'color-yellow', label: '35 - 70' },
                { min: 71, max: 100, colorClass: 'color-green', label: '71 - 100' }
            ]
        }
    };

    // --- Utility Functions ---

    /**
     * Gets the appropriate CSS color class for a value based on the active legend.
     * @param {number|string} value - The food item's value.
     * @param {string} legendId - The ID of the currently active legend ('original' or 'alternative').
     * @returns {string} The CSS color class name.
     */
    function getColorClassForValue(value, legendId) {
        const legend = legendDefs[legendId];
        if (!legend) return '';

        const numericValue = Number(value);
        if (isNaN(numericValue)) return ''; // Handle non-numeric values

        for (const range of legend.ranges) {
            if (numericValue >= range.min && numericValue <= range.max) {
                return range.colorClass;
            }
        }
        return ''; // Fallback
    }

    /**
     * Groups an array of food items by their category.
     * @param {Array<Object>} foodArray - The array of food items.
     * @returns {Object} An object where keys are category names and values are arrays of food items.
     */
    function groupByCategory(foodArray) {
         return foodArray.reduce((acc, item) => {
            const category = item.category || 'Senza Categoria'; // Fallback category
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});
    }

    // --- DOM Update Functions ---

    /**
     * Updates the legend display in the footer based on the selected legend ID.
     * @param {string} legendId - The ID of the legend to display.
     */
    function updateFooterLegend(legendId) {
        const legend = legendDefs[legendId];
        if (!legend || !footerLegendDisplay) return;

        footerLegendDisplay.innerHTML = ''; // Clear existing legend

        legend.ranges.forEach(range => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.className = `legend-color ${range.colorClass}`;
            li.appendChild(span);
            li.appendChild(document.createTextNode(range.label));
            footerLegendDisplay.appendChild(li);
        });
    }

    /**
     * Renders the list of food items in the DOM, grouped by category.
     * @param {Array<Object>} foodArray - The array of food items to display.
     */
    function renderFoodList(foodArray) {
        state.currentlyDisplayedData = foodArray; // Update state
        foodListContainer.innerHTML = ''; // Clear previous content

        // Handle empty states
        if (foodArray.length === 0) {
            if (!state.isDataLoaded) { // Still loading?
                 foodListContainer.innerHTML = `<p class="loading-message">Caricamento dati...</p>`;
            } else { // Loaded, but filter returned no results
                 foodListContainer.innerHTML = `<p class="no-results-message">Nessun alimento trovato per "${searchInput.value}".</p>`;
            }
            return;
        }

        const groupedData = groupByCategory(foodArray);
        const sortedCategories = Object.keys(groupedData).sort();

        // Create and append category sections
        sortedCategories.forEach((category, index) => {
            const categorySection = createCategorySection(category, groupedData[category], index);
            foodListContainer.appendChild(categorySection);
        });

        // Ensure collapse listeners are attached (only needs to be done once)
        setupCollapseListeners();
    }

     /**
     * Creates a single category section element with its header and items.
     * @param {string} categoryName - The name of the category.
     * @param {Array<Object>} items - Array of food items in this category.
     * @param {number} index - The index of the category (for unique IDs).
     * @returns {HTMLElement} The created category section element.
     */
    function createCategorySection(categoryName, items, index) {
        const section = document.createElement('section');
        section.className = 'category-section collapsed'; // Default to collapsed
        const contentId = `category-content-${index}`;

        // Header (Button)
        const header = document.createElement('button');
        header.className = 'category-header';
        header.setAttribute('aria-expanded', 'false');
        header.setAttribute('aria-controls', contentId);
        header.textContent = categoryName;
        section.appendChild(header);

        // Items Wrapper
        const itemsWrapper = document.createElement('div');
        itemsWrapper.className = 'food-item-wrapper';
        itemsWrapper.id = contentId;
        section.appendChild(itemsWrapper);

        // Sort items within category
        items.sort((a, b) => a.name.localeCompare(b.name));

        // Create and append item elements
        items.forEach(item => {
            const itemElement = createFoodItemElement(item);
            itemsWrapper.appendChild(itemElement);
        });

        return section;
    }

    /**
     * Creates a single food item element (the row with name, value, and bar).
     * @param {Object} item - The food item data.
     * @returns {HTMLElement} The created food item div element.
     */
    function createFoodItemElement(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'food-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'food-name';
        nameSpan.textContent = item.name;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'food-value';
        valueSpan.textContent = item.value;

        const barContainer = document.createElement('div');
        barContainer.className = 'value-bar-container';

        const bar = document.createElement('div');
        bar.className = `value-bar ${getColorClassForValue(item.value, state.activeLegendId)}`;

        const numericValue = Number(item.value);
        const barWidth = isNaN(numericValue) ? 0 : Math.min(Math.max(numericValue, 0), 100);
        bar.style.width = `${barWidth}%`;

        barContainer.appendChild(bar);
        itemDiv.appendChild(nameSpan);
        itemDiv.appendChild(valueSpan);
        itemDiv.appendChild(barContainer);

        return itemDiv;
    }

    // --- Event Handlers ---

    /**
     * Handles input events on the search field, filtering and re-rendering the list.
     */
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredFood = state.allFoodData.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm) // Optional: search category too
        );
        renderFoodList(filteredFood);
    }

    /**
     * Handles clicks within the food list container, specifically for toggling category collapse.
     * Uses event delegation.
     * @param {Event} event - The click event object.
     */
    function handleCollapse(event) {
        const header = event.target.closest('.category-header');
        if (!header) return; // Click wasn't on a header

        const section = header.closest('.category-section');
        if (!section) return;

        const isCollapsed = section.classList.contains('collapsed');
        section.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', !isCollapsed);
    }

    /**
     * Handles clicks on the legend switcher buttons.
     * @param {Event} event - The click event object.
     */
    function handleLegendSwitch(event) {
        const button = event.target.closest('.legend-button[data-legend-id]');
        // Exit if click wasn't on an *inactive* legend button
        if (!button || button.classList.contains('active')) return;

        const selectedLegendId = button.dataset.legendId;

        // Update state
        state.activeLegendId = selectedLegendId;

        // Update button visuals and ARIA states
        legendSwitcher.querySelectorAll('.legend-button').forEach(btn => {
            const isActive = btn.dataset.legendId === state.activeLegendId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', isActive);
        });

        // Re-render the currently visible list with new colors
        renderFoodList(state.currentlyDisplayedData);

        // Update the footer legend text
        updateFooterLegend(state.activeLegendId);
    }

    // --- Event Listener Setup ---

    /** Sets up the category collapse listener using event delegation. */
    function setupCollapseListeners() {
        // Prevent adding multiple listeners if called again
        if (state.isCollapseListenerAttached) return;

        foodListContainer.addEventListener('click', handleCollapse);
        state.isCollapseListenerAttached = true;
    }

    /** Sets up all necessary event listeners. */
    function setupEventListeners() {
        searchInput.addEventListener('input', handleSearch);
        if (legendSwitcher) {
            legendSwitcher.addEventListener('click', handleLegendSwitch);
        }
        // Collapse listeners are set up *after* the first render in renderFoodList
    }

    // --- Initialization ---

    /** Fetches data and initializes the application. */
    function initializeApp() {
        renderFoodList([]); // Show loading message initially
        fetch('alimenti.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                state.allFoodData = data;
                state.isDataLoaded = true;
                renderFoodList(state.allFoodData); // Render initial full list
                updateFooterLegend(state.activeLegendId); // Show default footer legend
            })
            .catch(error => {
                console.error("Errore nel caricamento del file JSON:", error);
                foodListContainer.innerHTML = `<p class="error-message">Impossibile caricare i dati. Controlla la console.</p>`;
                state.isDataLoaded = true; // Mark as loaded even if error occurred
            })
            .finally(() => {
                 // Set up listeners regardless of fetch success/failure
                setupEventListeners();
            });
    }

    // --- Start the application ---
    initializeApp();

});