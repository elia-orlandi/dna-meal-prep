document.addEventListener('DOMContentLoaded', () => {
    const foodListContainer = document.getElementById('foodListContainer');
    const searchInput = document.getElementById('searchInput');
    const legendSwitcher = document.querySelector('.legend-switcher');
    const footerLegendDisplay = document.getElementById('footerLegendDisplay');

    let allFoodData = []; // Store all data
    let currentlyDisplayedData = []; // Store currently visible data (can be all or filtered)

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

    let activeLegendId = 'original'; // Default legend

    // --- Function to get color class based on value and active legend ---
    function getColorClassForValue(value, legendId) {
        const legend = legendDefs[legendId];
        if (!legend) return ''; // Fallback

        for (const range of legend.ranges) {
            // Ensure value is treated as a number
            const numericValue = Number(value);
            if (isNaN(numericValue)) return ''; // Handle non-numeric values gracefully

            if (numericValue >= range.min && numericValue <= range.max) {
                return range.colorClass;
            }
        }
        return ''; // Fallback if value is outside defined ranges
    }

    // --- Function to update the legend display in the footer ---
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

    // --- Function to display food items ---
    function displayFood(foodArray) {
        currentlyDisplayedData = foodArray; // Update the currently displayed data
        foodListContainer.innerHTML = ''; // Clear previous content

        // Handle empty states (loading, no results)
        if (foodArray.length === 0) {
            if (allFoodData.length === 0) {
                 foodListContainer.innerHTML = `<p class="loading-message">Caricamento dati...</p>`;
            } else {
                 foodListContainer.innerHTML = `<p class="no-results-message">Nessun alimento trovato per "${searchInput.value}".</p>`;
            }
            return;
        }

        // Group food items by category
        const groupedByCategory = foodArray.reduce((acc, item) => {
            const category = item.category || 'Senza Categoria';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});

        // Sort categories alphabetically
        const sortedCategories = Object.keys(groupedByCategory).sort();

        // Create HTML for each category and its items
        sortedCategories.forEach((category, index) => {
            const categorySection = document.createElement('section');
            // Keep existing collapsed state logic if needed, or start expanded
            categorySection.className = 'category-section collapsed'; // Keep default collapsed
            const categoryId = `category-content-${index}`;

            const categoryHeader = document.createElement('button');
            categoryHeader.className = 'category-header';
            categoryHeader.setAttribute('aria-expanded', 'false');
            categoryHeader.setAttribute('aria-controls', categoryId);
            categoryHeader.textContent = category;
            categorySection.appendChild(categoryHeader);

            const itemsWrapper = document.createElement('div');
            itemsWrapper.className = 'food-item-wrapper';
            itemsWrapper.id = categoryId;
            categorySection.appendChild(itemsWrapper);

            groupedByCategory[category].sort((a, b) => a.name.localeCompare(b.name));

            groupedByCategory[category].forEach(item => {
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
                // *** Use the active legend to determine color ***
                bar.className = `value-bar ${getColorClassForValue(item.value, activeLegendId)}`;
                 // Set width based on value (ensure it's a number, max 100)
                const numericValue = Number(item.value);
                const barWidth = isNaN(numericValue) ? 0 : Math.min(Math.max(numericValue, 0), 100);
                bar.style.width = `${barWidth}%`;


                barContainer.appendChild(bar);
                itemDiv.appendChild(nameSpan);
                itemDiv.appendChild(valueSpan);
                itemDiv.appendChild(barContainer);
                itemsWrapper.appendChild(itemDiv);
            });
            foodListContainer.appendChild(categorySection);
        });
         // Ensure collapse listeners are set up (using delegation, safe to call multiple times)
        setupCollapseListeners();
    }

    // --- Function to set up category collapse listeners (using event delegation) ---
    function setupCollapseListeners() {
        // Check if listener already exists to avoid duplicates (optional but good practice)
        if (foodListContainer.dataset.collapseListenerAttached) return;

        foodListContainer.addEventListener('click', (event) => {
            const header = event.target.closest('.category-header');
            if (!header) return;

            const section = header.closest('.category-section');
            if (!section) return;

            const isCollapsed = section.classList.contains('collapsed');
            section.classList.toggle('collapsed');
            header.setAttribute('aria-expanded', !isCollapsed);
        });
        foodListContainer.dataset.collapseListenerAttached = 'true'; // Mark as attached
    }

    // --- Fetch Initial Data ---
    fetch('alimenti.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            allFoodData = data;
            displayFood(allFoodData); // Initial display with default legend
            updateFooterLegend(activeLegendId); // Display default footer legend
        })
        .catch(error => {
            console.error("Errore nel caricamento del file JSON:", error);
            foodListContainer.innerHTML = `<p class="error-message">Impossibile caricare i dati degli alimenti. Controlla la console per i dettagli.</p>`;
        });

    // --- Event Listener for Search Input ---
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredFood = allFoodData.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm)
        );
        displayFood(filteredFood); // Redisplay filtered data using the active legend
    });

    // --- Event Listener for Legend Switcher ---
    if (legendSwitcher) {
        legendSwitcher.addEventListener('click', (event) => {
            const button = event.target.closest('.legend-button[data-legend-id]');
            if (!button || button.classList.contains('active')) return; // Exit if click wasn't on an inactive legend button

            const selectedLegendId = button.dataset.legendId;

            // Update active state
            activeLegendId = selectedLegendId;

            // Update button visual state and ARIA attributes
            legendSwitcher.querySelectorAll('.legend-button').forEach(btn => {
                const isActive = btn.dataset.legendId === activeLegendId;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-checked', isActive);
            });

            // Re-render the list with the new legend colors
            displayFood(currentlyDisplayedData); // Use the data currently shown (filtered or all)

            // Update the footer legend display
            updateFooterLegend(activeLegendId);

        });
    }
});