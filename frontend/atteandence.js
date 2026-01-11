// Attendance Page Logic
let attendanceData = [];
let studentsData = [];
let attendanceChart = null;
let trendChart = null;

// Initialize attendance page
async function initAttendancePage() {
    await loadStudents();
    await loadAttendance();
    updateAttendanceSummary();
    renderAttendanceTable();
    setupCharts();
    setupEventListeners();
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendance-date').value = today;
    
    // Load attendance for today
    loadAttendanceForDate(today);
}

// Load students
async function loadStudents() {
    try {
        const response = await fetch('http://localhost:8000/students/');
        if (response.ok) {
            studentsData = await response.json();
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Load attendance data
async function loadAttendance() {
    try {
        const response = await fetch('http://localhost:8000/attendance/today');
        if (response.ok) {
            attendanceData = await response.json();
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

// Load attendance for specific date
async function loadAttendanceForDate(date) {
    try {
        // In a real app, you would have an endpoint for specific date
        // For now, we'll filter existing data
        const response = await fetch(`http://localhost:8000/attendance/`);
        if (response.ok) {
            const allAttendance = await response.json();
            attendanceData = allAttendance.filter(a => a.date && a.date.startsWith(date));
            updateAttendanceSummary();
            renderAttendanceTable();
            updateCharts();
        }
    } catch (error) {
        console.error('Error loading attendance for date:', error);
    }
}

// Update attendance summary
function updateAttendanceSummary() {
    const presentCount = attendanceData.filter(a => a.present).length;
    const absentCount = attendanceData.filter(a => !a.present).length;
    const totalCount = attendanceData.length;
    
    document.getElementById('present-count').textContent = presentCount;
    document.getElementById('absent-count').textContent = absentCount;
    document.getElementById('total-count').textContent = totalCount;
}

// Render attendance table
function renderAttendanceTable() {
    const tbody = document.getElementById('attendance-table-body');
    if (!tbody) return;
    
    if (attendanceData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    No attendance records for selected date.
                    <button onclick="markAttendanceForAllStudents()" class="btn-text">Mark attendance now</button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = attendanceData.map(record => {
        const student = studentsData.find(s => s.id === record.student_id) || {};
        return `
            <tr>
                <td>
                    <div class="student-name-cell">
                        <div class="avatar">${student.name ? student.name.charAt(0) : '?'}</div>
                        <div>
                            <strong>${student.name || 'Unknown Student'}</strong>
                            <small>ID: ${record.student_id}</small>
                        </div>
                    </div>
                </td>
                <td>${student.grade ? `Grade ${student.grade}` : '-'}</td>
                <td>${student.village || '-'}</td>
                <td>${record.subject || 'General'}</td>
                <td>
                    <span class="status-badge ${record.present ? 'present' : 'absent'}">
                        ${record.present ? 'PRESENT' : 'ABSENT'}
                    </span>
                </td>
                <td>${record.date ? formatTime(record.date) : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn ${record.present ? 'absent' : 'present'}" 
                                onclick="toggleAttendance(${record.id}, ${record.student_id}, ${!record.present})">
                            <i class="fas fa-${record.present ? 'times' : 'check'}"></i>
                            Mark ${record.present ? 'Absent' : 'Present'}
                        </button>
                        <button class="action-btn edit" onclick="editAttendanceRecord(${record.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Setup charts
function setupCharts() {
    const ctx1 = document.getElementById('attendance-chart');
    const ctx2 = document.getElementById('trend-chart');
    
    if (ctx1) {
        attendanceChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Absent'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#4CAF50', '#F44336'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    if (ctx2) {
        trendChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Attendance Rate',
                    data: [85, 82, 90, 88, 86, 0, 0],
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

// Update charts with real data
// ========== ADD MISSING FUNCTIONS ==========

// Mark attendance for all students
async function markAttendanceForAllStudents() {
    const dateInput = document.getElementById('attendance-date');
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    if (!studentsData.length) {
        alert('No students available. Please add students first.');
        return;
    }
    
    const confirmMark = confirm(`Mark attendance for ${studentsData.length} students for ${date}?`);
    if (!confirmMark) return;
    
    for (const student of studentsData) {
        await markAttendanceForStudent(student.id, date, true);
    }
    
    showAttendanceToast('Attendance marked for all students', 'success');
    loadAttendanceForDate(date);
}

// Toggle attendance status
async function toggleAttendance(attendanceId, studentId, newStatus) {
    try {
        const response = await fetch(`http://localhost:8000/attendance/${attendanceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                present: newStatus
            })
        });
        
        if (response.ok) {
            // Update local data
            const record = attendanceData.find(a => a.id === attendanceId);
            if (record) {
                record.present = newStatus;
            }
            
            updateAttendanceSummary();
            renderAttendanceTable();
            updateCharts();
            
            const statusText = newStatus ? 'Present' : 'Absent';
            showAttendanceToast(`Attendance updated to ${statusText}`, 'success');
        }
    } catch (error) {
        console.error('Error updating attendance:', error);
        showAttendanceToast('Error updating attendance', 'error');
    }
}

// Edit attendance record
function editAttendanceRecord(attendanceId) {
    const record = attendanceData.find(a => a.id === attendanceId);
    if (!record) return;
    
    const student = studentsData.find(s => s.id === record.student_id);
    
    openModal('Edit Attendance', `
        <div class="form-group">
            <label>Student</label>
            <input type="text" value="${student?.name || 'Unknown'}" readonly>
        </div>
        
        <div class="form-group">
            <label>Date</label>
            <input type="date" id="edit-attendance-date" value="${record.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0]}">
        </div>
        
        <div class="form-group">
            <label>Status</label>
            <select id="edit-attendance-status">
                <option value="true" ${record.present ? 'selected' : ''}>Present</option>
                <option value="false" ${!record.present ? 'selected' : ''}>Absent</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Subject</label>
            <input type="text" id="edit-attendance-subject" value="${record.subject || ''}" placeholder="Enter subject">
        </div>
        
        <div class="modal-buttons">
            <button onclick="updateAttendanceRecord(${attendanceId})" class="btn-primary">Update</button>
            <button onclick="closeModal()" class="btn-secondary">Cancel</button>
            <button onclick="deleteAttendanceRecord(${attendanceId})" class="btn-danger">Delete</button>
        </div>
    `);
}

// Update attendance record
async function updateAttendanceRecord(attendanceId) {
    const date = document.getElementById('edit-attendance-date').value;
    const status = document.getElementById('edit-attendance-status').value === 'true';
    const subject = document.getElementById('edit-attendance-subject').value;
    
    try {
        const response = await fetch(`http://localhost:8000/attendance/${attendanceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                present: status,
                date: date,
                subject: subject
            })
        });
        
        if (response.ok) {
            closeModal();
            showAttendanceToast('Attendance updated successfully', 'success');
            loadAttendanceForDate(date);
        }
    } catch (error) {
        console.error('Error updating attendance:', error);
        showAttendanceToast('Error updating attendance', 'error');
    }
}

// Delete attendance record
async function deleteAttendanceRecord(attendanceId) {
    const confirmDelete = confirm('Are you sure you want to delete this attendance record?');
    if (!confirmDelete) return;
    
    try {
        const response = await fetch(`http://localhost:8000/attendance/${attendanceId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            closeModal();
            showAttendanceToast('Attendance record deleted', 'success');
            
            // Get current date to reload
            const dateInput = document.getElementById('attendance-date');
            const currentDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
            loadAttendanceForDate(currentDate);
        }
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showAttendanceToast('Error deleting attendance', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Date change listener
    const dateInput = document.getElementById('attendance-date');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            loadAttendanceForDate(this.value);
        });
    }
    
    // Quick actions
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            handleQuickAction(action);
        });
    });
}

// Handle quick actions
async function handleQuickAction(action) {
    const dateInput = document.getElementById('attendance-date');
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    if (action === 'mark-all-present') {
        await markAllPresent(date);
    } else if (action === 'mark-all-absent') {
        await markAllAbsent(date);
    } else if (action === 'export-attendance') {
        exportAttendanceData();
    } else if (action === 'import-attendance') {
        importAttendanceData();
    }
}

// Mark all students present
async function markAllPresent(date) {
    if (!studentsData.length) {
        alert('No students available.');
        return;
    }
    
    const confirmMark = confirm(`Mark ALL students as PRESENT for ${date}?`);
    if (!confirmMark) return;
    
    for (const student of studentsData) {
        await markAttendanceForStudent(student.id, date, true);
    }
    
    showAttendanceToast('All students marked as present', 'success');
    loadAttendanceForDate(date);
}

// Mark all students absent
async function markAllAbsent(date) {
    if (!studentsData.length) {
        alert('No students available.');
        return;
    }
    
    const confirmMark = confirm(`Mark ALL students as ABSENT for ${date}?`);
    if (!confirmMark) return;
    
    for (const student of studentsData) {
        await markAttendanceForStudent(student.id, date, false);
    }
    
    showAttendanceToast('All students marked as absent', 'warning');
    loadAttendanceForDate(date);
}

// Mark attendance for single student
async function markAttendanceForStudent(studentId, date, present) {
    try {
        const response = await fetch('http://localhost:8000/attendance/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_id: studentId,
                date: date,
                present: present,
                subject: 'General'
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Error marking attendance:', error);
        return null;
    }
}

// Export attendance data
function exportAttendanceData() {
    const dataStr = JSON.stringify(attendanceData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `attendance_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Import attendance data (simplified)
function importAttendanceData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                showAttendanceToast('Data imported successfully', 'success');
                console.log('Imported data:', importedData);
                // In a real app, you would process and save this data
            } catch (error) {
                showAttendanceToast('Error parsing file', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Update charts with real data
function updateCharts() {
    if (!attendanceChart || !trendChart) return;
    
    // Update attendance chart
    const presentCount = attendanceData.filter(a => a.present).length;
    const absentCount = attendanceData.filter(a => !a.present).length;
    
    attendanceChart.data.datasets[0].data = [presentCount, absentCount];
    attendanceChart.update();
    
    // Update trend chart (sample data - in real app, get from API)
    const trendData = calculateWeeklyTrend();
    trendChart.data.datasets[0].data = trendData;
    trendChart.update();
}

// Calculate weekly trend
function calculateWeeklyTrend() {
    // In a real app, this would fetch historical data
    // For now, generate sample data
    return [85, 82, 90, 88, 86, 0, 0].map(value => {
        if (value === 0) return 0;
        const variation = Math.random() * 10 - 5; // -5 to +5
        return Math.max(0, Math.min(100, value + variation));
    });
}

// Toast for attendance page
function showAttendanceToast(message, type = 'info') {
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

// Format time helper
function formatTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('attendance-table-body')) {
        initAttendancePage();
    }
});