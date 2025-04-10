// script.js - Main script for food list display

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const foodListContainer = document.getElementById('foodListContainer');
    const searchInput = document.getElementById('searchInput');
    const suggestionsContainer = document.getElementById('suggestionsContainer');
    const suggestionsList = document.getElementById('suggestionsList');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const legendSwitcher = document.querySelector('.legend-switcher');
    const footerLegendDisplay = document.getElementById('footerLegendDisplay');
    // --> References for Combination Elements
    const combinationFormModal = document.getElementById('combinationFormModal');
    const combinationsListContainer = document.getElementById('combinationsListContainer');

    // --- Application State ---
    let state = {
        allFoodData: [],
        currentlyDisplayedData: [],
        activeLegendId: 'original',
        isDataLoaded: false,
        isCollapseListenerAttached: false,
        activeSuggestionIndex: -1,
        searchDebounceTimeout: null
    };

    // --- Constants ---
    const MAX_SUGGESTIONS = 7;
    const SEARCH_DEBOUNCE_DELAY = 250;

    // --- Legend Definitions ---
    const legendDefs = {
        original: { id: 'original', name: 'Standard', ranges: [] },
        alternative: { id: 'alternative', name: 'Alternativa', ranges: [] }
    };
    legendDefs.original.ranges = [ { min: 0, max: 15, colorClass: 'color-red', label: '0 - 15' }, { min: 16, max: 35, colorClass: 'color-orange', label: '16 - 35' }, { min: 36, max: 70, colorClass: 'color-yellow', label: '36 - 70' }, { min: 71, max: 100, colorClass: 'color-green', label: '71 - 100' } ];
    legendDefs.alternative.ranges = [ { min: 0, max: 19, colorClass: 'color-red', label: '0 - 19' }, { min: 20, max: 34, colorClass: 'color-orange', label: '20 - 34' }, { min: 35, max: 70, colorClass: 'color-yellow', label: '35 - 70' }, { min: 71, max: 100, colorClass: 'color-green', label: '71 - 100' } ];

    // --- Utility Functions ---
    function getColorClassForValue(value, legendId) { const legend = legendDefs[legendId]; if (!legend) return ''; const numericValue = Number(value); if (isNaN(numericValue)) return ''; for (const range of legend.ranges) { if (numericValue >= range.min && numericValue <= range.max) { return range.colorClass; } } return ''; };
    function groupByCategory(foodArray) { return foodArray.reduce((acc, item) => { const category = item.category || 'Senza Categoria'; if (!acc[category]) { acc[category] = []; } acc[category].push(item); return acc; }, {}); };

    // --- DOM Update Functions (Food List Specific) ---
    function updateFooterLegend(legendId) { const legend = legendDefs[legendId]; if (!legend || !footerLegendDisplay) { console.warn("Footer legend display element not found."); return; } footerLegendDisplay.innerHTML = ''; legend.ranges.forEach(range => { const li = document.createElement('li'); const span = document.createElement('span'); span.className = `legend-color ${range.colorClass}`; li.appendChild(span); li.appendChild(document.createTextNode(range.label)); footerLegendDisplay.appendChild(li); }); };

    /** Renders the main food list. */
    function renderFoodList(foodArray, isSearchResult = false) {
        state.currentlyDisplayedData = foodArray;
        if (!foodListContainer) { console.error("Food list container element not found."); return; }
        foodListContainer.innerHTML = '';

        if (!state.isDataLoaded) { foodListContainer.innerHTML = `<p class="loading-message">Caricamento dati alimenti...</p>`; return; }
        if (state.allFoodData.length === 0 && state.isDataLoaded) { foodListContainer.innerHTML = `<p class="empty-data-message">Nessun dato alimentare disponibile.</p>`; return; } // Different message if JSON was empty
        if (foodArray.length === 0) { const searchTerm = searchInput ? searchInput.value.trim() : ""; foodListContainer.innerHTML = `<p class="no-results-message">Nessun alimento trovato${searchTerm ? ` per "${searchTerm}"` : ''}.</p>`; return; }

        const groupedData = groupByCategory(foodArray);
        const sortedCategories = Object.keys(groupedData).sort();

        sortedCategories.forEach((category, index) => {
            const categorySection = createCategorySection(category, groupedData[category], index);
            foodListContainer.appendChild(categorySection);

            const shouldExpand = isSearchResult || sortedCategories.length === 1;
            if (shouldExpand) {
                categorySection.classList.remove('collapsed');
                const header = categorySection.querySelector('.category-header');
                if (header) header.setAttribute('aria-expanded', 'true');
                const wrapper = categorySection.querySelector('.food-item-wrapper');
                if(wrapper) { wrapper.style.transition = 'none'; requestAnimationFrame(() => wrapper.style.transition = ''); } // Disable/re-enable transition for instant open
            }
        });
        setupCollapseListeners();
    }

     function createCategorySection(categoryName, items, index) { const section = document.createElement('section'); section.className = 'category-section collapsed'; const contentId = `category-content-${index}`; const header = document.createElement('button'); header.className = 'category-header'; header.setAttribute('aria-expanded', 'false'); header.setAttribute('aria-controls', contentId); header.textContent = categoryName; section.appendChild(header); const itemsWrapper = document.createElement('div'); itemsWrapper.className = 'food-item-wrapper'; itemsWrapper.id = contentId; section.appendChild(itemsWrapper); items.sort((a, b) => a.name.localeCompare(b.name)); items.forEach(item => { const itemElement = createFoodItemElement(item); itemsWrapper.appendChild(itemElement); }); return section; };
     function createFoodItemElement(item) { const itemDiv = document.createElement('div'); itemDiv.className = 'food-item'; const nameSpan = document.createElement('span'); nameSpan.className = 'food-name'; nameSpan.textContent = item.name; const valueSpan = document.createElement('span'); valueSpan.className = 'food-value'; valueSpan.textContent = item.value; const barContainer = document.createElement('div'); barContainer.className = 'value-bar-container'; const bar = document.createElement('div'); bar.className = `value-bar ${getColorClassForValue(item.value, state.activeLegendId)}`; const numericValue = Number(item.value); const barWidth = isNaN(numericValue) ? 0 : Math.min(Math.max(numericValue, 0), 100); bar.style.width = `${barWidth}%`; barContainer.appendChild(bar); itemDiv.appendChild(nameSpan); itemDiv.appendChild(valueSpan); itemDiv.appendChild(barContainer); return itemDiv; };

    // --- Suggestion Functions (Slightly Modified selectSuggestion) ---
    function renderSuggestions(matches, searchTerm) { if (!suggestionsList) { console.error("#suggestionsList not found."); return; } suggestionsList.innerHTML = ''; state.activeSuggestionIndex = -1; if (searchInput) searchInput.removeAttribute('aria-activedescendant'); if (matches.length === 0 || !searchTerm) { if (suggestionsContainer) suggestionsContainer.classList.remove('visible'); return; } const fragment = document.createDocumentFragment(); matches.slice(0, MAX_SUGGESTIONS).forEach((item, index) => { const li = document.createElement('li'); li.className = 'suggestion-item'; li.setAttribute('role', 'option'); li.id = `suggestion-${index}`; li.dataset.foodName = item.name; const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'); li.innerHTML = item.name.replace(regex, '<mark>$1</mark>'); fragment.appendChild(li); }); suggestionsList.appendChild(fragment); if (suggestionsContainer) suggestionsContainer.classList.add('visible'); };
    function hideSuggestions() { if (suggestionsContainer) suggestionsContainer.classList.remove('visible'); state.activeSuggestionIndex = -1; if (searchInput) searchInput.removeAttribute('aria-activedescendant'); };
    function selectSuggestion(foodName) {
        if (searchInput) searchInput.value = foodName;
        hideSuggestions();
        toggleClearButton();
        const exactMatches = state.allFoodData.filter(item => item.name.toLowerCase() === foodName.toLowerCase() );
        // Filter MAIN food list when selecting from autocomplete
        renderFoodList(exactMatches.length > 0 ? exactMatches : [], true);
    };
    function updateActiveSuggestion() { if (!suggestionsList) return; const items = suggestionsList.querySelectorAll('.suggestion-item'); items.forEach((item, index) => { if (index === state.activeSuggestionIndex) { item.classList.add('active'); item.scrollIntoView({ block: 'nearest' }); if (searchInput) searchInput.setAttribute('aria-activedescendant', item.id); } else { item.classList.remove('active'); } }); };
    function toggleClearButton() { if (!clearSearchBtn || !searchInput) return; clearSearchBtn.hidden = searchInput.value.trim() === ''; }

    // --- Event Handlers (Food List Specific) ---
    function performSearch() { if (!searchInput) return; const searchTerm = searchInput.value.toLowerCase().trim(); toggleClearButton(); if (!searchTerm) { renderSuggestions([], searchTerm); renderFoodList(state.allFoodData, false); return; } const matches = state.allFoodData.filter(item => item.name.toLowerCase().includes(searchTerm) ).sort((a, b) => a.name.localeCompare(b.name)); renderSuggestions(matches, searchTerm); }
    function handleDebouncedSearchInput() { clearTimeout(state.searchDebounceTimeout); state.searchDebounceTimeout = setTimeout(performSearch, SEARCH_DEBOUNCE_DELAY); }
    function handleSuggestionClick(event) { const targetItem = event.target.closest('.suggestion-item'); if (targetItem && targetItem.dataset.foodName) { selectSuggestion(targetItem.dataset.foodName); } };
    function handleSearchKeyDown(event) { if (!suggestionsList || !suggestionsContainer || !searchInput) return; const { key } = event; const items = suggestionsList.querySelectorAll('.suggestion-item'); if (!suggestionsContainer.classList.contains('visible') || items.length === 0) { if (key === 'Enter') { event.preventDefault(); handleSearchSubmit(); } return; } switch (key) { case 'ArrowDown': event.preventDefault(); state.activeSuggestionIndex = (state.activeSuggestionIndex + 1) % items.length; updateActiveSuggestion(); break; case 'ArrowUp': event.preventDefault(); state.activeSuggestionIndex = (state.activeSuggestionIndex - 1 + items.length) % items.length; updateActiveSuggestion(); break; case 'Enter': event.preventDefault(); if (state.activeSuggestionIndex > -1 && items[state.activeSuggestionIndex]) { selectSuggestion(items[state.activeSuggestionIndex].dataset.foodName); } else { handleSearchSubmit(); } break; case 'Escape': event.preventDefault(); hideSuggestions(); break; } };
    function handleSearchSubmit() { if (!searchInput) return; const searchTerm = searchInput.value.trim(); hideSuggestions(); toggleClearButton(); if (searchTerm) { const matches = state.allFoodData.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) ); renderFoodList(matches, true); } else { renderFoodList(state.allFoodData, false); } };
    function handleGlobalClick(event) { if (!searchInput || !suggestionsContainer || !clearSearchBtn) return; if (!searchInput.contains(event.target) && !suggestionsContainer.contains(event.target) && !clearSearchBtn.contains(event.target)) { hideSuggestions(); } };
    function handleCollapse(event) { const header = event.target.closest('.category-header'); if (!header) return; const section = header.closest('.category-section'); if (!section) return; const isCollapsed = section.classList.contains('collapsed'); const wrapper = section.querySelector('.food-item-wrapper'); if (wrapper && !isCollapsed) { section.classList.add('collapsing'); wrapper.addEventListener('transitionend', () => { section.classList.remove('collapsing'); }, { once: true }); } else if (wrapper && isCollapsed) { section.classList.remove('collapsing'); } section.classList.toggle('collapsed'); header.setAttribute('aria-expanded', !isCollapsed); };
    function handleLegendSwitch(event) { const button = event.target.closest('.legend-button[data-legend-id]'); if (!button || button.classList.contains('active')) return; const selectedLegendId = button.dataset.legendId; state.activeLegendId = selectedLegendId; if (legendSwitcher) { legendSwitcher.querySelectorAll('.legend-button').forEach(btn => { const isActive = btn.dataset.legendId === state.activeLegendId; btn.classList.toggle('active', isActive); btn.setAttribute('aria-checked', isActive); }); } const isCurrentlySearchResult = searchInput ? searchInput.value.trim() !== '' : false; renderFoodList(state.currentlyDisplayedData, isCurrentlySearchResult); updateFooterLegend(state.activeLegendId); };
    function handleClearSearch() { if (!searchInput) return; searchInput.value = ''; toggleClearButton(); hideSuggestions(); searchInput.focus(); renderFoodList(state.allFoodData, false); };

    // --- Event Listener Setup ---
    function setupCollapseListeners() { if (state.isCollapseListenerAttached || !foodListContainer) return; foodListContainer.addEventListener('click', handleCollapse); state.isCollapseListenerAttached = true; };
    function setupEventListeners() {
        if (searchInput) { searchInput.addEventListener('input', handleDebouncedSearchInput); searchInput.addEventListener('keydown', handleSearchKeyDown); }
        else { console.warn("Search input not found."); }
        if (clearSearchBtn) { clearSearchBtn.addEventListener('click', handleClearSearch); }
        else { console.warn("Clear search button not found."); }
        if (suggestionsContainer) { suggestionsContainer.addEventListener('click', handleSuggestionClick); }
        else { console.warn("Suggestions container not found."); }
        document.addEventListener('click', handleGlobalClick);
        if (legendSwitcher) { legendSwitcher.addEventListener('click', handleLegendSwitch); }
        else { console.warn("Legend switcher not found."); }
        // Collapse listeners set up after first render
    };

    // --- Initialization ---
    function initializeApp() {
        renderFoodList([]); // Show loading for food list
        // Placeholder for combinations loading message
        if(combinationsListContainer) combinationsListContainer.innerHTML = '<p>Caricamento combinazioni...</p>';

        fetch('alimenti.json')
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return response.json(); })
            .then(data => {
                state.allFoodData = data;
                state.isDataLoaded = true; // Mark food data as loaded
                renderFoodList(state.allFoodData, false); // Render food list
                updateFooterLegend(state.activeLegendId);

                // --- Initialize Combinations Module ---
                // Check if the init function exists (script loaded)
                if (typeof initCombinations === 'function') {
                    initCombinations(combinationFormModal, combinationsListContainer, state.allFoodData);
                } else {
                    console.error("initCombinations function not found. Ensure combinations.js is loaded correctly.");
                     if(combinationsListContainer) combinationsListContainer.innerHTML = '<p class="error-message">Errore caricamento modulo combinazioni.</p>';
                }
                // -------------------------------------

            })
            .catch(error => {
                console.error("Errore nel caricamento del file JSON:", error);
                if (foodListContainer) { foodListContainer.innerHTML = `<p class="error-message">Impossibile caricare dati alimenti.</p>`; }
                 if(combinationsListContainer) combinationsListContainer.innerHTML = '<p class="error-message">Impossibile caricare modulo combinazioni (dati alimenti mancanti).</p>';
                state.isDataLoaded = true; // Still "loaded" to prevent infinite loading message
            })
            .finally(() => {
                setupEventListeners(); // Setup main listeners AFTER fetch attempt
                toggleClearButton();
            });
    };

    // --- Start ---
    initializeApp();
});