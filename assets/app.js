// assets/app.js

// --- Reusable Modal Component (Your Code) ---
function createModal() {
    if (document.getElementById('app-modal')) {
        return;
    }
    const modalHTML = `
        <div id="app-modal" class="modal-overlay hidden">
            <div class="modal-content">
                <h3 id="modal-title"></h3>
                <p id="modal-message"></p>
                <div id="modal-actions"></div>
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

// --- UI Helpers (Your Code) ---
function showLoading(button) {
    if (!button) return;
    button.disabled = true;
    if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
    }
    button.innerHTML = `<span class="spinner"></span> <span>Processing...</span>`;
}

function hideLoading(button) {
    if (!button) return;
    button.disabled = false;
    if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
    }
}


// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. CREATE THE MODAL ON PAGE LOAD
    createModal(); 

    // 2. DEFINE ELEMENTS AND STATE
    const premiumContent = document.getElementById('premium-content');
    let stripe;

    // --- FIX: Only run the premium page logic if we are on that page ---
    // If the premium-content container doesn't exist, exit this listener.
    if (!premiumContent) {
        return;
    }

    // 3. CHECK FOR USER LOGIN STATUS FIRST
    const currentUser = localStorage.getItem('user-identity');
    if (!currentUser) {
        premiumContent.innerHTML = `
            <p class="status-error">You must be logged in to purchase a premium number.</p>
            <a href="/login.html" class="login-link-btn">Login or Sign Up</a>
        `;
        return;
    }

    // 4. INITIALIZE STRIPE (only for logged-in users)
    try {
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        if (!config.stripePublishableKey) {
            throw new Error('Stripe key is not configured on the server.');
        }
        stripe = Stripe(config.stripePublishableKey);
    } catch (err) {
        premiumContent.innerHTML = `<p class="status-error">Could not initialize payment system: ${err.message}</p>`;
        return;
    }

    // 5. SHOW THE SEARCH FORM
    premiumContent.innerHTML = `
        <h2>Search for a Number</h2>
        <form id="search-form">
            <input name="areaCode" placeholder="Area Code (e.g., 512)" required>
            <input name="contains" placeholder="Contains (e.g., 'TAXI' or '888')">
            <button type="submit">Search</button>
        </form>
        <h2>Results</h2>
        <ul id="results-list"></ul>
    `;

    // 6. ADD EVENT LISTENERS
    const searchForm = document.getElementById('search-form');
    const resultsList = document.getElementById('results-list');

    searchForm.addEventListener('submit', async (event) => {
        console.log("hgf");
        event.preventDefault();
        const searchButton = searchForm.querySelector('button[type="submit"]');
        showLoading(searchButton); // Use your loading helper!
        
        const params = new URLSearchParams(new FormData(searchForm));
        try {
            console.log("hgf");
            const response = await fetch(`/premium/find-numbers?${params.toString()}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            if (data.numbers.length === 0) {
                resultsList.innerHTML = '<li>No numbers found. Try another search.</li>';
                return;
            }

            resultsList.innerHTML = data.numbers.map(num => `
                <li>
                    ${num} <button class="buy-now-btn" data-number="${num}">Buy Now</button>
                </li>
            `).join('');

        } catch (err) {
            console.error(err);
            resultsList.innerHTML = `<li>Error: ${err.message}</li>`;
        } finally {
            hideLoading(searchButton); // Stop the loading animation
        }
    });

    // Use event delegation for "Buy Now" buttons
    premiumContent.addEventListener('click', (event) => {
        if (event.target.classList.contains('buy-now-btn')) {
            const number = event.target.dataset.number;
            purchaseNumber(number, event.target); // Pass the button for loading state
        }
    });

    // 7. DEFINE THE PURCHASE LOGIC
    async function purchaseNumber(number, buttonEl) {
        showModal({
            title: "Confirm Purchase",
            message: `You are about to purchase <strong>${number}</strong>. This will redirect you to our secure payment processor.`,
            buttons: [{
                text: 'Proceed to Payment',
                class: 'modal-btn-primary',
                onClick: async () => {
                    showLoading(buttonEl); // Show loading on the original "Buy Now" button
                    try {
                        const params = new URLSearchParams({ numberToBuy: number, userIdentity: currentUser });
                        const response = await fetch(`/premium/create-checkout-session?${params.toString()}`);
                        const session = await response.json();
                        if (session.error) throw new Error(session.error);

                        const result = await stripe.redirectToCheckout({ sessionId: session.sessionId });
                        if (result.error) {
                            showModal({ title: "Payment Error", message: result.error.message, buttons: [{ text: 'Close' }] });
                        }
                    } catch (err) {
                        showModal({ title: "Error", message: `Could not start payment: ${err.message}`, buttons: [{ text: 'Close' }] });
                    } finally {
                        hideLoading(buttonEl); // Hide loading if anything goes wrong
                    }
                }
            }, {
                text: 'Cancel',
                class: 'modal-btn-secondary'
            }]
        });
    }
});