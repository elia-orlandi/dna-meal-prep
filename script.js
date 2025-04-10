document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const foodListContainer = document.getElementById('foodListContainer');
    const searchInput = document.getElementById('searchInput');
    const suggestionsContainer = document.getElementById('suggestionsContainer');
    const suggestionsList = document.getElementById('suggestionsList'); // Get the UL element
    const legendSwitcher = document.querySelector('.legend-switcher');
    const footerLegendDisplay = document.getElementById('footerLegendDisplay');

    // --- Application State ---
    let state = {
        allFoodData: [],
        currentlyDisplayedData: [], // Data shown in the main list
        activeLegendId: 'original',
        isDataLoaded: false,
        isCollapseListenerAttached: false,
        activeSuggestionIndex: -1 // For keyboard navigation
    };

    // --- Constants ---
    const MAX_SUGGESTIONS = 7; // Max suggestions to show

    // --- Legend Definitions (Unchanged) ---
    const legendDefs = {
        original: { /* ... */ },
        alternative: { /* ... */ }
    };
     // --- Populate legendDefs (same as before) ---
    legendDefs.original.ranges = [
        { min: 0, max: 15, colorClass: 'color-red', label: '0 - 15' },
        { min: 16, max: 35, colorClass: 'color-orange', label: '16 - 35' },
        { min: 36, max: 70, colorClass: 'color-yellow', label: '36 - 70' },
        { min: 71, max: 100, colorClass: 'color-green', label: '71 - 100' }
    ];
    legendDefs.alternative.ranges = [
        { min: 0, max: 19, colorClass: 'color-red', label: '0 - 19' },
        { min: 20, max: 34, colorClass: 'color-orange', label: '20 - 34' },
        { min: 35, max: 70, colorClass: 'color-yellow', label: '35 - 70' },
        { min: 71, max: 100, colorClass: 'color-green', label: '71 - 100' }
    ];


    // --- Utility Functions (getColorClassForValue, groupByCategory - Unchanged) ---
    function getColorClassForValue(value, legendId) {
        const legend = legendDefs[legendId];
        if (!legend) return '';
        const numericValue = Number(value);
        if (isNaN(numericValue)) return '';
        for (const range of legend.ranges) {
            if (numericValue >= range.min && numericValue <= range.max) {
                return range.colorClass;
            }
        }
        return '';
    }

    function groupByCategory(foodArray) {
         return foodArray.reduce((acc, item) => {
            const category = item.category || 'Senza Categoria';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});
    }

    // --- DOM Update Functions ---

    function updateFooterLegend(legendId) {
        const legend = legendDefs[legendId];
        if (!legend || !footerLegendDisplay) return;
        footerLegendDisplay.innerHTML = '';
        legend.ranges.forEach(range => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.className = `legend-color ${range.colorClass}`;
            li.appendChild(span);
            li.appendChild(document.createTextNode(range.label));
            footerLegendDisplay.appendChild(li);
        });
    }

    function renderFoodList(foodArray) {
        state.currentlyDisplayedData = foodArray;
        foodListContainer.innerHTML = '';

        if (foodArray.length === 0) {
            if (!state.isDataLoaded) {
                 foodListContainer.innerHTML = `<p class="loading-message">Caricamento dati...</p>`;
            } else {
                 // Avoid showing "no results" if the search input is empty after selecting a suggestion
                 const searchTerm = searchInput.value.trim();
                 foodListContainer.innerHTML = `<p class="no-results-message">Nessun alimento trovato${searchTerm ? ` per "${searchTerm}"` : ''}.</p>`;
            }
            return;
        }

        const groupedData = groupByCategory(foodArray);
        const sortedCategories = Object.keys(groupedData).sort();

        sortedCategories.forEach((category, index) => {
            const categorySection = createCategorySection(category, groupedData[category], index);
            foodListContainer.appendChild(categorySection);
        });

        setupCollapseListeners();
    }

     function createCategorySection(categoryName, items, index) {
        const section = document.createElement('section');
        section.className = 'category-section collapsed';
        const contentId = `category-content-${index}`;
        const header = document.createElement('button');
        header.className = 'category-header';
        header.setAttribute('aria-expanded', 'false');
        header.setAttribute('aria-controls', contentId);
        header.textContent = categoryName;
        section.appendChild(header);
        const itemsWrapper = document.createElement('div');
        itemsWrapper.className = 'food-item-wrapper';
        itemsWrapper.id = contentId;
        section.appendChild(itemsWrapper);
        items.sort((a, b) => a.name.localeCompare(b.name));
        items.forEach(item => {
            const itemElement = createFoodItemElement(item);
            itemsWrapper.appendChild(itemElement);
        });
        return section;
    }

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

    /**
     * Renders the autocomplete suggestions based on matches.
     * @param {Array<Object>} matches - Array of food items matching the search term.
     * @param {string} searchTerm - The current search term for highlighting.
     */
    function renderSuggestions(matches, searchTerm) {
        suggestionsList.innerHTML = ''; // Clear previous suggestions
        state.activeSuggestionIndex = -1; // Reset keyboard navigation index
        searchInput.removeAttribute('aria-activedescendant');

        if (matches.length === 0 || !searchTerm) {
            suggestionsContainer.classList.remove('visible');
            return;
        }

        const fragment = document.createDocumentFragment();
        matches.slice(0, MAX_SUGGESTIONS).forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            li.setAttribute('role', 'option');
            li.id = `suggestion-${index}`; // ID for aria-activedescendant
            li.dataset.foodName = item.name; // Store full name for selection

            // Highlight the matching part
            const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
            li.innerHTML = item.name.replace(regex, '<mark>$1</mark>');

            fragment.appendChild(li);
        });

        suggestionsList.appendChild(fragment);
        suggestionsContainer.classList.add('visible');
    }

    /** Hides the suggestions dropdown. */
    function hideSuggestions() {
        suggestionsContainer.classList.remove('visible');
        state.activeSuggestionIndex = -1;
         searchInput.removeAttribute('aria-activedescendant');
    }

    /**
     * Selects a suggestion, updates the input, hides suggestions, and filters the main list.
     * @param {string} foodName - The name of the food item selected.
     */
    function selectSuggestion(foodName) {
        searchInput.value = foodName; // Update input field
        hideSuggestions();

        // Filter the main list to show only the selected item(s)
        const exactMatches = state.allFoodData.filter(item =>
            item.name.toLowerCase() === foodName.toLowerCase()
        );
        renderFoodList(exactMatches.length > 0 ? exactMatches : []); // Show match or empty
    }

    /**
     * Updates the visual state (active class) of suggestion items for keyboard navigation.
     */
    function updateActiveSuggestion() {
        const items = suggestionsList.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            if (index === state.activeSuggestionIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' }); // Keep item visible
                searchInput.setAttribute('aria-activedescendant', item.id);
            } else {
                item.classList.remove('active');
            }
        });
    }


    // --- Event Handlers ---

    /** Handles input in the search field: fetches suggestions. */
    function handleSearchInput() {
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (!searchTerm) {
            renderSuggestions([], searchTerm);
            // Optionally: Show all items again when search is cleared
            // renderFoodList(state.allFoodData);
            return;
        }

        // Find matches (case-insensitive)
        const matches = state.allFoodData.filter(item =>
            item.name.toLowerCase().includes(searchTerm)
        ).sort((a,b) => a.name.localeCompare(b.name)); // Sort matches alphabetically

        renderSuggestions(matches, searchTerm);
    }

    /** Handles clicks on the suggestions list. */
    function handleSuggestionClick(event) {
        const targetItem = event.target.closest('.suggestion-item');
        if (targetItem && targetItem.dataset.foodName) {
            selectSuggestion(targetItem.dataset.foodName);
        }
    }

    /** Handles keyboard navigation within the search input and suggestions. */
    function handleSearchKeyDown(event) {
        const { key } = event;
        const items = suggestionsList.querySelectorAll('.suggestion-item');
        if (!suggestionsContainer.classList.contains('visible') || items.length === 0) {
             // If suggestions not visible, let Enter trigger a normal filter (optional)
            if (key === 'Enter') {
                 event.preventDefault(); // Prevent form submission if inside a form
                 handleSearchSubmit(); // Define this if needed
            }
            return;
        }


        switch (key) {
            case 'ArrowDown':
                event.preventDefault(); // Prevent cursor move
                state.activeSuggestionIndex = (state.activeSuggestionIndex + 1) % items.length;
                updateActiveSuggestion();
                break;
            case 'ArrowUp':
                event.preventDefault(); // Prevent cursor move
                state.activeSuggestionIndex = (state.activeSuggestionIndex - 1 + items.length) % items.length;
                updateActiveSuggestion();
                break;
            case 'Enter':
                event.preventDefault(); // Prevent form submission
                if (state.activeSuggestionIndex > -1 && items[state.activeSuggestionIndex]) {
                    selectSuggestion(items[state.activeSuggestionIndex].dataset.foodName);
                } else {
                     // Optional: If Enter pressed without active suggestion, filter by current input text
                     handleSearchSubmit();
                }
                break;
            case 'Escape':
                event.preventDefault();
                hideSuggestions();
                break;
        }
    }

    /** Handles filtering when Enter is pressed without an active suggestion (optional) */
     function handleSearchSubmit() {
        const searchTerm = searchInput.value.trim();
        hideSuggestions();
        if (searchTerm) {
            const matches = state.allFoodData.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            renderFoodList(matches);
        } else {
            renderFoodList(state.allFoodData); // Show all if search is empty
        }
    }


    /** Handles global clicks to hide suggestions when clicking outside. */
    function handleGlobalClick(event) {
        if (!searchInput.contains(event.target) && !suggestionsContainer.contains(event.target)) {
            hideSuggestions();
        }
    }

    // --- Collapse and Legend Handlers (Unchanged) ---
    function handleCollapse(event) {
        const header = event.target.closest('.category-header');
        if (!header) return;
        const section = header.closest('.category-section');
        if (!section) return;
        const isCollapsed = section.classList.contains('collapsed');
        section.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', !isCollapsed);
    }

    function handleLegendSwitch(event) {
        const button = event.target.closest('.legend-button[data-legend-id]');
        if (!button || button.classList.contains('active')) return;
        const selectedLegendId = button.dataset.legendId;
        state.activeLegendId = selectedLegendId;
        legendSwitcher.querySelectorAll('.legend-button').forEach(btn => {
            const isActive = btn.dataset.legendId === state.activeLegendId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', isActive);
        });
        renderFoodList(state.currentlyDisplayedData);
        updateFooterLegend(state.activeLegendId);
    }

    // --- Event Listener Setup ---
    function setupCollapseListeners() {
        if (state.isCollapseListenerAttached) return;
        foodListContainer.addEventListener('click', handleCollapse);
        state.isCollapseListenerAttached = true;
    }

    function setupEventListeners() {
        // Search and Suggestions
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keydown', handleSearchKeyDown);
        suggestionsContainer.addEventListener('click', handleSuggestionClick); // Use delegation
        document.addEventListener('click', handleGlobalClick); // Hide on click outside

        // Legend Switcher
        if (legendSwitcher) {
            legendSwitcher.addEventListener('click', handleLegendSwitch);
        }
        // Collapse listeners are attached after first render
    }

    // --- Initialization ---
    function initializeApp() {
        renderFoodList([]); // Show loading
        fetch('alimenti.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                state.allFoodData = data;
                state.isDataLoaded = true;
                renderFoodList(state.allFoodData);
                updateFooterLegend(state.activeLegendId);
            })
            .catch(error => {
                console.error("Errore nel caricamento del file JSON:", error);
                foodListContainer.innerHTML = `<p class="error-message">Impossibile caricare i dati. Controlla la console.</p>`;
                state.isDataLoaded = true; // Still "loaded" even if error
            })
            .finally(() => {
                setupEventListeners(); // Setup listeners AFTER fetch attempt
            });
    }

    // --- Start ---
    initializeApp();
});