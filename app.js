// Vendor Earthworks - Card-Based Interactive Dashboard
// Connected to Google Sheets via SheetDB API
// =====================================================

const SHEETDB_API = '/api/vendors';

let vendorData = [];
let filteredData = [];

// Column mappings
const columnMap = {
    'Supplier / Brand': 'supplier',
    'Location (HQ / Plants)': 'location',
    'Product Portfolio': 'products',
    'GSM': 'gsm',
    'Food-Grade Coating': 'coating',
    'Food Dishes Best Suited': 'dishes',
    'Indicative Price Range': 'price',
    'Production capacities (Per month)': 'capacity',
    'MOQ': 'moq',
    'Customization / Printing': 'customization',
    'Existing Clients / Segments': 'clients',
    'USP / Differentiation': 'usp'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    renderCards();
});

// Load data from SheetDB API
// Load data from SheetDB API
async function loadData() {
    showLoading(true);

    try {
        const response = await fetch(SHEETDB_API);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const rawData = await response.json();
        processData(rawData);
    } catch (error) {
        console.error('API failed:', error);

        showLoading(false);
        document.getElementById('cardsContainer').innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">⚠️</div>
                <h3>Error loading data</h3>
                <p>Could not load vendors from API. Please check connection.</p>
                <button onclick="loadData()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">Retry</button>
            </div>
        `;
    }
}

// Process the raw API data
function processData(rawData) {
    // Transform data to use clean keys
    vendorData = rawData.map(row => {
        const transformed = {};
        for (const [originalKey, newKey] of Object.entries(columnMap)) {
            transformed[newKey] = row[originalKey] || '';
        }
        // Keep original row for updates
        transformed._original = row;
        return transformed;
    }).filter(v => v.supplier && v.supplier.trim() !== '');

    // Update counts
    document.getElementById('totalVendors').textContent = vendorData.length;

    // Populate filters
    populateFilters();
    showLoading(false);
    renderCards();
}

// Show/hide loading state
function showLoading(show) {
    const container = document.getElementById('cardsContainer');
    if (show) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading vendors from Google Sheet...</p>
            </div>
        `;
    }
}

// Populate filter dropdowns
function populateFilters() {
    // Location filter
    const locations = [...new Set(vendorData.map(row => {
        const loc = row.location || '';
        return loc.split('/')[0].trim();
    }))].filter(l => l).sort();

    const locationFilter = document.getElementById('locationFilter');
    locationFilter.innerHTML = '<option value="">All Locations</option>';
    locations.forEach(loc => {
        locationFilter.innerHTML += `<option value="${loc}">${loc}</option>`;
    });

    // Customization filter
    const customizations = [...new Set(vendorData.map(row => row.customization || ''))].filter(c => c).sort();

    const customizationFilter = document.getElementById('customizationFilter');
    customizationFilter.innerHTML = '<option value="">All Customization Levels</option>';
    customizations.forEach(cust => {
        customizationFilter.innerHTML += `<option value="${cust}">${cust}</option>`;
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    searchInput.addEventListener('input', debounce(() => {
        clearSearch.classList.toggle('visible', searchInput.value.length > 0);
        renderCards();
    }, 300));

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.classList.remove('visible');
        renderCards();
    });

    // Filters
    document.getElementById('locationFilter').addEventListener('change', renderCards);
    document.getElementById('customizationFilter').addEventListener('change', renderCards);

    // Modal
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });
    document.getElementById('modalClose').addEventListener('click', closeModal);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === '/' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Render vendor cards
function renderCards() {
    const data = vendorData;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const locationFilter = document.getElementById('locationFilter').value;
    const customizationFilter = document.getElementById('customizationFilter').value;

    // Filter data
    filteredData = data.filter(row => {
        if (searchTerm) {
            const searchFields = Object.values(row).join(' ').toLowerCase();
            if (!searchFields.includes(searchTerm)) return false;
        }
        if (locationFilter && !row.location.includes(locationFilter)) return false;
        if (customizationFilter && row.customization !== customizationFilter) return false;
        return true;
    });

    // Update filtered count
    document.getElementById('filteredCount').textContent = filteredData.length;

    // Render cards
    const container = document.getElementById('cardsContainer');
    const noResults = document.getElementById('noResults');

    if (filteredData.length === 0) {
        container.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    noResults.style.display = 'none';

    container.innerHTML = filteredData.map((vendor, index) => `
        <div class="vendor-card" style="--card-index: ${index}" data-index="${index}">
            <div class="card-header">
                <div class="card-title">
                    <h3>${escapeHtml(vendor.supplier || 'Unknown Vendor')}</h3>
                    <div class="card-location">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>${escapeHtml(truncate(vendor.location, 30) || 'N/A')}</span>
                    </div>
                </div>
                <span class="card-badge">Packaging</span>
            </div>
            
            <div class="card-products">
                <div class="card-products-label">Product Portfolio</div>
                <div class="card-products-text">${escapeHtml(vendor.products || 'N/A')}</div>
            </div>
            
            <div class="card-meta">
                <div class="meta-item">
                    <div class="meta-label">Price Range</div>
                    <div class="meta-value price">${escapeHtml(truncate(vendor.price, 15) || 'N/A')}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">MOQ</div>
                    <div class="meta-value moq">${escapeHtml(truncate(vendor.moq, 15) || 'N/A')}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">GSM</div>
                    <div class="meta-value">${escapeHtml(truncate(vendor.gsm, 15) || 'N/A')}</div>
                </div>
            </div>
            
            <div class="card-footer">
                <span class="card-usp">${escapeHtml(vendor.usp || 'View details for more info')}</span>
                <span class="view-details">
                    Details
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </span>
            </div>
        </div>
    `).join('');

    // Add click listeners to cards
    container.querySelectorAll('.vendor-card').forEach(card => {
        card.addEventListener('click', () => {
            const index = parseInt(card.dataset.index);
            showVendorDetail(filteredData[index], index);
        });
    });
}

// Truncate text
function truncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Show vendor detail modal with edit capability
function showVendorDetail(vendor, index) {
    const modalContent = document.getElementById('modalContent');

    modalContent.innerHTML = `
        <div class="modal-header">
            <span class="modal-badge">Packaging Vendor</span>
            <h2>${escapeHtml(vendor.supplier || 'Unknown Vendor')}</h2>
            <div class="modal-location">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>${escapeHtml(vendor.location || 'Location not specified')}</span>
            </div>
        </div>
        
        <div class="modal-actions">
            <button class="btn-edit" onclick="openEditModal(${index})">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit Vendor
            </button>
        </div>
        
        <div class="modal-highlights">
            <div class="highlight-card">
                <div class="highlight-label">Price Range</div>
                <div class="highlight-value price">${escapeHtml(vendor.price || 'Contact for pricing')}</div>
            </div>
            <div class="highlight-card">
                <div class="highlight-label">Minimum Order Qty</div>
                <div class="highlight-value moq">${escapeHtml(vendor.moq || 'N/A')}</div>
            </div>
        </div>
        
        <div class="modal-section">
            <div class="modal-section-title">Product Portfolio</div>
            <div class="modal-section-content">${escapeHtml(vendor.products || 'N/A')}</div>
        </div>
        
        <div class="modal-details-grid">
            <div class="detail-item">
                <div class="detail-label">GSM Range</div>
                <div class="detail-value">${escapeHtml(vendor.gsm || 'N/A')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Food-Grade Coating</div>
                <div class="detail-value">${escapeHtml(vendor.coating || 'N/A')}</div>
            </div>
            <div class="detail-item full-width">
                <div class="detail-label">Best Suited For</div>
                <div class="detail-value">${escapeHtml(vendor.dishes || 'N/A')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Production Capacity</div>
                <div class="detail-value">${escapeHtml(vendor.capacity || 'N/A')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Customization</div>
                <div class="detail-value">${escapeHtml(vendor.customization || 'N/A')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Existing Clients</div>
                <div class="detail-value">${escapeHtml(vendor.clients || 'N/A')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">USP / Differentiation</div>
                <div class="detail-value">${escapeHtml(vendor.usp || 'N/A')}</div>
            </div>
        </div>
    `;

    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Open edit modal
function openEditModal(index) {
    const vendor = filteredData[index];
    const modalContent = document.getElementById('modalContent');

    modalContent.innerHTML = `
        <div class="modal-header">
            <span class="modal-badge edit-mode">Edit Mode</span>
            <h2>Edit Vendor</h2>
        </div>
        
        <form id="editForm" class="edit-form" onsubmit="saveVendor(event, ${index})">
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Supplier / Brand</label>
                    <input type="text" name="supplier" value="${escapeHtml(vendor.supplier || '')}" required>
                </div>
                <div class="form-group">
                    <label>Location (HQ / Plants)</label>
                    <input type="text" name="location" value="${escapeHtml(vendor.location || '')}">
                </div>
                <div class="form-group">
                    <label>Product Portfolio</label>
                    <input type="text" name="products" value="${escapeHtml(vendor.products || '')}">
                </div>
                <div class="form-group">
                    <label>GSM</label>
                    <input type="text" name="gsm" value="${escapeHtml(vendor.gsm || '')}">
                </div>
                <div class="form-group">
                    <label>Food-Grade Coating</label>
                    <input type="text" name="coating" value="${escapeHtml(vendor.coating || '')}">
                </div>
                <div class="form-group">
                    <label>Food Dishes Best Suited</label>
                    <input type="text" name="dishes" value="${escapeHtml(vendor.dishes || '')}">
                </div>
                <div class="form-group">
                    <label>Indicative Price Range</label>
                    <input type="text" name="price" value="${escapeHtml(vendor.price || '')}">
                </div>
                <div class="form-group">
                    <label>Production Capacity</label>
                    <input type="text" name="capacity" value="${escapeHtml(vendor.capacity || '')}">
                </div>
                <div class="form-group">
                    <label>MOQ</label>
                    <input type="text" name="moq" value="${escapeHtml(vendor.moq || '')}">
                </div>
                <div class="form-group">
                    <label>Customization / Printing</label>
                    <input type="text" name="customization" value="${escapeHtml(vendor.customization || '')}">
                </div>
                <div class="form-group">
                    <label>Existing Clients</label>
                    <input type="text" name="clients" value="${escapeHtml(vendor.clients || '')}">
                </div>
                <div class="form-group">
                    <label>USP / Differentiation</label>
                    <input type="text" name="usp" value="${escapeHtml(vendor.usp || '')}">
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-cancel" onclick="showVendorDetail(filteredData[${index}], ${index})">Cancel</button>
                <button type="submit" class="btn-save">
                    <span class="btn-text">Save Changes</span>
                    <span class="btn-loading" style="display: none;">Saving...</span>
                </button>
            </div>
        </form>
    `;
}

// Save vendor to Google Sheet
async function saveVendor(event, index) {
    event.preventDefault();

    const form = event.target;
    const saveBtn = form.querySelector('.btn-save');
    const btnText = saveBtn.querySelector('.btn-text');
    const btnLoading = saveBtn.querySelector('.btn-loading');

    // Show loading state
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    saveBtn.disabled = true;

    const vendor = filteredData[index];
    const originalSupplier = vendor._original['Supplier / Brand'];

    // Build update data
    const updateData = {
        'Supplier / Brand': form.supplier.value,
        'Location (HQ / Plants)': form.location.value,
        'Product Portfolio': form.products.value,
        'GSM': form.gsm.value,
        'Food-Grade Coating': form.coating.value,
        'Food Dishes Best Suited': form.dishes.value,
        'Indicative Price Range': form.price.value,
        'Production capacities (Per month)': form.capacity.value,
        'MOQ': form.moq.value,
        'Customization / Printing': form.customization.value,
        'Existing Clients / Segments': form.clients.value,
        'USP / Differentiation': form.usp.value
    };

    let saved = false;

    // Try Vercel API (proxies to SheetDB)
    try {
        const response = await fetch(SHEETDB_API, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                originalSupplier: originalSupplier,
                updateData: updateData
            })
        });

        if (response.ok) {
            saved = true;
        }
    } catch (error) {
        console.log('API PATCH failed:', error);
    }

    if (saved) {
        // Update local data
        for (const [key, value] of Object.entries(updateData)) {
            vendor._original[key] = value;
        }

        // Update transformed data
        vendor.supplier = form.supplier.value;
        vendor.location = form.location.value;
        vendor.products = form.products.value;
        vendor.gsm = form.gsm.value;
        vendor.coating = form.coating.value;
        vendor.dishes = form.dishes.value;
        vendor.price = form.price.value;
        vendor.capacity = form.capacity.value;
        vendor.moq = form.moq.value;
        vendor.customization = form.customization.value;
        vendor.clients = form.clients.value;
        vendor.usp = form.usp.value;

        showNotification('Vendor updated successfully!', 'success');
        renderCards();
        showVendorDetail(vendor, index);
    } else {
        // Update local data only (for this session)
        vendor.supplier = form.supplier.value;
        vendor.location = form.location.value;
        vendor.products = form.products.value;
        vendor.gsm = form.gsm.value;
        vendor.coating = form.coating.value;
        vendor.dishes = form.dishes.value;
        vendor.price = form.price.value;
        vendor.capacity = form.capacity.value;
        vendor.moq = form.moq.value;
        vendor.customization = form.customization.value;
        vendor.clients = form.clients.value;
        vendor.usp = form.usp.value;

        // Update original too for consistency
        for (const [key, value] of Object.entries(updateData)) {
            vendor._original[key] = value;
        }

        showNotification('Changes saved locally! To update Google Sheet, edit directly in the spreadsheet.', 'warning');
        renderCards();
        showVendorDetail(vendor, index);
    }

    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    saveBtn.disabled = false;
}
saveBtn.disabled = false;
    }
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 4000);
}

// Close modal
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
