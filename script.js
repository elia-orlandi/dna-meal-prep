document.addEventListener('DOMContentLoaded', () => {
    const foodListContainer = document.getElementById('foodListContainer');
    const searchInput = document.getElementById('searchInput');
    let allFoodData = []; // To store all data fetched from JSON

    // --- Fetch data from JSON file ---
    fetch('alimenti.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            allFoodData = data;
            displayFood(allFoodData); // Initial display
            setupCollapseListeners(); // Add listeners after initial display
        })
        .catch(error => {
            console.error("Errore nel caricamento del file JSON:", error);
            foodListContainer.innerHTML = `<p class="error-message">Impossibile caricare i dati degli alimenti. Controlla la console per i dettagli.</p>`;
        });

    // --- Function to determine color based on value ---
    function getValueColorClass(value) {
        if (value >= 0 && value <= 15) return 'color-red';
        if (value >= 16 && value <= 35) return 'color-orange';
        if (value >= 36 && value <= 70) return 'color-yellow';
        if (value >= 71 && value <= 100) return 'color-green';
        return '';
    }

    // --- Function to display food items ---
    function displayFood(foodArray) {
        foodListContainer.innerHTML = ''; // Clear previous content

        if (foodArray.length === 0 && allFoodData.length > 0) { // Check if filtering resulted in no matches
             foodListContainer.innerHTML = `<p class="no-results-message">Nessun alimento trovato per "${searchInput.value}".</p>`;
             return;
        }
         if (foodArray.length === 0 && allFoodData.length === 0) { // Initial loading or fetch error state
            foodListContainer.innerHTML = `<p class="loading-message">Caricamento dati...</p>`; // Or show error if fetch failed earlier
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
            // Start collapsed (we'll remove this class on click)
            categorySection.className = 'category-section collapsed';
            const categoryId = `category-content-${index}`; // Unique ID for ARIA

            // Create Button Header for Accessibility and Interaction
            const categoryHeader = document.createElement('button');
            categoryHeader.className = 'category-header';
            categoryHeader.setAttribute('aria-expanded', 'false'); // Start collapsed
            categoryHeader.setAttribute('aria-controls', categoryId);
            categoryHeader.textContent = category;
            categorySection.appendChild(categoryHeader);

            // Wrapper for food items (for smooth animation)
            const itemsWrapper = document.createElement('div');
            itemsWrapper.className = 'food-item-wrapper';
            itemsWrapper.id = categoryId; // ID for ARIA control
            categorySection.appendChild(itemsWrapper); // Append wrapper AFTER header

            // Sort items within the category alphabetically by name
            groupedByCategory[category].sort((a, b) => a.name.localeCompare(b.name));

            // Add items to the wrapper
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
                bar.className = `value-bar ${getValueColorClass(item.value)}`;
                bar.style.width = `${item.value}%`;

                barContainer.appendChild(bar);

                itemDiv.appendChild(nameSpan);
                itemDiv.appendChild(valueSpan);
                itemDiv.appendChild(barContainer);

                itemsWrapper.appendChild(itemDiv); // Add item to the wrapper
            });

            foodListContainer.appendChild(categorySection);
        });
    }

    // --- Function to set up collapse listeners ---
    function setupCollapseListeners() {
        // Use event delegation on the container for efficiency
        foodListContainer.addEventListener('click', (event) => {
            // Check if the clicked element is a category header button
            const header = event.target.closest('.category-header');
            if (!header) return; // Exit if click wasn't on a header

            const section = header.closest('.category-section');
            if (!section) return; // Should always find a section, but good practice

            const isCollapsed = section.classList.contains('collapsed');

            // Toggle the class on the section
            section.classList.toggle('collapsed');

            // Update ARIA attribute on the button
            header.setAttribute('aria-expanded', !isCollapsed);
        });
    }


    // --- Event Listener for Search Input ---
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase().trim();

        const filteredFood = allFoodData.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm)
        );

        displayFood(filteredFood);
        // Note: Listeners are managed by event delegation, no need to re-add them
    });

});