// combinations.js - Manages combination data and interactions

// Assume storage.js and combination-ui.js are loaded before this script

let _combinationsState = {
    allCombinations: [],
    allFoodItems: [], // Reference to the main food data
    isModalOpen: false,
    modalContainer: null, // Reference to the modal element
    listContainer: null // Reference to the list display element
};

/**
 * Initializes the combinations module.
 * @param {HTMLElement} modalContainerElement - The DOM element for the form modal.
 * @param {HTMLElement} listContainerElement - The DOM element where the list is displayed.
 * @param {Array<Object>} allFoodData - The complete food data from the main script.
 */
function initCombinations(modalContainerElement, listContainerElement, allFoodData) {
    _combinationsState.modalContainer = modalContainerElement;
    _combinationsState.listContainer = listContainerElement;
    _combinationsState.allFoodItems = allFoodData || [];

    // Pass food data to the UI module
    if (window.combinationUI && typeof window.combinationUI.setFoodItemCache === 'function') {
        window.combinationUI.setFoodItemCache(_combinationsState.allFoodItems);
    } else {
        console.error("combinationUI or setFoodItemCache not available.");
    }


    _combinationsState.allCombinations = loadCombinationsFromStorage();
    console.log("Loaded combinations:", _combinationsState.allCombinations);

    // Initial display (optional - might be triggered by a button)
     displayCurrentCombinations(); // Display list initially if listContainer exists

    // Add event listeners for Add/View buttons (assuming they exist)
    const addComboBtn = document.getElementById('addCombinationBtn');
    const viewComboBtn = document.getElementById('viewCombinationsBtn'); // Assuming a view button

    if (addComboBtn) {
        addComboBtn.addEventListener('click', handleAddCombinationClick);
    }
    if (viewComboBtn) {
        // View button might just toggle visibility of listContainer
        viewComboBtn.addEventListener('click', () => {
            if (_combinationsState.listContainer) {
                _combinationsState.listContainer.hidden = !_combinationsState.listContainer.hidden;
                 if(!_combinationsState.listContainer.hidden) {
                     displayCurrentCombinations(); // Refresh list when showing
                 }
            }
        });
    } else if (_combinationsState.listContainer) {
         // If no view button, ensure the list container is visible by default
         _combinationsState.listContainer.hidden = false;
    }

}

/** Displays the current list of combinations in the designated container. */
function displayCurrentCombinations() {
    if (window.combinationUI && typeof window.combinationUI.displayCombinationsList === 'function') {
         if(!_combinationsState.listContainer){
              console.warn("Combinations list container not set.");
              return;
         }
        window.combinationUI.displayCombinationsList(
            _combinationsState.allCombinations,
            _combinationsState.listContainer,
            handleDeleteCombination,
            handleEditCombinationClick
        );
    } else {
        console.error("combinationUI or displayCombinationsList not available.");
    }
}

/** Shows the combination form in the modal. */
function showCombinationForm(combinationToEdit = null) {
    if (!_combinationsState.modalContainer) {
        console.error("Modal container not set.");
        return;
    }
     if (window.combinationUI && typeof window.combinationUI.createCombinationFormElement === 'function') {
         const formElement = window.combinationUI.createCombinationFormElement(
             combinationToEdit,
             handleSaveCombination,
             handleCancelForm
         );
         _combinationsState.modalContainer.innerHTML = ''; // Clear previous form
         _combinationsState.modalContainer.appendChild(formElement);
         _combinationsState.modalContainer.showModal(); // Show HTML dialog element
         _combinationsState.isModalOpen = true;
     } else {
         console.error("combinationUI or createCombinationFormElement not available.");
     }

}

/** Closes the combination form modal. */
function hideCombinationForm() {
    if (_combinationsState.modalContainer) {
        _combinationsState.modalContainer.close(); // Close HTML dialog element
    }
    _combinationsState.isModalOpen = false;
}

// --- Event Handlers ---

function handleAddCombinationClick() {
    showCombinationForm(null); // Show form for new combination
}

function handleEditCombinationClick(combination) {
    showCombinationForm(combination); // Show form pre-filled for editing
}

function handleCancelForm() {
    hideCombinationForm();
}

/** Saves new or updated combination data. */
function handleSaveCombination(combinationData) {
     console.log("Saving combination:", combinationData);
    const existingIndex = _combinationsState.allCombinations.findIndex(c => c.id === combinationData.id);

    if (existingIndex > -1) {
        // Update existing
        _combinationsState.allCombinations[existingIndex] = combinationData;
        console.log("Combination updated.");
    } else {
        // Add new
        _combinationsState.allCombinations.push(combinationData);
        console.log("Combination added.");
    }

    saveCombinationsToStorage(_combinationsState.allCombinations);
    hideCombinationForm();
    displayCurrentCombinations(); // Refresh the list view
}

/** Deletes a combination by its ID. */
function handleDeleteCombination(combinationId) {
    console.log("Deleting combination:", combinationId);
    _combinationsState.allCombinations = _combinationsState.allCombinations.filter(c => c.id !== combinationId);
    saveCombinationsToStorage(_combinationsState.allCombinations);
    displayCurrentCombinations(); // Refresh the list view
}


// Make init function available globally or via export
window.initCombinations = initCombinations;
// export { initCombinations }; // If using modules