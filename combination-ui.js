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
            foodListSpan.textContent = block.selectedFoods.join(' / '); // Display selected foods
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
        notesP.innerHTML = `<em>Note:</em> ${combination.notes}`; // Use innerHTML carefully or sanitize
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
        if (confirm(`Eliminare questa combinazione?\n(${combination.type === 'custom' ? combination.description.substring(0, 30)+'...' : 'Combinazione strutturata'})`)) {
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

    // Sort categories (A, B, C, D...)
    const sortedCategories = Object.keys(grouped).sort();

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
 * Creates the HTML form for adding/editing a combination.
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
        category: 'A',
        type: 'structured',
        notes: '',
        blocks: [],
        description: ''
    };

    form.dataset.editingId = isEditing ? currentData.id : '';

    // --- Category Selection ---
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'form-group';
    const categoryLabel = document.createElement('label');
    categoryLabel.htmlFor = `combo-cat-${currentData.id}`;
    categoryLabel.textContent = 'Categoria:';
    const categorySelect = document.createElement('select');
    categorySelect.id = `combo-cat-${currentData.id}`;
    categorySelect.name = 'category';
    ['A', 'B', 'C', 'D'].forEach(cat => {
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
    addBlockButton.onclick = () => addBlockElement(blocksContainer, currentData.id);
    structuredContentContainer.appendChild(addBlockButton);

    // Populate existing blocks if editing
    if (isEditing && currentData.type === 'structured') {
        currentData.blocks.forEach(block => {
            addBlockElement(blocksContainer, currentData.id, block.blockType, block.selectedFoods);
        });
    } else if (!isEditing) {
         addBlockElement(blocksContainer, currentData.id); // Add one block by default for new structured combos
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
             blockElements.forEach(blockEl => {
                const blockTypeSelect = blockEl.querySelector('select[name="blockType"]');
                const foodSelect = blockEl.querySelector('select[name="selectedFoods"]');
                if (blockTypeSelect && foodSelect) {
                     const selectedFoods = Array.from(foodSelect.selectedOptions).map(opt => opt.value);
                     if(selectedFoods.length === 0){
                         // Optionally alert or just skip empty blocks
                         console.warn(`Blocco ${blockTypeSelect.value} senza alimenti selezionati, verrà ignorato.`);
                         return; // Skip block if no food selected
                     }
                     savedData.blocks.push({
                        blockType: blockTypeSelect.value,
                        selectedFoods: selectedFoods
                    });
                }
            });
             if(savedData.blocks.length === 0){
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

/** Adds a new block editor element to the blocks container. */
function addBlockElement(container, idPrefix, blockTypeValue = 'una_scelta', selectedFoodsValue = []) {
    const blockId = `block-${Date.now()}`; // Unique ID for the block element
    const blockDiv = document.createElement('div');
    blockDiv.className = 'block-editor';
    blockDiv.id = blockId;

    // Block Type Selector
    const typeSelect = document.createElement('select');
    typeSelect.name = 'blockType';
    Object.entries(blockTypeLabels).forEach(([key, label]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = label;
        if (key === blockTypeValue) option.selected = true;
        typeSelect.appendChild(option);
    });

    // Food Multi-Selector
    const foodSelectLabel = document.createElement('label');
    foodSelectLabel.textContent = " Alimenti:";
    foodSelectLabel.style.display = 'block'; // Make label appear above select

    const foodSelect = document.createElement('select');
    foodSelect.name = 'selectedFoods';
    foodSelect.multiple = true;
    foodSelect.size = 5; // Show a few options at once
    // TODO: Add filtering logic here later if needed (based on blockType)
    populateFoodMultiSelect(foodSelect, null, selectedFoodsValue); // Pass selected values

    // Remove Block Button
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Rimuovi Blocco';
    removeButton.className = 'button-remove-block';
    removeButton.onclick = () => blockDiv.remove();

    blockDiv.appendChild(typeSelect);
    blockDiv.appendChild(foodSelectLabel);
    blockDiv.appendChild(foodSelect);
    blockDiv.appendChild(removeButton);
    container.appendChild(blockDiv);
}

/** Populates a multi-select element with food items. */
function populateFoodMultiSelect(selectElement, filterType = null, selectedValues = []) {
     selectElement.innerHTML = ''; // Clear existing options

     let filteredFood = _allFoodItemsCache;

     // TODO: Implement actual filtering based on filterType ('contorno', 'secondo')
     // if (filterType === 'contorno') {
     //    filteredFood = _allFoodItemsCache.filter(item => item.foodGroup === 'contorno');
     // } else if (filterType === 'secondo') {
     //    filteredFood = _allFoodItemsCache.filter(item => item.foodGroup === 'secondo');
     // }

    if (!filteredFood || filteredFood.length === 0) {
         const option = document.createElement('option');
         option.textContent = "Nessun alimento disponibile";
         option.disabled = true;
         selectElement.appendChild(option);
         return;
     }

    filteredFood.forEach(food => {
        const option = document.createElement('option');
        option.value = food.name; // Use name as value for now
        option.textContent = food.name;
        if (selectedValues.includes(food.name)) {
            option.selected = true; // Pre-select if editing
        }
        selectElement.appendChild(option);
    });
}

// Make functions available (simple global approach for now)
window.combinationUI = {
    setFoodItemCache,
    displayCombinationsList,
    createCombinationFormElement
};