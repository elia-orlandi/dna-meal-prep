// combination-ui.js - Creates HTML elements for combinations view and form

// --- Block Type Definitions ---
const blockTypeLabels = {
    'una_scelta': "Una scelta tra",
    'contorni': "più contorni di",
    'piu_una_scelta': "più una scelta tra",
    'secondo': "più un secondo a scelta tra",
    'due_scelte': "Due scelte tra"
};

let _allFoodItemsCache = []; // Cache for food items passed from main script
let _categoriesCache = []; // Cache for configurable categories

/**
 * Sets the food items data cache used by UI functions.
 * @param {Array<Object>} foodItems - The complete list of food items.
 */
function setFoodItemCache(foodItems) {
    _allFoodItemsCache = foodItems || [];
    // Sort cache alphabetically for consistent dropdowns
    _allFoodItemsCache.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sets the configurable categories cache.
 * @param {Array<string>} categories - Array of category names/codes.
 */
function setCategoriesCache(categories) {
    _categoriesCache = categories || ['A', 'B', 'C', 'D']; // Default if not provided
}

/**
 * Creates the HTML element to display a single combination option.
 * @param {Object} combination - The combination data object.
 * @param {Function} onDelete - Callback function when the delete button is clicked (passes combination.id).
 * @param {Function} onEdit - Callback function when the edit button is clicked (passes combination object).
 * @returns {HTMLElement} A list item element representing the combination.
 */
function createCombinationViewElement(combination, onDelete, onEdit) {
    const li = document.createElement('li');
    li.className = `combination-view-item type-${combination.type}`;
    li.dataset.id = combination.id;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'combination-content';

    if (combination.type === 'structured') {
        combination.blocks.forEach((block, index) => {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'block-view';

            const blockLabel = document.createElement('strong');
            // Adjust label for subsequent blocks
            let labelText = blockTypeLabels[block.blockType] || 'Blocco Sconosciuto';
            if (index > 0 && !labelText.startsWith('più') && !labelText.startsWith('Due')) {
                 // Heuristic to add "più" - might need refinement based on exact block names
                 if (block.blockType === 'una_scelta') labelText = blockTypeLabels['piu_una_scelta'];
                 else if (block.blockType === 'secondo') labelText = blockTypeLabels['secondo']; // 'secondo' already implies 'più'
                 // else labelText = `più ${labelText.toLowerCase()}`; // Generic fallback
            }
            blockLabel.textContent = `${labelText}: `;
            blockDiv.appendChild(blockLabel);

            const foodListSpan = document.createElement('span');
             // Handle potential empty selectedFoods array gracefully
             foodListSpan.textContent = block.selectedFoods && block.selectedFoods.length > 0
                ? block.selectedFoods.join(' / ')
                : '(Nessun alimento selezionato)';
            blockDiv.appendChild(foodListSpan);

            contentDiv.appendChild(blockDiv);
        });
    } else { // type === 'custom'
        const descriptionP = document.createElement('p');
        descriptionP.className = 'custom-description';
        descriptionP.textContent = combination.description || '(Descrizione Custom Mancante)';
        contentDiv.appendChild(descriptionP);
    }

    if (combination.notes) {
        const notesP = document.createElement('p');
        notesP.className = 'combination-notes';
        notesP.innerHTML = `<em>Note:</em> `; // Create em tag first
        notesP.appendChild(document.createTextNode(combination.notes)); // Append notes as text node to prevent XSS if notes were user-controlled HTML
        contentDiv.appendChild(notesP);
    }

    li.appendChild(contentDiv);

    // --- Action Buttons ---
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'combination-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Modifica';
    editButton.className = 'button-edit';
    editButton.onclick = () => onEdit(combination); // Pass the whole object
    actionsDiv.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Elimina';
    deleteButton.className = 'button-delete';
    deleteButton.onclick = () => {
         const confirmationText = combination.type === 'custom'
            ? (combination.description || '').substring(0, 30) + '...'
            : `combinazione strutturata (${combination.category})`;
        if (confirm(`Eliminare questa combinazione?\n(${confirmationText})`)) {
            onDelete(combination.id);
        }
    };
    actionsDiv.appendChild(deleteButton);

    li.appendChild(actionsDiv);

    return li;
}

/**
 * Groups combinations by category and displays them in the container.
 * @param {Array<Object>} combinationsArray - The array of all combinations.
 * @param {HTMLElement} containerElement - The container to display the list in.
 * @param {Function} onDelete - Callback function for delete actions.
 * @param {Function} onEdit - Callback function for edit actions.
 */
function displayCombinationsList(combinationsArray, containerElement, onDelete, onEdit) {
    if (!containerElement) return;
    containerElement.innerHTML = ''; // Clear previous content

    if (!combinationsArray || combinationsArray.length === 0) {
        containerElement.innerHTML = '<p>Nessuna combinazione creata.</p>';
        return;
    }

    // Group by category
    const grouped = combinationsArray.reduce((acc, combo) => {
        const cat = combo.category || 'Senza Categoria';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(combo);
        return acc;
    }, {});

    // Sort categories based on the configured order if possible, otherwise alphabetically
     const sortedCategories = Object.keys(grouped).sort((a, b) => {
        const indexA = _categoriesCache.indexOf(a);
        const indexB = _categoriesCache.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Sort by config order
        if (indexA !== -1) return -1; // Configured categories first
        if (indexB !== -1) return 1;
        return a.localeCompare(b); // Alphabetical for others
    });


    const fragment = document.createDocumentFragment();

    sortedCategories.forEach(category => {
        const categorySection = document.createElement('section');
        categorySection.className = 'combination-category-section';

        const categoryHeader = document.createElement('h3');
        categoryHeader.className = 'combination-category-header';
        categoryHeader.textContent = `Combinazione ${category}`;
        categorySection.appendChild(categoryHeader);

        const categoryList = document.createElement('ul');
        categoryList.className = 'combination-category-list';

        grouped[category].forEach((combo, index) => {
            const comboElement = createCombinationViewElement(combo, onDelete, onEdit);
            categoryList.appendChild(comboElement);

            // Add "OPPURE" separator between options within the same category
            if (index < grouped[category].length - 1) {
                const separator = document.createElement('li');
                separator.className = 'combination-separator';
                separator.textContent = 'OPPURE';
                categoryList.appendChild(separator);
            }
        });

        categorySection.appendChild(categoryList);
        fragment.appendChild(categorySection);
    });

    containerElement.appendChild(fragment);
}


/**
 * Creates the HTML form for adding/editing a combination with improved block UX.
 * @param {Object|null} combinationToEdit - The combination object to edit, or null for a new one.
 * @param {Function} onSave - Callback function when the form is saved (passes the new/updated combination data).
 * @param {Function} onCancel - Callback function when the form is cancelled.
 * @returns {HTMLElement} The form element.
 */
function createCombinationFormElement(combinationToEdit, onSave, onCancel) {
    const form = document.createElement('form');
    form.className = 'combination-form';
    form.noValidate = true; // We'll do JS validation

    const isEditing = combinationToEdit !== null;
    const currentData = combinationToEdit || { // Default values for new combo
        id: `combo_${Date.now()}`, // Generate new ID
        category: _categoriesCache[0] || 'A', // Use first configured category
        type: 'structured',
        notes: '',
        blocks: [],
        description: ''
    };

    form.dataset.editingId = isEditing ? currentData.id : '';

    // --- Category Selection (Now uses _categoriesCache) ---
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'form-group';
    const categoryLabel = document.createElement('label');
    categoryLabel.htmlFor = `combo-cat-${currentData.id}`;
    categoryLabel.textContent = 'Categoria:';
    const categorySelect = document.createElement('select');
    categorySelect.id = `combo-cat-${currentData.id}`;
    categorySelect.name = 'category';
    _categoriesCache.forEach(cat => { // Use cached categories
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === currentData.category) option.selected = true;
        categorySelect.appendChild(option);
    });
    categoryGroup.appendChild(categoryLabel);
    categoryGroup.appendChild(categorySelect);
    form.appendChild(categoryGroup);

    // --- Type Selection (Structured / Custom) ---
    const typeGroup = document.createElement('div');
    typeGroup.className = 'form-group';
    typeGroup.innerHTML = '<label>Tipo Combinazione:</label>';
    const typeContainer = document.createElement('div');
    typeContainer.className = 'radio-group';

    const structuredRadio = createRadioInput('type', 'structured', 'Strutturata', currentData.id, currentData.type === 'structured');
    const customRadio = createRadioInput('type', 'custom', 'Custom', currentData.id, currentData.type === 'custom');
    typeContainer.appendChild(structuredRadio.label);
    typeContainer.appendChild(customRadio.label);
    typeGroup.appendChild(typeContainer);
    form.appendChild(typeGroup);

    // --- Content Area (dynamically changes based on type) ---
    const contentArea = document.createElement('div');
    contentArea.id = `content-area-${currentData.id}`;
    form.appendChild(contentArea);

    // --- Notes ---
    const notesGroup = document.createElement('div');
    notesGroup.className = 'form-group';
    const notesLabel = document.createElement('label');
    notesLabel.htmlFor = `combo-notes-${currentData.id}`;
    notesLabel.textContent = 'Note (Opzionale):';
    const notesTextarea = document.createElement('textarea');
    notesTextarea.id = `combo-notes-${currentData.id}`;
    notesTextarea.name = 'notes';
    notesTextarea.rows = 2;
    notesTextarea.value = currentData.notes || '';
    notesGroup.appendChild(notesLabel);
    notesGroup.appendChild(notesTextarea);
    form.appendChild(notesGroup);

    // --- Form Actions ---
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'form-actions';
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = isEditing ? 'Salva Modifiche' : 'Aggiungi Combinazione';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Annulla';
    cancelButton.onclick = onCancel;
    actionsDiv.appendChild(saveButton);
    actionsDiv.appendChild(cancelButton);
    form.appendChild(actionsDiv);

    // --- Dynamic Content based on Type ---
    const structuredContentContainer = document.createElement('div');
    structuredContentContainer.id = `structured-content-${currentData.id}`;
    const customContentContainer = document.createElement('div');
    customContentContainer.id = `custom-content-${currentData.id}`;

    // -- Structured Content --
    const blocksContainer = document.createElement('div');
    blocksContainer.className = 'blocks-container';
    structuredContentContainer.appendChild(blocksContainer); // Add container for blocks

    const addBlockButton = document.createElement('button');
    addBlockButton.type = 'button';
    addBlockButton.textContent = '+ Aggiungi Blocco';
    addBlockButton.className = 'add-block-button'; // Add class for styling
    addBlockButton.onclick = () => addBlockElement(blocksContainer); // Just add a default block
    structuredContentContainer.appendChild(addBlockButton);

    // Populate existing blocks if editing
    if (isEditing && currentData.type === 'structured') {
        currentData.blocks.forEach(block => {
            addBlockElement(blocksContainer, block.blockType, block.selectedFoods);
        });
    } else if (!isEditing && currentData.type === 'structured') { // Only add default block if creating structured
         addBlockElement(blocksContainer); // Add one block by default for new structured combos
    }


    // -- Custom Content --
    const descriptionGroup = document.createElement('div');
    descriptionGroup.className = 'form-group';
    const descriptionLabel = document.createElement('label');
    descriptionLabel.htmlFor = `combo-desc-${currentData.id}`;
    descriptionLabel.textContent = 'Descrizione Custom:';
    const descriptionTextarea = document.createElement('textarea');
    descriptionTextarea.id = `combo-desc-${currentData.id}`;
    descriptionTextarea.name = 'description';
    descriptionTextarea.rows = 3;
    descriptionTextarea.required = true;
    descriptionTextarea.value = currentData.description || '';
    descriptionGroup.appendChild(descriptionLabel);
    descriptionGroup.appendChild(descriptionTextarea);
    customContentContainer.appendChild(descriptionGroup);


    // Function to update visible content based on radio selection
    const updateFormContent = () => {
        const selectedType = form.querySelector('input[name="type"]:checked')?.value;
        contentArea.innerHTML = ''; // Clear previous content
        if (selectedType === 'structured') {
            contentArea.appendChild(structuredContentContainer);
            descriptionTextarea.required = false; // Not required if structured
        } else if (selectedType === 'custom') {
            contentArea.appendChild(customContentContainer);
            descriptionTextarea.required = true; // Required if custom
        }
    };

    // Add event listeners to type radios
    form.querySelectorAll('input[name="type"]').forEach(radio => {
        radio.addEventListener('change', updateFormContent);
    });

    // Initial content setup
    updateFormContent();

    // --- Form Submission Logic ---
    form.onsubmit = (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const savedData = {
            id: currentData.id, // Keep original ID if editing, new one if creating
            category: formData.get('category'),
            type: formData.get('type'),
            notes: formData.get('notes').trim(),
            blocks: [],
            description: null
        };

        if (savedData.type === 'structured') {
             const blockElements = blocksContainer.querySelectorAll('.block-editor');
             if(blockElements.length === 0){
                 alert("Aggiungere almeno un blocco per la combinazione strutturata.");
                 return; // Prevent saving without blocks
             }

             let blockError = false; // Flag to stop submission if any block is invalid
             blockElements.forEach(blockEl => {
                 if (blockError) return; // Don't process further if an error was found

                 // Retrieve data stored on the element
                 const blockType = blockEl.dataset.blockType;
                 const selectedFoods = blockEl._selectedFoods || []; // Get from property

                 if (selectedFoods.length === 0) {
                     console.warn(`Blocco ${blockType} senza alimenti selezionati.`);
                     // Decide if this is an error or just skip
                     // For now, let's require at least one food per block
                     alert(`Selezionare almeno un alimento per il blocco "${blockTypeLabels[blockType]}".`);
                     blockError = true;
                     // Try to focus the problematic input
                     blockEl.querySelector('.food-search-input')?.focus();
                     return; // Stop processing this block
                 }
                 savedData.blocks.push({
                     blockType: blockType,
                     selectedFoods: selectedFoods
                 });
             });

             if (blockError) return; // Stop submission if a block had an error

             if (savedData.blocks.length === 0){ // Should only happen if all blocks were skipped (e.g., empty)
                 alert("Nessun blocco valido trovato. Selezionare almeno un alimento per blocco.");
                 return;
             }

        } else { // Custom type
            const desc = formData.get('description').trim();
            if (!desc) {
                 alert("Inserire una descrizione per la combinazione custom.");
                 descriptionTextarea.focus();
                 return;
            }
            savedData.description = desc;
        }

        onSave(savedData); // Pass validated data to the save callback
    };

    return form;
}

// --- Helper Functions for Form UI ---

/** Creates a label containing a radio button. */
function createRadioInput(name, value, labelText, idPrefix, checked = false) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = value;
    radio.id = `${name}-${value}-${idPrefix}`;
    radio.checked = checked;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(` ${labelText}`));
    return { label, radio };
}

/**
 * Adds a new block editor element (with improved UX) to the blocks container.
 * @param {HTMLElement} container - The container element for all blocks.
 * @param {string} [blockTypeValue='una_scelta'] - The initial block type.
 * @param {Array<string>} [selectedFoodsValue=[]] - Initially selected food names.
 */
function addBlockElement(container, blockTypeValue = 'una_scelta', selectedFoodsValue = []) {
    const blockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const blockDiv = document.createElement('div');
    blockDiv.className = 'block-editor';
    blockDiv.id = blockId;
    blockDiv.dataset.blockType = blockTypeValue; // Store type in dataset
    blockDiv._selectedFoods = [...selectedFoodsValue]; // Store selected foods on the element property, ensure it's a copy

    // --- Block Type Selector ---
    const typeSelectGroup = document.createElement('div');
    typeSelectGroup.className = 'form-group block-type-selector';
    const typeSelect = document.createElement('select');
    typeSelect.name = 'blockType'; // This name isn't directly used by FormData anymore, but good for semantics
    Object.entries(blockTypeLabels).forEach(([key, label]) => {
        const option = document.createElement('option'); option.value = key; option.textContent = label;
        if (key === blockTypeValue) option.selected = true;
        typeSelect.appendChild(option);
    });
    typeSelect.onchange = (e) => { blockDiv.dataset.blockType = e.target.value; }; // Update dataset on change
    typeSelectGroup.appendChild(typeSelect);

    // --- Food Autocomplete Input ---
    const foodInputGroup = document.createElement('div');
    foodInputGroup.className = 'form-group food-selector-group';
    const foodInputLabel = document.createElement('label');
    foodInputLabel.textContent = 'Aggiungi Alimento:'; foodInputLabel.htmlFor = `food-input-${blockId}`;
    const foodInput = document.createElement('input');
    foodInput.type = 'text'; foodInput.id = `food-input-${blockId}`; foodInput.className = 'food-search-input';
    foodInput.placeholder = 'Inizia a digitare un alimento...'; foodInput.autocomplete = 'off';
    foodInput.setAttribute('aria-controls', `food-suggestions-${blockId}`);
    foodInput.setAttribute('aria-haspopup', 'listbox');
    foodInputGroup.appendChild(foodInputLabel); foodInputGroup.appendChild(foodInput);

    // --- Suggestions Container for this Block ---
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = `food-suggestions-${blockId}`;
    suggestionsContainer.className = 'block-suggestions-container'; // Specific class
    suggestionsContainer.setAttribute('role', 'listbox');
    foodInputGroup.appendChild(suggestionsContainer); // Append suggestions below input

    // --- Selected Foods Display Area ---
    const selectedDisplayGroup = document.createElement('div');
    selectedDisplayGroup.className = 'form-group selected-foods-group';
    selectedDisplayGroup.innerHTML = '<label>Alimenti Selezionati:</label>'; // Static label
    const selectedDisplayArea = document.createElement('div');
    selectedDisplayArea.className = 'selected-foods-display';
    selectedDisplayGroup.appendChild(selectedDisplayArea);

    // --- Remove Block Button ---
    const removeButton = document.createElement('button');
    removeButton.type = 'button'; removeButton.textContent = 'Rimuovi Blocco'; removeButton.className = 'button-remove-block';
    removeButton.onclick = () => blockDiv.remove();

    // --- Assemble Block ---
    blockDiv.appendChild(typeSelectGroup);
    blockDiv.appendChild(foodInputGroup);
    blockDiv.appendChild(selectedDisplayGroup);
    blockDiv.appendChild(removeButton);
    container.appendChild(blockDiv);

    // --- Initial Render & Event Listeners for the new block ---
    renderSelectedFoodsDisplay(blockDiv); // Render initial selected foods
    setupBlockEventListeners(blockDiv); // Add listeners for input, suggestions, remove buttons
}

/** Populates the display area showing selected foods with remove buttons. */
function renderSelectedFoodsDisplay(blockDiv) {
    const displayArea = blockDiv.querySelector('.selected-foods-display');
    if (!displayArea) return;
    displayArea.innerHTML = ''; // Clear previous
    const selectedFoods = blockDiv._selectedFoods || [];

    if (selectedFoods.length === 0) {
        displayArea.innerHTML = '<span class="placeholder">Nessun alimento selezionato</span>';
        return;
    }

    selectedFoods.forEach(foodName => {
        const itemSpan = document.createElement('span');
        itemSpan.className = 'selected-food-item';
        itemSpan.textContent = foodName;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-food-btn';
        removeBtn.innerHTML = '×'; // 'x' symbol
        removeBtn.dataset.foodName = foodName;
        removeBtn.setAttribute('aria-label', `Rimuovi ${foodName}`);

        itemSpan.appendChild(removeBtn);
        displayArea.appendChild(itemSpan);
    });
}

/** Sets up event listeners for a specific block's input and display area. */
function setupBlockEventListeners(blockDiv) {
    const input = blockDiv.querySelector('.food-search-input');
    const suggestionsContainer = blockDiv.querySelector('.block-suggestions-container');
    const selectedDisplayArea = blockDiv.querySelector('.selected-foods-display');

    if (!input || !suggestionsContainer || !selectedDisplayArea) {
        console.error("Required elements missing within block:", blockDiv.id);
        return;
    }

    let debounceTimeout = null;
    let activeSuggestionIndex = -1;

    // Input listener (debounced)
    input.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const searchTerm = input.value.toLowerCase().trim();
            if (!searchTerm) {
                renderBlockSuggestions(blockDiv, [], searchTerm); // Clear suggestions
                return;
            }
            // Find matches NOT already selected in *this* block
            const currentSelection = blockDiv._selectedFoods || [];
            // TODO: Add filtering based on blockDiv.dataset.blockType if needed
            const matches = _allFoodItemsCache.filter(item =>
                !currentSelection.includes(item.name) &&
                item.name.toLowerCase().includes(searchTerm)
            ).sort((a, b) => a.name.localeCompare(b.name));
            activeSuggestionIndex = -1; // Reset index on new suggestions
            renderBlockSuggestions(blockDiv, matches, searchTerm);
        }, 250); // Debounce delay
    });

    // Keyboard navigation for input/suggestions
    input.addEventListener('keydown', (event) => {
        const { key } = event;
        const suggestionItems = suggestionsContainer.querySelectorAll('.suggestion-item');

        if (!suggestionsContainer.classList.contains('visible') || suggestionItems.length === 0) {
            if (key === 'Enter') event.preventDefault(); // Prevent form submit on Enter in input
            return;
        }

        switch (key) {
            case 'ArrowDown':
                event.preventDefault();
                activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestionItems.length;
                updateBlockActiveSuggestion(blockDiv, activeSuggestionIndex);
                break;
            case 'ArrowUp':
                event.preventDefault();
                activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestionItems.length) % suggestionItems.length;
                updateBlockActiveSuggestion(blockDiv, activeSuggestionIndex);
                break;
            case 'Enter':
                event.preventDefault();
                if (activeSuggestionIndex > -1 && suggestionItems[activeSuggestionIndex]) {
                    const selectedFood = suggestionItems[activeSuggestionIndex].dataset.foodName;
                    addFoodToBlock(blockDiv, selectedFood);
                    activeSuggestionIndex = -1; // Reset index
                }
                break;
            case 'Escape':
                event.preventDefault();
                hideBlockSuggestions(blockDiv);
                activeSuggestionIndex = -1;
                break;
        }
    });

    // Click on suggestions (delegated)
    suggestionsContainer.addEventListener('click', (event) => {
        const targetItem = event.target.closest('.suggestion-item');
        if (targetItem && targetItem.dataset.foodName) {
            addFoodToBlock(blockDiv, targetItem.dataset.foodName);
            activeSuggestionIndex = -1;
        }
    });

    // Click on remove buttons (delegated)
    selectedDisplayArea.addEventListener('click', (event) => {
         if (event.target.classList.contains('remove-food-btn')) {
            const foodName = event.target.dataset.foodName;
            removeFoodFromBlock(blockDiv, foodName);
        }
    });

     // Hide suggestions on blur/click outside
     input.addEventListener('blur', () => {
         // Delay hiding slightly to allow suggestion clicks
         setTimeout(() => {
             // Check if focus is now inside the suggestion list; if so, don't hide
             if (!suggestionsContainer.contains(document.activeElement)) {
                 hideBlockSuggestions(blockDiv);
                 activeSuggestionIndex = -1;
             }
         }, 150);
     });
     // Also hide suggestions if clicking outside the whole block editor
      document.addEventListener('click', (event) => {
          if (!blockDiv.contains(event.target)) {
               hideBlockSuggestions(blockDiv);
               activeSuggestionIndex = -1;
           }
      }, true); // Use capture phase to catch clicks early
}

/** Renders suggestions specifically for a block's input. */
function renderBlockSuggestions(blockDiv, matches, searchTerm) {
    const suggestionsContainer = blockDiv.querySelector('.block-suggestions-container');
    const input = blockDiv.querySelector('.food-search-input');
    if (!suggestionsContainer || !input) return;

    suggestionsContainer.innerHTML = '';
    input.removeAttribute('aria-activedescendant');

    if (matches.length === 0 || !searchTerm) {
        suggestionsContainer.classList.remove('visible');
        return;
    }

    matches.slice(0, 5).forEach((item, index) => { // Limit block suggestions
        const li = document.createElement('li');
        li.className = 'suggestion-item'; // Reuse class
        li.setAttribute('role', 'option');
        li.id = `${blockDiv.id}-suggestion-${index}`;
        li.dataset.foodName = item.name;
        const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        li.innerHTML = item.name.replace(regex, '<mark>$1</mark>');
        suggestionsContainer.appendChild(li);
    });
    suggestionsContainer.classList.add('visible');
}

/** Hides suggestions for a specific block. */
function hideBlockSuggestions(blockDiv) {
    const suggestionsContainer = blockDiv.querySelector('.block-suggestions-container');
    const input = blockDiv.querySelector('.food-search-input');
    if (suggestionsContainer) suggestionsContainer.classList.remove('visible');
    if (input) input.removeAttribute('aria-activedescendant');
}

/** Updates the active suggestion visual state for a block. */
function updateBlockActiveSuggestion(blockDiv, activeIndex) {
    const suggestionsContainer = blockDiv.querySelector('.block-suggestions-container');
    const input = blockDiv.querySelector('.food-search-input');
    if (!suggestionsContainer || !input) return;

    const items = suggestionsContainer.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
        if (index === activeIndex) {
            item.classList.add('active');
            input.setAttribute('aria-activedescendant', item.id);
            // Basic scroll into view for block suggestions
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

/** Adds a selected food to a block's internal list and UI. */
function addFoodToBlock(blockDiv, foodName) {
    if (!blockDiv || !foodName) return;
    const input = blockDiv.querySelector('.food-search-input');

    blockDiv._selectedFoods = blockDiv._selectedFoods || []; // Ensure array exists
    if (!blockDiv._selectedFoods.includes(foodName)) {
        blockDiv._selectedFoods.push(foodName);
        renderSelectedFoodsDisplay(blockDiv); // Update the list display
    }
    if (input) input.value = ''; // Clear input
    hideBlockSuggestions(blockDiv); // Hide suggestions
    if (input) input.focus(); // Keep focus in the input for adding more
}

/** Removes a food from a block's internal list and UI. */
function removeFoodFromBlock(blockDiv, foodName) {
    if (!blockDiv || !foodName) return;
    blockDiv._selectedFoods = blockDiv._selectedFoods || [];
    blockDiv._selectedFoods = blockDiv._selectedFoods.filter(name => name !== foodName);
    renderSelectedFoodsDisplay(blockDiv); // Update the list display
}


// Make necessary functions available globally or via export
window.combinationUI = {
    setFoodItemCache,
    setCategoriesCache, // Add this
    displayCombinationsList,
    createCombinationFormElement
};