// assets/app.js

// --- Reusable Modal Component ---
function createModal() {
    // Check if the modal already exists to avoid duplicates
    if (document.getElementById('app-modal')) {
        return;
    }
    const modalHTML = `
        <div id="app-modal" class="modal-overlay hidden">
            <div class="modal-content">
                <h3 id="modal-title" class="text-xl font-bold mb-4"></h3>
                <p id="modal-message" class="mb-6"></p>
                <div id="modal-actions" class="flex justify-end space-x-4">
                    </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showModal({ title, message, buttons }) {
    const modal = document.getElementById('app-modal');
    if (!modal) {
        console.error('Modal container not found. Was createModal() called?');
        return;
    }
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerHTML = message; // Use innerHTML to allow for simple formatting
    
    const actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = ''; // Clear previous buttons

    buttons.forEach(btn => {
        const buttonEl = document.createElement('button');
        buttonEl.innerText = btn.text;
        buttonEl.className = btn.class || 'modal-btn-secondary';
        buttonEl.onclick = () => {
            hideModal();
            if (btn.onClick) {
                btn.onClick();
            }
        };
        actionsContainer.appendChild(buttonEl);
    });

    modal.classList.remove('hidden');
}

function hideModal() {
    const modal = document.getElementById('app-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
}

// Create the modal once the script loads
document.addEventListener('DOMContentLoaded', createModal);


// --- UI Helpers ---
function showLoading(button) {
    if (!button) return;
    button.disabled = true;
    // Save original content if not already saved
    if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
    }
    button.innerHTML = `
        <span class="spinner"></span>
        <span>Processing...</span>
    `;
}

function hideLoading(button) {
    if (!button) return;
    button.disabled = false;
    // Restore original content
    if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
    }
}
