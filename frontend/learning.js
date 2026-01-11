// Learning Activities Page
let learningData = [];
let studentsData = [];
let syllabusData = [];
let activitiesChart = null;
let progressChart = null;

// Initialize learning page
async function initLearningPage() {
    await loadStudents();
    await loadSyllabus();
    await loadLearningActivities();
    updateLearningSummary();
    renderActivitiesTable();
    setupLearningCharts();
    setupLearningEventListeners();
    
    // Set current date and time
    const now = new Date();
    document.getElementById('activity-date').value = now.toISOString().split('T')[0];
    document.getElementById('activity-time').value = now.toTimeString().slice(0, 5);
}

// Load students
async function loadStudents() {
    try {
        const response = await fetch('http://localhost:8000/students/');
        if (response.ok) {
            studentsData = await response.json();
            populateStudentDropdown();
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Load syllabus
async function loadSyllabus() {
    try {
        const response = await fetch('http://localhost:8000/syllabus/');
        if (response.ok) {
            syllabusData = await response.json();
            populateSyllabusDropdown();
        }
    } catch (error) {
        console.error('Error loading syllabus:', error);
    }
}

// Load learning activities
async function loadLearningActivities() {
    try {
        const response = await fetch('http://localhost:8000/activities/');
        if (response.ok) {
            learningData = await response.json();
        }
    } catch (error) {
        console.error('Error loading learning activities:', error);
    }
}

// Populate student dropdown
function populateStudentDropdown() {
    const select = document.getElementById('activity-student');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Student</option>' + 
        studentsData.map(student => `
            <option value="${student.id}">${student.name} (Grade ${student.grade})</option>
        `).join('');
}

// Populate syllabus dropdown
function populateSyllabusDropdown() {
    const select = document.getElementById('activity-syllabus');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Topic</option>' + 
        syllabusData.map(item => `
            <option value="${item.id}">${item.subject} - ${item.chapter}: ${item.topic}</option>
        `).join('');
}

// Update learning summary
function updateLearningSummary() {
    const totalActivities = learningData.length;
    const completedActivities = learningData.filter(a => a.completed).length;
    const totalStudyTime = learningData.reduce((sum, a) => sum + (a.duration || 0), 0);
    const avgScore = learningData.length > 0 
        ? (learningData.reduce((sum, a) => sum + (a.score || 0), 0) / learningData.length).toFixed(1)
        : 0;
    
    document.getElementById('total-activities').textContent = totalActivities;
    document.getElementById('completed-activities').textContent = completedActivities;
    document.getElementById('total-study-hours').textContent = (totalStudyTime / 60).toFixed(1);
    document.getElementById('avg-score').textContent = avgScore;
}

// Render activities table
function renderActivitiesTable() {
    const tbody = document.getElementById('activities-table-body');
    if (!tbody) return;
    
    if (learningData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">
                    No learning activities recorded yet.
                    <button onclick="showStartActivityModal()" class="btn-text">Start a new activity</button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = learningData.map(activity => {
        const student = studentsData.find(s => s.id === activity.student_id) || {};
        const syllabus = syllabusData.find(s => s.id === activity.syllabus_id) || {};
        
        return `
            <tr>
                <td>
                    <div class="student-name-cell">
                        <div class="avatar">${student.name ? student.name.charAt(0) : '?'}</div>
                        <div>
                            <strong>${student.name || 'Unknown Student'}</strong>
                            <small>ID: ${activity.student_id}</small>
                        </div>
                    </div>
                </td>
                <td>${syllabus.subject || '-'}</td>
                <td>${syllabus.chapter || '-'}</td>
                <td>${syllabus.topic || '-'}</td>
                <td>
                    <span class="status-badge ${activity.completed ? 'completed' : 'in-progress'}">
                        ${activity.completed ? 'COMPLETED' : 'IN PROGRESS'}
                    </span>
                </td>
                <td>${activity.duration ? `${activity.duration} min` : '-'}</td>
                <td>${activity.score ? `${activity.score}/100` : '-'}</td>
                <td>${activity.start_time ? formatDateTime(activity.start_time) : '-'}</td>
                <td>
                    <div class="action-buttons">
                        ${!activity.completed ? `
                            <button class="action-btn complete" onclick="completeActivity(${activity.id})">
                                <i class="fas fa-check"></i>
                                Complete
                            </button>
                        ` : ''}
                        <button class="action-btn edit" onclick="editActivity(${activity.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteActivity(${activity.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Setup learning charts
function setupLearningCharts() {
    const ctx1 = document.getElementById('activities-chart');
    const ctx2 = document.getElementById('progress-chart');
    
    if (ctx1) {
        activitiesChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Activities',
                    data: [5, 7, 3, 8, 6, 2, 1],
                    backgroundColor: '#4CAF50',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    if (ctx2) {
        progressChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: studentsData.map(s => s.name.substring(0, 10) + '...'),
                datasets: [{
                    label: 'Progress %',
                    data: studentsData.map(() => Math.random() * 100),
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

// Setup event listeners
function setupLearningEventListeners() {
    // Start activity button
    const startBtn = document.getElementById('start-activity-btn');
    if (startBtn) {
        startBtn.addEventListener('click', showStartActivityModal);
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            applyFilter(filter);
        });
    });
    
    // Search input
    const searchInput = document.getElementById('search-activities');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchActivities(this.value);
        });
    }
}

// Show start activity modal
function showStartActivityModal() {
    openModal('Start New Learning Activity', `
        <div class="form-group">
            <label for="modal-student">Select Student *</label>
            <select id="modal-student" class="form-control">
                <option value="">Choose student...</option>
                ${studentsData.map(s => `<option value="${s.id}">${s.name} - Grade ${s.grade}</option>`).join('')}
            </select>
        </div>
        
        <div class="form-group">
            <label for="modal-syllabus">Select Topic *</label>
            <select id="modal-syllabus" class="form-control">
                <option value="">Choose topic...</option>
                ${syllabusData.map(s => `<option value="${s.id}">${s.subject}: ${s.chapter} - ${s.topic}</option>`).join('')}
            </select>
        </div>
        
        <div class="form-group">
            <label for="modal-notes">Notes (Optional)</label>
            <textarea id="modal-notes" class="form-control" rows="3" placeholder="Add any notes about this activity..."></textarea>
        </div>
        
        <div class="modal-buttons">
            <button onclick="startNewActivity()" class="btn-primary">
                <i class="fas fa-play"></i> Start Activity
            </button>
            <button onclick="closeModal()" class="btn-secondary">Cancel</button>
        </div>
    `);
}

// Start new activity
async function startNewActivity() {
    const studentId = document.getElementById('modal-student').value;
    const syllabusId = document.getElementById('modal-syllabus').value;
    const notes = document.getElementById('modal-notes').value;
    
    if (!studentId || !syllabusId) {
        showLearningToast('Please select both student and topic', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8000/activities/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_id: parseInt(studentId),
                syllabus_id: parseInt(syllabusId),
                notes: notes
            })
        });
        
        if (response.ok) {
            const activity = await response.json();
            closeModal();
            showLearningToast('Activity started successfully!', 'success');
            
            // Add to local data
            learningData.unshift(activity);
            updateLearningSummary();
            renderActivitiesTable();
            updateLearningCharts();
            
            // Auto-redirect to activity page or show timer
            showActivityTimer(activity.id);
        }
    } catch (error) {
        console.error('Error starting activity:', error);
        showLearningToast('Error starting activity', 'error');
    }
}

// Complete activity
async function completeActivity(activityId) {
    const score = prompt('Enter score (0-100):', '85');
    if (score === null) return;
    
    const numericScore = parseFloat(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
        showLearningToast('Please enter a valid score between 0 and 100', 'error');
        return;
    }
    
    const notes = prompt('Add completion notes (optional):', '');
    
    try {
        const response = await fetch(`http://localhost:8000/activities/${activityId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                score: numericScore,
                notes: notes
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update local data
            const activity = learningData.find(a => a.id === activityId);
            if (activity) {
                activity.completed = true;
                activity.score = numericScore;
                activity.end_time = new Date().toISOString();
                activity.duration = result.duration_minutes;
                activity.notes = notes;
            }
            
            updateLearningSummary();
            renderActivitiesTable();
            updateLearningCharts();
            
            showLearningToast(`Activity completed! Score: ${numericScore}`, 'success');
        }
    } catch (error) {
        console.error('Error completing activity:', error);
        showLearningToast('Error completing activity', 'error');
    }
}

// Edit activity
function editActivity(activityId) {
    const activity = learningData.find(a => a.id === activityId);
    if (!activity) return;
    
    const student = studentsData.find(s => s.id === activity.student_id);
    const syllabus = syllabusData.find(s => s.id === activity.syllabus_id);
    
    openModal('Edit Learning Activity', `
        <div class="form-group">
            <label>Student</label>
            <input type="text" value="${student?.name || 'Unknown'}" readonly>
        </div>
        
        <div class="form-group">
            <label>Topic</label>
            <input type="text" value="${syllabus?.topic || 'Unknown'}" readonly>
        </div>
        
        <div class="form-group">
            <label>Score</label>
            <input type="number" id="edit-activity-score" value="${activity.score || ''}" min="0" max="100" step="0.1">
        </div>
        
        <div class="form-group">
            <label>Duration (minutes)</label>
            <input type="number" id="edit-activity-duration" value="${activity.duration || ''}" min="1">
        </div>
        
        <div class="form-group">
            <label>Notes</label>
            <textarea id="edit-activity-notes" rows="3">${activity.notes || ''}</textarea>
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" id="edit-activity-completed" ${activity.completed ? 'checked' : ''}>
                Mark as completed
            </label>
        </div>
        
        <div class="modal-buttons">
            <button onclick="updateActivity(${activityId})" class="btn-primary">Update</button>
            <button onclick="closeModal()" class="btn-secondary">Cancel</button>
        </div>
    `);
}

// Update activity
async function updateActivity(activityId) {
    const score = parseFloat(document.getElementById('edit-activity-score').value) || null;
    const duration = parseFloat(document.getElementById('edit-activity-duration').value) || null;
    const notes = document.getElementById('edit-activity-notes').value;
    const completed = document.getElementById('edit-activity-completed').checked;
    
    try {
        const response = await fetch(`http://localhost:8000/activities/${activityId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                score: score,
                duration: duration,
                notes: notes,
                completed: completed
            })
        });
        
        if (response.ok) {
            closeModal();
            showLearningToast('Activity updated successfully', 'success');
            
            // Reload data
            await loadLearningActivities();
            updateLearningSummary();
            renderActivitiesTable();
            updateLearningCharts();
        }
    } catch (error) {
        console.error('Error updating activity:', error);
        showLearningToast('Error updating activity', 'error');
    }
}

// Delete activity
async function deleteActivity(activityId) {
    const confirmDelete = confirm('Are you sure you want to delete this activity?');
    if (!confirmDelete) return;
    
    try {
        const response = await fetch(`http://localhost:8000/activities/${activityId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showLearningToast('Activity deleted successfully', 'success');
            
            // Remove from local data
            learningData = learningData.filter(a => a.id !== activityId);
            updateLearningSummary();
            renderActivitiesTable();
            updateLearningCharts();
        }
    } catch (error) {
        console.error('Error deleting activity:', error);
        showLearningToast('Error deleting activity', 'error');
    }
}

// Show activity timer
function showActivityTimer(activityId) {
    openModal('Activity in Progress', `
        <div class="timer-container">
            <div class="timer-display">
                <div id="timer">00:00:00</div>
                <div class="timer-label">Elapsed Time</div>
            </div>
            
            <div class="timer-controls">
                <button onclick="pauseTimer()" class="btn-secondary">
                    <i class="fas fa-pause"></i> Pause
                </button>
                <button onclick="completeActivity(${activityId})" class="btn-primary">
                    <i class="fas fa-check"></i> Complete Now
                </button>
                <button onclick="stopActivity()" class="btn-danger">
                    <i class="fas fa-stop"></i> Stop
                </button>
            </div>
            
            <div class="timer-notes">
                <textarea id="timer-notes" placeholder="Add notes as you go..." rows="3"></textarea>
            </div>
        </div>
    `);
    
    // Start timer
    startTimer();
}

// Timer functions
let timerInterval;
let seconds = 0;

function startTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        seconds++;
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    document.getElementById('timer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function pauseTimer() {
    clearInterval(timerInterval);
    showLearningToast('Timer paused', 'info');
}

function stopActivity() {
    clearInterval(timerInterval);
    closeModal();
    showLearningToast('Activity stopped', 'warning');
}

// Apply filter
function applyFilter(filter) {
    let filteredData = [...learningData];
    
    switch(filter) {
        case 'completed':
            filteredData = filteredData.filter(a => a.completed);
            break;
        case 'in-progress':
            filteredData = filteredData.filter(a => !a.completed);
            break;
        case 'today':
            const today = new Date().toISOString().split('T')[0];
            filteredData = filteredData.filter(a => 
                a.start_time && a.start_time.startsWith(today)
            );
            break;
        case 'this-week':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filteredData = filteredData.filter(a => 
                a.start_time && new Date(a.start_time) > weekAgo
            );
            break;
    }
    
    renderFilteredTable(filteredData);
}

// Render filtered table
function renderFilteredTable(filteredData) {
    const tbody = document.getElementById('activities-table-body');
    if (!tbody) return;
    
    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">
                    No activities match the selected filter.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredData.map(activity => {
        const student = studentsData.find(s => s.id === activity.student_id) || {};
        const syllabus = syllabusData.find(s => s.id === activity.syllabus_id) || {};
        
        return `
            <tr>
                <td>
                    <div class="student-name-cell">
                        <div class="avatar">${student.name ? student.name.charAt(0) : '?'}</div>
                        <div>
                            <strong>${student.name || 'Unknown Student'}</strong>
                            <small>ID: ${activity.student_id}</small>
                        </div>
                    </div>
                </td>
                <td>${syllabus.subject || '-'}</td>
                <td>${syllabus.chapter || '-'}</td>
                <td>${syllabus.topic || '-'}</td>
                <td>
                    <span class="status-badge ${activity.completed ? 'completed' : 'in-progress'}">
                        ${activity.completed ? 'COMPLETED' : 'IN PROGRESS'}
                    </span>
                </td>
                <td>${activity.duration ? `${activity.duration} min` : '-'}</td>
                <td>${activity.score ? `${activity.score}/100` : '-'}</td>
                <td>${activity.start_time ? formatDateTime(activity.start_time) : '-'}</td>
                <td>
                    <div class="action-buttons">
                        ${!activity.completed ? `
                            <button class="action-btn complete" onclick="completeActivity(${activity.id})">
                                <i class="fas fa-check"></i>
                                Complete
                            </button>
                        ` : ''}
                        <button class="action-btn edit" onclick="editActivity(${activity.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Search activities
function searchActivities(query) {
    if (!query.trim()) {
        renderActivitiesTable();
        return;
    }
    
    const searchLower = query.toLowerCase();
    const filteredData = learningData.filter(activity => {
        const student = studentsData.find(s => s.id === activity.student_id);
        const syllabus = syllabusData.find(s => s.id === activity.syllabus_id);
        
        return (
            (student?.name?.toLowerCase().includes(searchLower)) ||
            (syllabus?.subject?.toLowerCase().includes(searchLower)) ||
            (syllabus?.chapter?.toLowerCase().includes(searchLower)) ||
            (syllabus?.topic?.toLowerCase().includes(searchLower)) ||
            (activity.notes?.toLowerCase().includes(searchLower))
        );
    });
    
    renderFilteredTable(filteredData);
}

// Update learning charts
function updateLearningCharts() {
    if (!activitiesChart || !progressChart) return;
    
    // Update activities by day chart
    const weeklyData = calculateWeeklyActivities();
    activitiesChart.data.datasets[0].data = weeklyData;
    activitiesChart.update();
    
    // Update progress chart
    const progressData = calculateStudentProgress();
    progressChart.data.labels = progressData.map(p => p.name.substring(0, 10) + '...');
    progressChart.data.datasets[0].data = progressData.map(p => p.progress);
    progressChart.update();
}

// Calculate weekly activities
function calculateWeeklyActivities() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [0, 0, 0, 0, 0, 0, 0];
    
    learningData.forEach(activity => {
        if (activity.start_time) {
            const date = new Date(activity.start_time);
            const dayDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
            if (dayDiff >= 0 && dayDiff < 7) {
                result[6 - dayDiff]++;
            }
        }
    });
    
    return result;
}

// Calculate student progress
function calculateStudentProgress() {
    return studentsData.map(student => {
        const studentActivities = learningData.filter(a => a.student_id === student.id);
        if (studentActivities.length === 0) return { name: student.name, progress: 0 };
        
        const completed = studentActivities.filter(a => a.completed).length;
        const progress = (completed / studentActivities.length) * 100;
        
        return { name: student.name, progress: Math.round(progress) };
    });
}

// Toast for learning page
function showLearningToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '1000';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Format date time
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 168) { // 7 days
        return `${Math.floor(diffHours / 24)} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('activities-table-body')) {
        initLearningPage();
    }
});