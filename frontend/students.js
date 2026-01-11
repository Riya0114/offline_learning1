// Students Page Logic
let studentsData = [];
let filteredStudents = [];
let currentPage = 1;
const studentsPerPage = 10;

// Initialize students page
async function initStudentsPage() {
    await loadStudents();
    updateStudentStats();
    renderStudentsTable();
    setupEventListeners();
}

// Load students from API
async function loadStudents() {
    try {
        const response = await fetch('http://localhost:8000/students/');
        if (response.ok) {
            studentsData = await response.json();
            filteredStudents = [...studentsData];
            updateVillageFilter();
        } else {
            throw new Error('Failed to load students');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Using cached student data', 'warning');
        // Load from local storage as fallback
        const cached = localStorage.getItem('students_cache');
        if (cached) {
            studentsData = JSON.parse(cached);
            filteredStudents = [...studentsData];
        }
    }
}

// Update student statistics
function updateStudentStats() {
    document.getElementById('total-students-count').textContent = studentsData.length;
    
    // Count male/female (simplified - in real app, you'd have gender field)
    const maleCount = Math.floor(studentsData.length * 0.6); // Example
    const femaleCount = studentsData.length - maleCount;
    
    document.getElementById('male-count').textContent = maleCount;
    document.getElementById('female-count').textContent = femaleCount;
    
    // Count unique villages
    const villages = new Set(studentsData.map(s => s.village).filter(Boolean));
    document.getElementById('villages-count').textContent = villages.size;
}

// Render students table
function renderStudentsTable() {
    const tbody = document.getElementById('students-table-body');
    if (!tbody) return;
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">
                    No students found. <a href="#" onclick="showAddStudentModal()">Add a student</a>
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    const pageStudents = filteredStudents.slice(startIndex, endIndex);
    
    // Update pagination controls
    updatePagination();
    
    // Render table rows
    tbody.innerHTML = pageStudents.map(student => `
        <tr>
            <td>${student.id}</td>
            <td>
                <div class="student-name-cell">
                    <div class="avatar">${student.name.charAt(0)}</div>
                    <div>
                        <strong>${student.name}</strong>
                        <small>${student.learning_style || 'Not specified'}</small>
                    </div>
                </div>
            </td>
            <td>${student.age || '-'}</td>
            <td><span class="grade-badge">Grade ${student.grade}</span></td>
            <td>${student.village || '-'}</td>
            <td>${student.contact || '-'}</td>
            <td>
                <div class="attendance-indicator">
                    <div class="attendance-bar">
                        <div class="attendance-fill" style="width: ${getRandomAttendance()}%"></div>
                    </div>
                    <span>${getRandomAttendance()}%</span>
                </div>
            </td>
            <td>
                <span class="status-badge ${getStudentStatus(student)}">
                    ${getStudentStatus(student).toUpperCase()}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewStudentDetails(${student.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editStudent(${student.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteStudent(${student.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Helper functions
function getRandomAttendance() {
    return Math.floor(Math.random() * 30) + 70; // 70-100%
}

function getStudentStatus(student) {
    // In a real app, this would check actual performance data
    const statuses = ['active', 'average', 'at-risk'];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

// Filter and search functions
function filterStudents() {
    const gradeFilter = document.getElementById('filter-grade').value;
    const villageFilter = document.getElementById('filter-village').value;
    const searchTerm = document.getElementById('search-students').value.toLowerCase();
    
    filteredStudents = studentsData.filter(student => {
        // Apply grade filter
        if (gradeFilter && student.grade !== gradeFilter) return false;
        
        // Apply village filter
        if (villageFilter && student.village !== villageFilter) return false;
        
        // Apply search filter
        if (searchTerm) {
            return student.name.toLowerCase().includes(searchTerm) ||
                   student.village?.toLowerCase().includes(searchTerm) ||
                   student.school?.toLowerCase().includes(searchTerm);
        }
        
        return true;
    });
    
    currentPage = 1;
    renderStudentsTable();
}

function updateVillageFilter() {
    const select = document.getElementById('filter-village');
    const villages = new Set(studentsData.map(s => s.village).filter(Boolean));
    
    select.innerHTML = '<option value="">All Villages</option>' +
        Array.from(villages).map(village => 
            `<option value="${village}">${village}</option>`
        ).join('');
}

// Pagination functions
function updatePagination() {
    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderStudentsTable();
    }
}

// Modal functions
function showAddStudentModal() {
    document.getElementById('add-student-modal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'add-student-modal') {
        document.getElementById('student-form').reset();
    }
}

// Student CRUD operations
async function saveStudent(event) {
    event.preventDefault();
    
    const studentData = {
        name: document.getElementById('new-student-name').value,
        age: parseInt(document.getElementById('new-student-age').value) || null,
        grade: document.getElementById('new-student-grade').value,
        village: document.getElementById('new-student-village').value,
        school: document.getElementById('new-student-school').value || null,
        contact: document.getElementById('new-student-contact').value || null,
        learning_style: document.getElementById('new-student-learning-style').value || null
    };
    
    try {
        const response = await fetch('http://localhost:8000/students/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentData)
        });
        
        if (response.ok) {
            const newStudent = await response.json();
            studentsData.push(newStudent);
            closeModal('add-student-modal');
            showToast('Student added successfully!', 'success');
            filterStudents();
            updateStudentStats();
        } else {
            throw new Error('Failed to save student');
        }
    } catch (error) {
        console.error('Error saving student:', error);
        showToast('Failed to save student. Please try again.', 'error');
    }
}

async function viewStudentDetails(studentId) {
    try {
        const response = await fetch(`http://localhost:8000/students/${studentId}`);
        if (response.ok) {
            const student = await response.json();
            
            // Also get attendance and activities for this student
            const attendanceResp = await fetch(`http://localhost:8000/attendance/student/${studentId}`);
            const attendance = attendanceResp.ok ? await attendanceResp.json() : [];
            
            const activitiesResp = await fetch(`http://localhost:8000/activities/student/${studentId}`);
            const activities = activitiesResp.ok ? await activitiesResp.json() : [];
            
            showStudentDetailsModal(student, attendance, activities);
        }
    } catch (error) {
        console.error('Error loading student details:', error);
        showToast('Failed to load student details', 'error');
    }
}

function showStudentDetailsModal(student, attendance = [], activities = []) {
    const modal = document.getElementById('student-details-modal');
    const nameElement = document.getElementById('student-details-name');
    const contentElement = document.getElementById('student-details-content');
    
    nameElement.textContent = student.name;
    
    // Calculate attendance percentage
    const attendanceRate = attendance.length > 0 
        ? Math.round((attendance.filter(a => a.present).length / attendance.length) * 100)
        : 0;
    
    // Calculate average activity score
    const scores = activities.filter(a => a.score).map(a => a.score);
    const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    
    contentElement.innerHTML = `
        <div class="student-details-grid">
            <div class="detail-card">
                <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Age:</span>
                    <span class="detail-value">${student.age || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Grade:</span>
                    <span class="detail-value">Grade ${student.grade}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Village:</span>
                    <span class="detail-value">${student.village || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">School:</span>
                    <span class="detail-value">${student.school || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Learning Style:</span>
                    <span class="detail-value">${student.learning_style || 'Not specified'}</span>
                </div>
            </div>
            
            <div class="detail-card">
                <h3><i class="fas fa-chart-line"></i> Performance</h3>
                <div class="detail-row">
                    <span class="detail-label">Attendance Rate:</span>
                    <span class="detail-value">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${attendanceRate}%"></div>
                        </div>
                        ${attendanceRate}%
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Average Score:</span>
                    <span class="detail-value">${avgScore}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Activities Completed:</span>
                    <span class="detail-value">${activities.filter(a => a.completed).length}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Last Activity:</span>
                    <span class="detail-value">${activities.length > 0 ? formatDate(activities[0].start_time) : 'Never'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-actions">
            <button class="btn-primary" onclick="markAttendanceForStudent(${student.id})">
                <i class="fas fa-clipboard-check"></i> Mark Attendance
            </button>
            <button class="btn-secondary" onclick="startLearningActivity(${student.id})">
                <i class="fas fa-book"></i> Start Learning Activity
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
}

async function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
        const response = await fetch(`http://localhost:8000/students/${studentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            studentsData = studentsData.filter(s => s.id !== studentId);
            showToast('Student deleted successfully', 'success');
            filterStudents();
            updateStudentStats();
        } else {
            throw new Error('Failed to delete student');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showToast('Failed to delete student', 'error');
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('search-students');
    if (searchInput) {
        searchInput.addEventListener('input', filterStudents);
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Initialize when page loads
if (window.location.pathname.includes('students.html')) {
    document.addEventListener('DOMContentLoaded', initStudentsPage);
}