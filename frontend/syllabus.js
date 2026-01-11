// Syllabus Page Logic
let syllabusData = [];
let studentsData = [];

// Initialize syllabus page
async function initSyllabusPage() {
    await loadSyllabus();
    await loadStudents();
    renderSubjectCards();
    updateSyllabusStats();
    populateStudentSelector();
    setupEventListeners();
}

// Load syllabus from API
async function loadSyllabus() {
    try {
        const response = await fetch('http://localhost:8000/syllabus/');
        if (response.ok) {
            syllabusData = await response.json();
        } else {
            throw new Error('Failed to load syllabus');
        }
    } catch (error) {
        console.error('Error loading syllabus:', error);
        // Load sample data for demo
        loadSampleSyllabus();
    }
}

// Load sample syllabus (for demo/offline use)
function loadSampleSyllabus() {
    syllabusData = [
        {
            id: 1,
            subject: "Mathematics",
            grade: "5",
            chapter: "Basic Arithmetic",
            topic: "Addition and Subtraction",
            difficulty_level: "easy",
            estimated_time: 60,
            prerequisites: "Basic counting skills",
            learning_outcomes: "Master basic addition and subtraction"
        },
        {
            id: 2,
            subject: "Science",
            grade: "5",
            chapter: "Plants and Animals",
            topic: "Photosynthesis",
            difficulty_level: "medium",
            estimated_time: 90,
            prerequisites: "Basic biology concepts",
            learning_outcomes: "Understand how plants make food"
        }
    ];
}

// Render subject cards
function renderSubjectCards() {
    const container = document.getElementById('subject-grid');
    if (!container) return;
    
    const subjects = ['Mathematics', 'Science', 'English', 'Social Studies'];
    const grade = document.getElementById('grade-selector').value;
    
    container.innerHTML = subjects.map(subject => {
        const subjectTopics = syllabusData.filter(topic => 
            topic.subject === subject && (grade === 'all' || topic.grade === grade)
        );
        
        const chapters = [...new Set(subjectTopics.map(t => t.chapter))];
        
        return `
            <div class="subject-card ${subject.toLowerCase().split(' ')[0]}">
                <div class="subject-header">
                    <div>
                        <h3>${subject}</h3>
                        <p class="topic-count">${subjectTopics.length} topics, ${chapters.length} chapters</p>
                    </div>
                    <div class="subject-icon ${subject.toLowerCase().split(' ')[0]}">
                        ${getSubjectIcon(subject)}
                    </div>
                </div>
                
                <div class="chapters-list">
                    ${chapters.slice(0, 3).map(chapter => {
                        const chapterTopics = subjectTopics.filter(t => t.chapter === chapter);
                        const completed = Math.floor(Math.random() * chapterTopics.length);
                        
                        return `
                            <div class="chapter-item">
                                <div class="chapter-info">
                                    <h4>${chapter}</h4>
                                    <div class="chapter-meta">
                                        <span>${chapterTopics.length} topics</span>
                                        <span>•</span>
                                        <span>${completed} completed</span>
                                    </div>
                                </div>
                                <button class="btn-small" onclick="viewChapter('${subject}', '${chapter}')">
                                    View
                                </button>
                            </div>
                        `;
                    }).join('')}
                    
                    ${chapters.length > 3 ? `
                        <div class="text-center">
                            <button class="btn-text" onclick="viewAllChapters('${subject}')">
                                + ${chapters.length - 3} more chapters
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="subject-actions">
                    <button class="btn-secondary" onclick="startLearningSubject('${subject}')">
                        <i class="fas fa-play"></i> Start Learning
                    </button>
                    <button class="btn-primary" onclick="addTopicForSubject('${subject}')">
                        <i class="fas fa-plus"></i> Add Topic
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Get subject icon
function getSubjectIcon(subject) {
    const icons = {
        'Mathematics': 'fas fa-calculator',
        'Science': 'fas fa-flask',
        'English': 'fas fa-language',
        'Social Studies': 'fas fa-globe-asia'
    };
    const iconClass = icons[subject] || 'fas fa-book';
    return `<i class="${iconClass}"></i>`;
}

// Update syllabus statistics
function updateSyllabusStats() {
    document.getElementById('math-topics').textContent = 
        syllabusData.filter(t => t.subject === 'Mathematics').length;
    
    document.getElementById('science-topics').textContent = 
        syllabusData.filter(t => t.subject === 'Science').length;
    
    document.getElementById('english-topics').textContent = 
        syllabusData.filter(t => t.subject === 'English').length;
    
    document.getElementById('social-topics').textContent = 
        syllabusData.filter(t => t.subject === 'Social Studies').length;
}

// Populate student selector
function populateStudentSelector() {
    const select = document.getElementById('student-progress-selector');
    if (!select || studentsData.length === 0) return;
    
    select.innerHTML = '<option value="">Select Student</option>' +
        studentsData.map(student => 
            `<option value="${student.id}">${student.name} (Grade ${student.grade})</option>`
        ).join('');
    
    select.addEventListener('change', (e) => {
        if (e.target.value) {
            loadStudentProgress(e.target.value);
        }
    });
}

// Load student progress
async function loadStudentProgress(studentId) {
    const container = document.getElementById('learning-progress');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading progress...</div>';
    
    try {
        // Get student activities
        const response = await fetch(`http://localhost:8000/activities/student/${studentId}`);
        const activities = response.ok ? await response.json() : [];
        
        // Calculate progress by subject
        const progressBySubject = {};
        
        activities.forEach(activity => {
            const topic = syllabusData.find(t => t.id === activity.syllabus_id);
            if (topic) {
                if (!progressBySubject[topic.subject]) {
                    progressBySubject[topic.subject] = {
                        total: 0,
                        completed: 0,
                        score: 0
                    };
                }
                
                progressBySubject[topic.subject].total++;
                if (activity.completed) {
                    progressBySubject[topic.subject].completed++;
                    progressBySubject[topic.subject].score += activity.score || 0;
                }
            }
        });
        
        // Render progress
        container.innerHTML = `
            <div class="progress-grid">
                ${Object.entries(progressBySubject).map(([subject, data]) => {
                    const percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                    const avgScore = data.completed > 0 ? Math.round(data.score / data.completed) : 0;
                    
                    return `
                        <div class="progress-card">
                            <h4>${subject}</h4>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percentage}%"></div>
                            </div>
                            <div class="progress-details">
                                <span>${data.completed}/${data.total} topics</span>
                                <span>${percentage}% complete</span>
                                <span>Avg: ${avgScore}%</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading progress:', error);
        container.innerHTML = '<div class="no-data">Could not load progress data</div>';
    }
}

// View chapter details
function viewChapter(subject, chapter) {
    const modal = document.getElementById('topic-details-modal');
    const title = document.getElementById('topic-details-title');
    const content = document.getElementById('topic-details-content');
    
    const chapterTopics = syllabusData.filter(t => 
        t.subject === subject && t.chapter === chapter
    );
    
    title.textContent = `${subject} - ${chapter}`;
    
    content.innerHTML = `
        <div class="chapter-details">
            <h3>Topics in this chapter:</h3>
            ${chapterTopics.map(topic => `
                <div class="topic-item">
                    <h4>${topic.topic || 'Untitled Topic'}</h4>
                    <div class="topic-meta">
                        <span class="difficulty-badge difficulty-${topic.difficulty_level || 'medium'}">
                            ${topic.difficulty_level || 'Medium'}
                        </span>
                        <span><i class="far fa-clock"></i> ${topic.estimated_time || 60} min</span>
                    </div>
                    ${topic.prerequisites ? `
                        <div class="prerequisites">
                            <strong>Prerequisites:</strong> ${topic.prerequisites}
                        </div>
                    ` : ''}
                    <div class="topic-actions">
                        <button class="btn-small" onclick="startLearningTopic(${topic.id})">
                            <i class="fas fa-play"></i> Learn Now
                        </button>
                        <button class="btn-small btn-secondary" onclick="assignTopic(${topic.id})">
                            <i class="fas fa-user-plus"></i> Assign to Student
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="modal-actions">
            <button class="btn-primary" onclick="startLearningChapter('${subject}', '${chapter}')">
                <i class="fas fa-graduation-cap"></i> Start Learning Chapter
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Start learning topic
function startLearningTopic(topicId) {
    const topic = syllabusData.find(t => t.id === topicId);
    if (topic) {
        // Save to session storage for learning page
        sessionStorage.setItem('currentTopic', JSON.stringify(topic));
        window.location.href = 'learning.html';
    }
}

// Add new topic
function openAddTopicModal() {
    document.getElementById('add-topic-modal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'add-topic-modal') {
        document.getElementById('topic-form').reset();
    }
}

async function saveTopic(event) {
    event.preventDefault();
    
    const topicData = {
        subject: document.getElementById('topic-subject').value,
        grade: document.getElementById('topic-grade').value,
        chapter: document.getElementById('topic-chapter').value,
        topic: document.getElementById('topic-title').value || null,
        content: document.getElementById('topic-content').value || null,
        difficulty_level: document.getElementById('topic-difficulty').value,
        estimated_time: parseInt(document.getElementById('topic-duration').value) || 60,
        prerequisites: document.getElementById('topic-prerequisites').value || null,
        learning_outcomes: document.getElementById('topic-outcomes').value || null,
        offline_resources: '[]'
    };
    
    try {
        const response = await fetch('http://localhost:8000/syllabus/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(topicData)
        });
        
        if (response.ok) {
            const newTopic = await response.json();
            syllabusData.push(newTopic);
            closeModal('add-topic-modal');
            showToast('Topic added successfully!', 'success');
            renderSubjectCards();
            updateSyllabusStats();
        } else {
            throw new Error('Failed to save topic');
        }
    } catch (error) {
        console.error('Error saving topic:', error);
        showToast('Failed to save topic. Please try again.', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('search-syllabus');
    const gradeSelector = document.getElementById('grade-selector');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterSyllabus);
    }
    
    if (gradeSelector) {
        gradeSelector.addEventListener('change', renderSubjectCards);
    }
}

function filterSyllabus() {
    const searchTerm = document.getElementById('search-syllabus').value.toLowerCase();
    const grade = document.getElementById('grade-selector').value;
    
    const filtered = syllabusData.filter(topic => {
        const matchesSearch = searchTerm === '' || 
            topic.subject.toLowerCase().includes(searchTerm) ||
            topic.chapter.toLowerCase().includes(searchTerm) ||
            (topic.topic && topic.topic.toLowerCase().includes(searchTerm));
        
        const matchesGrade = grade === 'all' || topic.grade === grade;
        
        return matchesSearch && matchesGrade;
    });
    
    // Update display with filtered results
    updateDisplayWithFiltered(filtered);
}

function updateDisplayWithFiltered(filtered) {
    const container = document.getElementById('subject-grid');
    // Similar to renderSubjectCards but with filtered data
    // Implementation would update the display
}

// Initialize when page loads
if (window.location.pathname.includes('syllabus.html')) {
    document.addEventListener('DOMContentLoaded', initSyllabusPage);
}