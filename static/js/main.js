// State Management
let releaseNotesData = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const feedTimeline = document.getElementById('feed-timeline');
const loadingSpinner = document.getElementById('loading-spinner');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const btnRefresh = document.getElementById('btn-refresh');
const refreshIcon = document.getElementById('refresh-icon');
const inputSearch = document.getElementById('input-search');
const filterTagsContainer = document.getElementById('filter-tags-container');
const btnRetry = document.getElementById('btn-retry');

// Stats Counters
const countTotal = document.getElementById('count-total');
const countFeatures = document.getElementById('count-features');
const countIssues = document.getElementById('count-issues');
const countAnnouncements = document.getElementById('count-announcements');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const charWarning = document.getElementById('char-warning');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelTweet = document.getElementById('btn-cancel-tweet');
const btnSubmitTweet = document.getElementById('btn-submit-tweet');

/* ----------------------------------------------------
   API CALLS & FEED FETCHING
   ---------------------------------------------------- */
async function fetchReleaseNotes() {
    // Show spinner & hide list/error/empty
    setLoadingState(true);
    
    try {
        const response = await fetch('/api/release-notes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        
        if (json.status === 'success') {
            releaseNotesData = json.data;
            calculateStats(releaseNotesData);
            applyFiltersAndRender();
        } else {
            throw new Error(json.message || 'Unknown error occurred while parsing the feed.');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        setErrorState(error.message);
    } finally {
        setLoadingState(false);
    }
}

/* ----------------------------------------------------
   STATE DISPLAY UTILITIES
   ---------------------------------------------------- */
function setLoadingState(isLoading) {
    if (isLoading) {
        loadingSpinner.classList.remove('hidden');
        feedTimeline.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        refreshIcon.classList.add('spinning');
        btnRefresh.disabled = true;
    } else {
        loadingSpinner.classList.add('hidden');
        refreshIcon.classList.remove('spinning');
        btnRefresh.disabled = false;
    }
}

function setErrorState(msg) {
    errorState.classList.remove('hidden');
    errorMessage.textContent = msg;
    feedTimeline.classList.add('hidden');
    emptyState.classList.add('hidden');
}

function calculateStats(data) {
    let totalItems = 0;
    let featuresCount = 0;
    let issuesCount = 0;
    let announcementsCount = 0;
    
    data.forEach(entry => {
        entry.updates.forEach(update => {
            totalItems++;
            if (update.type.toLowerCase() === 'feature') featuresCount++;
            else if (update.type.toLowerCase() === 'issue') issuesCount++;
            else if (update.type.toLowerCase() === 'announcement') announcementsCount++;
        });
    });
    
    countTotal.textContent = totalItems;
    countFeatures.textContent = featuresCount;
    countIssues.textContent = issuesCount;
    countAnnouncements.textContent = announcementsCount;
}

/* ----------------------------------------------------
   FILTERING & RENDERING LOGIC
   ---------------------------------------------------- */
function applyFiltersAndRender() {
    const filteredData = [];
    
    releaseNotesData.forEach(entry => {
        const matchingUpdates = entry.updates.filter(update => {
            // Category check
            const matchesCategory = currentFilter === 'all' || 
                update.type.toLowerCase() === currentFilter.toLowerCase();
            
            // Search query check
            const matchesSearch = !searchQuery || 
                update.plainText.toLowerCase().includes(searchQuery) ||
                update.type.toLowerCase().includes(searchQuery) ||
                entry.date.toLowerCase().includes(searchQuery);
                
            return matchesCategory && matchesSearch;
        });
        
        if (matchingUpdates.length > 0) {
            filteredData.push({
                ...entry,
                updates: matchingUpdates
            });
        }
    });
    
    if (filteredData.length === 0) {
        feedTimeline.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        renderTimeline(filteredData);
    }
}

function renderTimeline(data) {
    feedTimeline.innerHTML = '';
    
    data.forEach(entry => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'timeline-group';
        
        // Date Header
        const header = document.createElement('div');
        header.className = 'timeline-date-header';
        header.innerHTML = `
            <div class="timeline-dot"></div>
            <span class="timeline-date">${entry.date}</span>
        `;
        groupDiv.appendChild(header);
        
        // Sub-updates List
        entry.updates.forEach(update => {
            const card = document.createElement('article');
            card.className = 'release-note-card';
            card.id = update.id;
            
            // Generate unique badge class
            const badgeClass = `badge-${update.type.toLowerCase()}`;
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="badge-type ${badgeClass}">
                        <i class="${getIconForType(update.type)}"></i> ${update.type}
                    </span>
                    <div class="card-actions">
                        <label class="select-checkbox-wrapper" title="Select update to Tweet">
                            <input type="checkbox" class="card-selector-cb" data-id="${update.id}">
                            <span class="custom-checkbox">
                                <i class="fa-solid fa-check"></i>
                            </span>
                        </label>
                    </div>
                </div>
                <div class="card-content">
                    ${update.htmlContent}
                </div>
                <div class="card-footer" style="gap: 0.75rem;">
                    <button class="btn btn-copy-card" data-id="${update.id}">
                        <i class="fa-regular fa-copy"></i> Copy Note
                    </button>
                    <button class="btn btn-tweet-card" data-id="${update.id}">
                        <i class="fa-brands fa-x-twitter"></i> Share Update
                    </button>
                </div>
            `;
            
            // Add click listener to card selection checkbox
            const checkbox = card.querySelector('.card-selector-cb');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
            
            // Add click listener to Copy button
            const copyBtn = card.querySelector('.btn-copy-card');
            copyBtn.addEventListener('click', () => {
                copyUpdateToClipboard(entry.date, update, entry.link, copyBtn);
            });
            
            // Add click listener to Share button
            const shareBtn = card.querySelector('.btn-tweet-card');
            shareBtn.addEventListener('click', () => {
                prepareAndOpenTweetModal(entry.date, update, entry.link);
            });
            
            groupDiv.appendChild(card);
        });
        
        feedTimeline.appendChild(groupDiv);
    });
    
    feedTimeline.classList.remove('hidden');
}

function getIconForType(type) {
    switch (type.toLowerCase()) {
        case 'feature': return 'fa-solid fa-circle-plus';
        case 'announcement': return 'fa-solid fa-bullhorn';
        case 'breaking': return 'fa-solid fa-triangle-exclamation';
        case 'issue': return 'fa-solid fa-bug';
        case 'change': return 'fa-solid fa-shuffle';
        default: return 'fa-solid fa-info-circle';
    }
}

/* ----------------------------------------------------
   TWEET MODAL & COMPOSER LOGIC
   ---------------------------------------------------- */
function prepareAndOpenTweetModal(date, update, originalLink) {
    const typeLabel = update.type.toUpperCase();
    const cleanText = update.plainText;
    
    // Structure template:
    // 📢 BigQuery [TYPE] Update (Date):
    // [Clean description text...]
    // 
    // 🔗 Link
    // #BigQuery #GoogleCloud
    const headerStr = `📢 BigQuery ${typeLabel} (${date}):\n`;
    const footerStr = `\n\n🔗 ${originalLink}\n#BigQuery #GoogleCloud`;
    
    const maxTextLen = 280 - headerStr.length - footerStr.length;
    let bodyText = cleanText;
    
    if (bodyText.length > maxTextLen) {
        bodyText = bodyText.substring(0, maxTextLen - 3) + '...';
    }
    
    const draftText = `${headerStr}${bodyText}${footerStr}`;
    
    tweetTextarea.value = draftText;
    updateCharCounter();
    
    // Show Modal
    tweetModal.classList.remove('hidden');
    tweetModal.setAttribute('aria-hidden', 'false');
    tweetTextarea.focus();
}

function updateCharCounter() {
    const len = tweetTextarea.value.length;
    charCounter.textContent = `${len} / 280`;
    
    if (len > 280) {
        charCounter.classList.add('warning');
        charWarning.classList.remove('hidden');
        btnSubmitTweet.disabled = true;
        btnSubmitTweet.style.opacity = '0.5';
    } else {
        charCounter.classList.remove('warning');
        charWarning.classList.add('hidden');
        btnSubmitTweet.disabled = false;
        btnSubmitTweet.style.opacity = '1';
    }
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
    tweetModal.setAttribute('aria-hidden', 'true');
}

/* ----------------------------------------------------
   EVENT LISTENERS
   ---------------------------------------------------- */
// Input Search (with debounce)
let searchTimeout;
inputSearch.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFiltersAndRender();
    }, 300);
});

// Filter Tags Click
filterTagsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tag');
    if (!btn) return;
    
    // Remove active class from all and add to clicked
    document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
    btn.classList.add('active');
    
    currentFilter = btn.dataset.type;
    applyFiltersAndRender();
});

// Clipboard Helper
async function copyUpdateToClipboard(date, update, link, button) {
    const textToCopy = `[BigQuery Release Notes - ${date} - ${update.type}]\n\n${update.plainText}\n\nRead more details: ${link}`;
    try {
        await navigator.clipboard.writeText(textToCopy);
        
        // Show success visual feedback
        const originalContent = button.innerHTML;
        button.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('Clipboard copy failed:', err);
    }
}

// CSV Export Helper
function exportFeedToCSV() {
    const csvRows = [];
    // Header
    csvRows.push(['Date', 'Type', 'Description', 'Link'].map(val => `"${val.replace(/"/g, '""')}"`).join(','));
    
    let count = 0;
    releaseNotesData.forEach(entry => {
        entry.updates.forEach(update => {
            const matchesCategory = currentFilter === 'all' || 
                update.type.toLowerCase() === currentFilter.toLowerCase();
            
            const matchesSearch = !searchQuery || 
                update.plainText.toLowerCase().includes(searchQuery) ||
                update.type.toLowerCase().includes(searchQuery) ||
                entry.date.toLowerCase().includes(searchQuery);
            
            if (matchesCategory && matchesSearch) {
                count++;
                const date = entry.date;
                const type = update.type;
                const desc = update.plainText;
                const link = entry.link;
                
                const row = [date, type, desc, link].map(val => {
                    const escaped = val.replace(/"/g, '""');
                    return `"${escaped}"`;
                });
                csvRows.push(row.join(','));
            }
        });
    });
    
    if (count === 0) {
        alert("No matching release notes to export.");
        return;
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bigquery_release_notes_${currentFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Theme Switcher Initialization
const checkboxTheme = document.getElementById('checkbox-theme');
const savedTheme = localStorage.getItem('theme') || 'dark';

if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    checkboxTheme.checked = true;
} else {
    document.body.classList.remove('light-mode');
    checkboxTheme.checked = false;
}

// Event Listeners
checkboxTheme.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    }
});

const btnExportCsv = document.getElementById('btn-export-csv');
btnExportCsv.addEventListener('click', exportFeedToCSV);

// Refresh Buttons
btnRefresh.addEventListener('click', fetchReleaseNotes);
btnRetry.addEventListener('click', fetchReleaseNotes);

// Modal Close Triggers
btnCloseModal.addEventListener('click', closeTweetModal);
btnCancelTweet.addEventListener('click', closeTweetModal);

// Close on clicking overlay background
tweetModal.addEventListener('click', (e) => {
    if (e.target === tweetModal) {
        closeTweetModal();
    }
});

// Textarea Char Count Change
tweetTextarea.addEventListener('input', updateCharCounter);

// Submit Tweet to X/Twitter
btnSubmitTweet.addEventListener('click', () => {
    const text = tweetTextarea.value;
    if (text.length > 280) return;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
});

// Initial Load
document.addEventListener('DOMContentLoaded', fetchReleaseNotes);
