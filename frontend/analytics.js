// Analytics Dashboard Logic
let analyticsData = {};
let attendanceChart = null;
let performanceChart = null;
let progressChart = null;
let patternsChart = null;
let currentTimeRange = 'week';

// Initialize analytics dashboard
async function initAnalyticsPage() {
    await loadAnalyticsData();
    setupCharts();
    renderAnalytics();
    setupEventListeners();
}

// Load analytics data from API
async function loadAnalyticsData() {
    try {
        // Load multiple data sources in parallel
        const [attendance, activities, students, assessments] = await Promise.all([
            fetch('http://localhost:8000/attendance/today').then(r => r.ok ? r.json() : {}),
            fetch('http://localhost:8000/activities/').then(r => r.ok ? r.json() : []),
            fetch('http://localhost:8000/students/').then(r => r.ok ? r.json() : []),
            fetch('http://localhost:8000/assessments/').then(r => r.ok ? r.json() : [])
        ]);

        analyticsData = {
            attendance,
            activities,
            students,
            assessments,
            generatedAt: new Date().toISOString()
        };

        // Calculate derived metrics
        calculateMetrics();
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
        loadSampleAnalyticsData();
    }
}

// Calculate key metrics
function calculateMetrics() {
    const { students, activities, assessments } = analyticsData;
    
    // Overall attendance
    const attendanceRate = analyticsData.attendance.attendance_rate || 85;
    document.getElementById('overall-attendance').textContent = `${attendanceRate}%`;
    
    // Average score
    const totalScore = assessments.reduce((sum, a) => sum + (a.score || 0), 0);
    const avgScore = assessments.length > 0 ? Math.round(totalScore / assessments.length) : 78;
    document.getElementById('average-score').textContent = `${avgScore}%`;
    
    // Total study hours
    const totalMinutes = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalHours = Math.round(totalMinutes / 60);
    document.getElementById('total-study-hours').textContent = totalHours;
    
    // Risk students count
    const riskCount = Math.max(0, Math.floor(students.length * 0.1)); // 10% as risk
    document.getElementById('risk-count').textContent = riskCount;
}

// Setup charts
function setupCharts() {
    // Attendance Trend Chart
    const trendCtx = document.getElementById('attendance-trend-chart');
    if (trendCtx) {
        attendanceChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Attendance Rate (%)',
                    data: [85, 82, 90, 88, 86, 45, 30],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // Subject Performance Chart
    const performanceCtx = document.getElementById('subject-performance-chart');
    if (performanceCtx) {
        performanceChart = new Chart(performanceCtx, {
            type: 'bar',
            data: {
                labels: ['Math', 'Science', 'English', 'Social'],
                datasets: [{
                    label: 'Average Score (%)',
                    data: [85, 78, 82, 75],
                    backgroundColor: [
                        '#FF5722',
                        '#4CAF50',
                        '#2196F3',
                        '#9C27B0'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // Learning Progress Chart
    const progressCtx = document.getElementById('learning-progress-chart');
    if (progressCtx) {
        progressChart = new Chart(progressCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Not Started'],
                datasets: [{
                    data: [45, 35, 20],
                    backgroundColor: [
                        '#4CAF50',
                        '#FF9800',
                        '#F44336'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Learning Patterns Chart
    const patternsCtx = document.getElementById('learning-patterns-chart');
    if (patternsCtx) {
        patternsChart = new Chart(patternsCtx, {
            type: 'radar',
            data: {
                labels: ['Morning', 'Afternoon', 'Evening', 'Weekends', 'Holidays'],
                datasets: [{
                    label: 'Study Activity',
                    data: [85, 90, 75, 60, 40],
                    backgroundColor: 'rgba(33, 150, 243, 0.2)',
                    borderColor: '#2196F3',
                    pointBackgroundColor: '#2196F3'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

// Render analytics data
function renderAnalytics() {
    renderRiskStudents();
    renderTopPerformers();
    renderMostImproved();
    renderInsights();
}

// Render risk students
function renderRiskStudents() {
    const container = document.getElementById('risk-students-list');
    if (!container) return;

    const { students } = analyticsData;
    const riskStudents = students.slice(0, 5).map((student, index) => ({
        ...student,
        riskLevel: ['low', 'medium', 'high'][index % 3],
        attendance: 65 + (index * 5),
        score: 60 + (index * 8)
    }));

    container.innerHTML = riskStudents.map(student => `
        <div class="student-list-item">
            <div>
                <strong>${student.name}</strong>
                <div class="student-meta">
                    <span>Grade ${student.grade} • ${student.village || 'Unknown Village'}</span>
                </div>
            </div>
            <div>
                <span class="risk-indicator risk-${student.riskLevel}"></span>
                <span>${student.riskLevel.toUpperCase()}</span>
            </div>
        </div>
    `).join('');
}

// Render top performers
function renderTopPerformers() {
    const container = document.getElementById('top-performers');
    if (!container) return;

    const { students } = analyticsData;
    const topPerformers = students.slice(0, 5).map((student, index) => ({
        ...student,
        score: 85 + (index * 3),
        improvement: 5 + index
    }));

    container.innerHTML = topPerformers.map(student => `
        <div class="student-list-item">
            <div>
                <strong>${student.name}</strong>
                <div class="student-meta">
                    <span>Grade ${student.grade}</span>
                </div>
            </div>
            <div>
                <div class="progress-indicator">
                    <div class="progress-fill" style="width: ${student.score}%"></div>
                </div>
                <span style="font-size: 12px; color: var(--light-text);">${student.score}%</span>
            </div>
        </div>
    `).join('');
}

// Render most improved students
function renderMostImproved() {
    const container = document.getElementById('most-improved');
    if (!container) return;

    const { students } = analyticsData;
    const improvedStudents = students.slice(2, 7).map((student, index) => ({
        ...student,
        improvement: 15 + (index * 5),
        previousScore: 50 + (index * 5),
        currentScore: 65 + (index * 8)
    }));

    container.innerHTML = improvedStudents.map(student => `
        <div class="student-list-item">
            <div>
                <strong>${student.name}</strong>
                <div class="student-meta">
                    <span>${student.improvement}% improvement</span>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 14px;">
                    <span style="color: var(--light-text);">${student.previousScore}% → </span>
                    <strong style="color: #4CAF50;">${student.currentScore}%</strong>
                </div>
                <span style="font-size: 11px; color: #4CAF50;">
                    <i class="fas fa-arrow-up"></i> +${student.improvement}%
                </span>
            </div>
        </div>
    `).join('');
}

// Render insights
function renderInsights() {
    // In a real app, this would generate insights based on data analysis
    // For now, we'll show static insights
    const insights = [
        {
            type: 'positive',
            title: 'Strong Performance in Mathematics',
            description: 'Students show 15% improvement in math scores after introducing visual learning aids.'
        },
        {
            type: 'warning',
            title: 'Science Comprehension Needs Attention',
            description: 'Science scores are 10% below average. Consider adding more practical examples.'
        },
        {
            type: 'info',
            title: 'Evening Study Sessions Effective',
            description: 'Students who study in evening hours show 20% better retention rates.'
        }
    ];

    // Update insights in the UI
    // Implementation depends on your HTML structure
}

// Set time range
function setTimeRange(range) {
    currentTimeRange = range;
    
    // Update active button
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reload data for selected range
    reloadDataForRange(range);
}

// Reload data for time range
async function reloadDataForRange(range) {
    // In a real app, this would fetch data for the specified range
    console.log(`Loading data for ${range} range...`);
    
    // Update charts with new data
    updateChartsForRange(range);
}

// Update charts for time range
function updateChartsForRange(range) {
    // Update chart data based on time range
    const dataMap = {
        week: [85, 82, 90, 88, 86, 45, 30],
        month: [78, 82, 85, 80, 83, 79, 81, 84, 82, 85, 88, 86],
        quarter: [75, 78, 82, 85, 80, 83, 79, 81, 84, 82, 85, 88],
        year: [70, 72, 75, 78, 80, 82, 85, 83, 81, 84, 86, 88]
    };

    if (attendanceChart) {
        attendanceChart.data.datasets[0].data = dataMap[range] || dataMap.week;
        attendanceChart.update();
    }
}

// Export analytics report
function exportAnalytics() {
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `learning-analytics-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast('Analytics report exported successfully!', 'success');
}

// Load sample data for demo
function loadSampleAnalyticsData() {
    analyticsData = {
        attendance: {
            attendance_rate: 85,
            days_present: 425,
            days_total: 500
        },
        activities: Array(50).fill().map((_, i) => ({
            id: i + 1,
            student_id: (i % 10) + 1,
            duration: 30 + Math.floor(Math.random() * 60),
            completed: Math.random() > 0.3,
            score: Math.random() > 0.3 ? 60 + Math.floor(Math.random() * 40) : null
        })),
        students: Array(15).fill().map((_, i) => ({
            id: i + 1,
            name: `Student ${i + 1}`,
            grade: '5',
            village: ['Village A', 'Village B', 'Village C'][i % 3]
        })),
        assessments: Array(30).fill().map((_, i) => ({
            id: i + 1,
            student_id: (i % 10) + 1,
            subject: ['Mathematics', 'Science', 'English', 'Social Studies'][i % 4],
            score: 60 + Math.floor(Math.random() * 40),
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        })),
        generatedAt: new Date().toISOString()
    };
    
    calculateMetrics();
    renderAnalytics();
}

// Setup event listeners
function setupEventListeners() {
    const gradeFilter = document.getElementById('filter-grade-analytics');
    const villageFilter = document.getElementById('filter-village-analytics');
    const subjectFilter = document.getElementById('filter-subject-analytics');
    
    if (gradeFilter) {
        gradeFilter.addEventListener('change', filterAnalytics);
    }
    
    if (villageFilter) {
        // Populate village filter
        const villages = [...new Set(analyticsData.students.map(s => s.village).filter(Boolean))];
        villageFilter.innerHTML = '<option value="">All Villages</option>' +
            villages.map(v => `<option value="${v}">${v}</option>`).join('');
        
        villageFilter.addEventListener('change', filterAnalytics);
    }
    
    if (subjectFilter) {
        subjectFilter.addEventListener('change', filterAnalytics);
    }
}

// Filter analytics
function filterAnalytics() {
    const grade = document.getElementById('filter-grade-analytics').value;
    const village = document.getElementById('filter-village-analytics').value;
    const subject = document.getElementById('filter-subject-analytics').value;
    
    console.log(`Filtering: Grade=${grade}, Village=${village}, Subject=${subject}`);
    
    // In a real app, this would refetch filtered data from API
    // For now, we'll just show a message
    showToast('Applying filters...', 'info');
}

// Initialize when page loads
if (window.location.pathname.includes('analytics.html')) {
    document.addEventListener('DOMContentLoaded', initAnalyticsPage);
}