// App state
let allMedia = [];
let filteredMedia = [];
let selectedKeys = new Set();
let currentViewerIndex = -1;

// DOM Elements
const mediaGrid = document.getElementById('mediaGrid');
const stats = document.getElementById('stats');
const noResults = document.getElementById('noResults');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const refreshBtn = document.getElementById('refreshBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const deleteClearBtn = document.getElementById('deleteClearBtn');
const headerInfo = document.getElementById('headerInfo');
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const notification = document.getElementById('notification');

// Viewer elements
const viewerModal = document.getElementById('viewerModal');
const viewerClose = document.getElementById('viewerClose');
const viewerPrev = document.getElementById('viewerPrev');
const viewerNext = document.getElementById('viewerNext');
const viewerContent = document.getElementById('viewerContent');
const viewerInfo = document.getElementById('viewerInfo');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAppInfo();
    loadMedia();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    refreshBtn.addEventListener('click', loadMedia);
    selectAllBtn.addEventListener('click', selectAllMedia);
    deselectAllBtn.addEventListener('click', deselectAllMedia);
    deleteSelectedBtn.addEventListener('click', () => deleteSelected());
    deleteClearBtn.addEventListener('click', deleteAll);
    searchInput.addEventListener('input', filterMedia);
    filterType.addEventListener('change', filterMedia);
    confirmCancelBtn.addEventListener('click', closeConfirmModal);
    
    // Viewer controls
    viewerClose.addEventListener('click', closeViewer);
    viewerPrev.addEventListener('click', showPrevMedia);
    viewerNext.addEventListener('click', showNextMedia);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (viewerModal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') showPrevMedia();
            if (e.key === 'ArrowRight') showNextMedia();
            if (e.key === 'Escape') closeViewer();
        }
    });
}

// Load app info
async function loadAppInfo() {
    try {
        const response = await fetch('/api/info');
        const data = await response.json();
        headerInfo.innerHTML = `📁 ${data.bucket}/${data.folder} • 🌍 ${data.region}`;
    } catch (error) {
        console.error('Error loading app info:', error);
    }
}

// Load media from API
async function loadMedia() {
    try {
        mediaGrid.innerHTML = '<div class="loading">Loading media...</div>';
        
        const response = await fetch('/api/media');
        if (!response.ok) throw new Error('Failed to load media');
        
        const data = await response.json();
        allMedia = data.media;
        selectedKeys.clear();
        updateUI();
    } catch (error) {
        console.error('Error loading media:', error);
        mediaGrid.innerHTML = '<div class="loading" style="color: red;">Error loading media</div>';
        showNotification('Error loading media: ' + error.message, 'error');
    }
}

// Update UI
function updateUI() {
    filterMedia();
    updateStats();
    updateButtons();
}

// Update statistics
function updateStats() {
    const data = {
        total: allMedia.length,
        images: allMedia.filter(m => m.type === 'image').length,
        videos: allMedia.filter(m => m.type === 'video').length,
        totalSize: allMedia.reduce((sum, m) => sum + m.size, 0),
        totalSizeFormatted: formatBytes(allMedia.reduce((sum, m) => sum + m.size, 0))
    };
    
    stats.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Files</div>
            <div class="stat-value">${data.total}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Images</div>
            <div class="stat-value">${data.images}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Videos</div>
            <div class="stat-value">${data.videos}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Size</div>
            <div class="stat-value">${data.totalSizeFormatted}</div>
        </div>
    `;
}

// Filter media
function filterMedia() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterType.value;
    
    filteredMedia = allMedia.filter(media => {
        const matchesSearch = media.name.toLowerCase().includes(searchTerm);
        const matchesFilter = !filterValue || media.type === filterValue;
        return matchesSearch && matchesFilter;
    });
    
    renderMedia();
}

// Render media grid
function renderMedia() {
    mediaGrid.innerHTML = '';
    
    if (filteredMedia.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    filteredMedia.forEach(media => {
        const card = createMediaCard(media);
        mediaGrid.appendChild(card);
    });
}

// Create media card
function createMediaCard(media) {
    const isSelected = selectedKeys.has(media.key);
    
    const card = document.createElement('div');
    card.className = `media-card ${isSelected ? 'selected' : ''}`;
    
    // Preview
    let preview = '';
    if (media.type === 'image') {
        preview = `<img src="${media.url}" alt="${media.name}" loading="lazy">`;
    } else if (media.type === 'video') {
        preview = `<video controls style="width: 100%; height: 100%; object-fit: cover;"><source src="${media.url}"></video>`;
    } else {
        preview = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f3f4f6;">📄</div>`;
    }
    
    card.innerHTML = `
        <div class="media-preview">
            ${preview}
            <span class="media-type-badge">${media.type}</span>
            <input type="checkbox" class="media-checkbox" ${isSelected ? 'checked' : ''}>
        </div>
        <div class="media-info">
            <div class="media-name">${media.name}</div>
            <div class="media-meta">${media.sizeFormatted}</div>
            <div class="media-meta">${new Date(media.lastModified).toLocaleDateString()}</div>
            <div class="media-actions">
                <a href="${media.url}" target="_blank" title="View in new tab">👁️ View</a>
                <button class="delete-btn" title="Delete this file">🗑️ Delete</button>
            </div>
        </div>
    `;
    
    // Checkbox handler
    const checkbox = card.querySelector('.media-checkbox');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        if (e.target.checked) {
            selectedKeys.add(media.key);
            card.classList.add('selected');
        } else {
            selectedKeys.delete(media.key);
            card.classList.remove('selected');
        }
        updateButtons();
    });
    
    // Delete button handler
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmModal(
            'Delete File',
            `Are you sure you want to delete "${media.name}"?`,
            () => deleteFile(media.key)
        );
    });
    
    // Click to view
    const previewElement = card.querySelector('.media-preview');
    previewElement.addEventListener('click', (e) => {
        if (!e.target.closest('input, button')) {
            currentViewerIndex = filteredMedia.indexOf(media);
            showViewer();
        }
    });
    
    return card;
}

// Select all media
function selectAllMedia() {
    filteredMedia.forEach(media => {
        selectedKeys.add(media.key);
    });
    renderMedia();
    updateButtons();
}

// Deselect all media
function deselectAllMedia() {
    selectedKeys.clear();
    renderMedia();
    updateButtons();
}

// Update button states
function updateButtons() {
    const hasSelected = selectedKeys.size > 0;
    deleteSelectedBtn.disabled = !hasSelected;
    deleteClearBtn.disabled = allMedia.length === 0;
}

// Delete single file
async function deleteFile(key) {
    try {
        const response = await fetch('/api/media', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });
        
        if (!response.ok) throw new Error('Failed to delete file');
        
        const data = await response.json();
        showNotification(`✓ ${data.message}`, 'success');
        await loadMedia();
    } catch (error) {
        console.error('Error deleting file:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Delete selected files
function deleteSelected() {
    const count = selectedKeys.size;
    showConfirmModal(
        'Delete Selected Files',
        `Are you sure you want to delete ${count} file(s)? This cannot be undone.`,
        async () => {
            try {
                const response = await fetch('/api/media/delete-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keys: Array.from(selectedKeys) })
                });
                
                if (!response.ok) throw new Error('Failed to delete files');
                
                const data = await response.json();
                showNotification(`✓ ${data.message}`, 'success');
                await loadMedia();
            } catch (error) {
                console.error('Error deleting files:', error);
                showNotification('Error: ' + error.message, 'error');
            }
        }
    );
}

// Delete all files
function deleteAll() {
    if (allMedia.length === 0) return;
    
    showConfirmModal(
        '⚠️ Delete ALL Files',
        `This will permanently delete ALL ${allMedia.length} file(s). Type "DELETE" to confirm.`,
        async (confirmed) => {
            const input = prompt('Type "DELETE" to confirm:');
            if (input !== 'DELETE') {
                showNotification('Deletion cancelled', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/media/delete-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keys: allMedia.map(m => m.key) })
                });
                
                if (!response.ok) throw new Error('Failed to delete all files');
                
                const data = await response.json();
                showNotification(`✓ ${data.message}`, 'success');
                await loadMedia();
            } catch (error) {
                console.error('Error deleting all files:', error);
                showNotification('Error: ' + error.message, 'error');
            }
        },
        true
    );
}

// Show confirmation modal
let confirmCallback = null;
function showConfirmModal(title, message, callback, isDeleteAll = false) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmCallback = callback;
    confirmModal.style.display = 'flex';
    confirmOkBtn.textContent = isDeleteAll ? 'Type to confirm' : 'Confirm';
    confirmOkBtn.onclick = () => {
        if (isDeleteAll) {
            closeConfirmModal();
            callback();
        } else {
            closeConfirmModal();
            callback();
        }
    };
}

// Close confirmation modal
function closeConfirmModal() {
    confirmModal.style.display = 'none';
    confirmCallback = null;
}

// Show notification
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 4000);
}

// Format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Close modal on outside click
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        closeConfirmModal();
    }
});

// Close viewer on outside click
viewerModal.addEventListener('click', (e) => {
    if (e.target === viewerModal) {
        closeViewer();
    }
});

// Viewer functions
function showViewer() {
    if (currentViewerIndex < 0 || currentViewerIndex >= filteredMedia.length) return;
    
    const media = filteredMedia[currentViewerIndex];
    viewerContent.innerHTML = '';
    
    if (media.type === 'image') {
        viewerContent.innerHTML = `<img src="${media.url}" alt="${media.name}">`;
    } else if (media.type === 'video') {
        viewerContent.innerHTML = `<video controls style="max-width: 100%; max-height: 100%;"><source src="${media.url}"></video>`;
    }
    
    viewerInfo.innerHTML = `
        <strong>${media.name}</strong> • ${media.sizeFormatted} • ${new Date(media.lastModified).toLocaleDateString()}
        <br><span style="opacity: 0.7;">${currentViewerIndex + 1} / ${filteredMedia.length}</span>
    `;
    
    viewerModal.style.display = 'flex';
}

function closeViewer() {
    viewerModal.style.display = 'none';
    currentViewerIndex = -1;
}

function showNextMedia() {
    if (currentViewerIndex < filteredMedia.length - 1) {
        currentViewerIndex++;
        showViewer();
    }
}

function showPrevMedia() {
    if (currentViewerIndex > 0) {
        currentViewerIndex--;
        showViewer();
    }
}
