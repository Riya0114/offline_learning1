// Configuration
const API_BASE_URL = 'http://localhost:8000';
const OFFLINE_MODE = false; // Change to true for completely offline mode

// Local storage keys
const STORAGE_KEYS = {
    STUDENTS: 'rural_learning_students',
    ATTENDANCE: 'rural_learning_attendance',
    ACTIVITIES: 'rural_learning_activities',
    SYLLABUS: 'rural_learning_syllabus',
    LAST_SYNC: 'rural_learning_last_sync'
};

// Application State
let appState = {
    students: [],
    attendance: [],
    activities: [],
    syllabus: [],
    offlineMode: OFFLINE_MODE
};

// Initialize Application
async function initApp() {
    showToast('System initialized', 'info');
    
    // Load from local storage first
    loadFromLocalStorage();
    
    // Try to sync with backend if online
    if (!appState.offlineMode) {
        await checkBackendConnection();
    }
    
    updateUI();
}

// API Service
const APIService = {
    async get(endpoint) {
        if (appState.offlineMode) {
            return this.getFromLocalStorage(endpoint);
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`);
            if (!response.ok) throw new Error('API request failed');
            return await response.json();
        } catch (error) {
            console.warn(`Falling back to local storage for ${endpoint}`);
            return this.getFromLocalStorage(endpoint);
        }
    },
    
    async post(endpoint, data) {
        if (appState.offlineMode) {
            return this.saveToLocalStorage(endpoint, data);
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) throw new Error('API request failed');
            
            const result = await response.json();
            this.saveToLocalStorage(endpoint, data, result.id);
            return result;
        } catch (error) {
            console.warn(`Saving to local storage for offline mode: ${endpoint}`);
            return this.saveToLocalStorage(endpoint, data);
        }
    },
    
    getFromLocalStorage(endpoint) {
        const key = this.getStorageKey(endpoint);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },
    
    saveToLocalStorage(endpoint, data, id = Date.now()) {
        const key = this.getStorageKey(endpoint);
        const item = { ...data, id, _offline: true, _synced: false };
        const existing = this.getFromLocalStorage(endpoint);
        existing.push(item);
        localStorage.setItem(key, JSON.stringify(existing));
        return item;
    },
    
    getStorageKey(endpoint) {
        if (endpoint.includes('/students')) return STORAGE_KEYS.STUDENTS;
        if (endpoint.includes('/attendance')) return STORAGE_KEYS.ATTENDANCE;
        if (endpoint.includes('/activities')) return STORAGE_KEYS.ACTIVITIES;
        if (endpoint.includes('/syllabus')) return STORAGE_KEYS.SYLLABUS;
        return 'rural_learning_data';
    }
};

// Data Management
async function loadDashboardData() {
    try {
        // Load all data in parallel
        const [students, attendance, activities, syllabus] = await Promise.all([
            APIService.get('/students/'),
            APIService.get('/attendance/today'),
            APIService.get('/activities/'),
            APIService.get('/syllabus/')
        ]);
        
        appState.students = students;
        appState.attendance = attendance;
        appState.activities = activities;
        appState.syllabus = syllabus;
        
        saveToLocalStorage();
        updateDashboard();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading data. Using cached information.', 'error');
    }
}

function updateDashboard() {
    // Update quick stats
    document.getElementById('total-students').textContent = appState.students.length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = appState.attendance.filter(a => 
        a.date && a.date.startsWith(today)
    );
    const presentCount = todayAttendance.filter(a => a.present).length;
    const attendanceRate = todayAttendance.length > 0 
        ? Math.round((presentCount / todayAttendance.length) * 100) 
        : 0;
    
    document.getElementById('attendance-rate').textContent = `${attendanceRate}%`;
    
    // Update recent activities
    updateRecentActivities();
    
    // Update alerts
    updateAlerts();
}

function updateRecentActivities() {
    const container = document.getElementById('recent-activities');
    if (!container) return;
    
    const recent = appState.activities
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
        .slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = '<div class="no-data">No recent activities found</div>';
        return;
    }
    
    container.innerHTML = recent.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-book"></i>
            </div>
            <div class="activity-content">
                <h4>${getStudentName(activity.student_id)} completed learning activity</h4>
                <p>${activity.notes || 'No additional notes'}</p>
            </div>
            <div class="activity-time">
                ${formatTime(activity.start_time)}
            </div>
        </div>
    `).join('');
}

function updateAlerts() {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    
    const alerts = generateAlerts();
    const countElement = document.querySelector('.alert-count');
    
    if (countElement) {
        countElement.textContent = alerts.length;
    }
    
    if (alerts.length === 0) {
        container.innerHTML = '<div class="no-alerts">No alerts at the moment</div>';
        return;
    }
    
    container.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.type}">
            <div class="alert-icon">
                <i class="fas fa-${alert.icon}"></i>
            </div>
            <div class="alert-content">
                <h4>${alert.title}</h4>
                <p>${alert.message}</p>
            </div>
        </div>
    `).join('');
}

function generateAlerts() {
    const alerts = [];
    
    // Check for low attendance
    appState.students.forEach(student => {
        const studentAttendance = appState.attendance.filter(a => a.student_id === student.id);
        if (studentAttendance.length > 0) {
            const presentCount = studentAttendance.filter(a => a.present).length;
            const attendanceRate = (presentCount / studentAttendance.length) * 100;
            
            if (attendanceRate < 70) {
                alerts.push({
                    type: 'warning',
                    icon: 'exclamation-triangle',
                    title: 'Low Attendance Alert',
                    message: `${student.name} has ${Math.round(attendanceRate)}% attendance rate`
                });
            }
        }
    });
    
    // Check for no recent activities
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const inactiveStudents = appState.students.filter(student => {
        const studentActivities = appState.activities.filter(a => 
            a.student_id === student.id && 
            new Date(a.start_time) > oneWeekAgo
        );
        return studentActivities.length === 0;
    });
    
    inactiveStudents.forEach(student => {
        alerts.push({
            type: 'info',
            icon: 'info-circle',
            title: 'Inactive Student',
            message: `${student.name} hasn't studied in the last 7 days`
        });
    });
    
    return alerts;
}

// Helper Functions
function getStudentName(studentId) {
    const student = appState.students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
}

function formatTime(dateString) {
    if (!dateString) return 'Just now';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Local Storage Functions
function loadFromLocalStorage() {
    try {
        appState.students = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || [];
        appState.attendance = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) || [];
        appState.activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) || [];
        appState.syllabus = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYLLABUS)) || [];
    } catch (error) {
        console.error('Error loading from local storage:', error);
    }
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(appState.students));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(appState.attendance));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(appState.activities));
    localStorage.setItem(STORAGE_KEYS.SYLLABUS, JSON.stringify(appState.syllabus));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
}

function updateLastSync() {
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    const element = document.getElementById('last-sync');
    if (element && lastSync) {
        const date = new Date(lastSync);
        element.textContent = date.toLocaleString();
    }
}

// UI Interaction Functions
async function markAttendance() {
    if (appState.students.length === 0) {
        showToast('No students available. Please add students first.', 'error');
        return;
    }
    
    // In a real app, this would open a modal for marking attendance
    const today = new Date().toISOString().split('T')[0];
    
    // Mark all as present for demo
    for (const student of appState.students) {
        await APIService.post('/attendance/', {
            student_id: student.id,
            present: true,
            date: today
        });
    }
    
    showToast('Attendance marked for all students', 'success');
    loadDashboardData();
}

function viewAnalytics() {
    window.location.href = 'analytics.html';
}

// Modal Management
function openModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button onclick="closeModal()" class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function addNewStudent() {
    openModal('Add New Student', `
        <div class="form-group">
            <label for="student-name">Full Name</label>
            <input type="text" id="student-name" placeholder="Enter student's full name">
        </div>
        
        <div class="form-group">
            <label for="student-age">Age</label>
            <input type="number" id="student-age" placeholder="Enter age">
        </div>
        
        <div class="form-group">
            <label for="student-grade">Grade</label>
            <select id="student-grade">
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5" selected>Grade 5</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="student-village">Village</label>
            <input type="text" id="student-village" placeholder="Enter village name">
        </div>
        
        <div class="form-group">
            <label for="student-contact">Contact</label>
            <input type="text" id="student-contact" placeholder="Enter contact number">
        </div>
        
        <div class="form-group">
            <label for="student-school">School</label>
            <input type="text" id="student-school" placeholder="Enter school name">
        </div>
        
        <div class="form-group">
            <label for="student-style">Learning Style</label>
            <select id="student-style">
                <option value="visual">Visual</option>
                <option value="auditory">Auditory</option>
                <option value="kinesthetic">Kinesthetic</option>
                <option value="reading">Reading/Writing</option>
            </select>
        </div>
        
        <div class="modal-buttons">
            <button onclick="saveNewStudent()" class="btn-primary">Save Student</button>
            <button onclick="closeModal()" class="btn-secondary">Cancel</button>
        </div>
    `);
}

// Add this function to handle saving the new student
async function saveNewStudent() {
    const name = document.getElementById('student-name').value.trim();
    const age = document.getElementById('student-age').value;
    const grade = document.getElementById('student-grade').value;
    const village = document.getElementById('student-village').value.trim();
    const contact = document.getElementById('student-contact').value.trim();
    const school = document.getElementById('student-school').value.trim();
    const learningStyle = document.getElementById('student-style').value;
    
    if (!name) {
        showToast('Please enter student name', 'error');
        return;
    }
    
    const studentData = {
        name,
        age: parseInt(age),
        grade,
        village,
        contact,
        school,
        learning_style: learningStyle
    };
    
    try {
        const result = await APIService.post('/students/', studentData);
        showToast('Student added successfully', 'success');
        closeModal();
        loadDashboardData(); // Refresh the dashboard
    } catch (error) {
        console.error('Error saving student:', error);
        showToast('Error saving student', 'error');
    }
}
async function checkBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            showToast('Connected to backend server', 'success');
            return true;
        }
    } catch (error) {
        console.warn('Backend connection failed, using offline mode');
        showToast('Running in offline mode', 'warning');
        appState.offlineMode = true;
        return false;
    }
}