// Causal Knowledge Tracing System - Frontend JavaScript
// Handles API communication and UI updates

const API_BASE = 'http://localhost:5500/api';

let currentGraph = null;
let currentStudent = null;
let concepts = [];
let allStudents = []; // Store all students for filtering

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    updateSliderValues();
});

async function loadData() {
    try {
        // Load concept graph
        const graphResponse = await fetch(`${API_BASE}/graph`);
        currentGraph = await graphResponse.json();

        // Load student data
        const studentResponse = await fetch(`${API_BASE}/student`);
        currentStudent = await studentResponse.json();
        concepts = currentStudent.concepts;

        // Render initial UI
        renderGraph();
        renderMastery();
        populateConceptSelects();

        // Display student metadata (school, grade, etc.)
        displayStudentMetadata(currentStudent.metadata);

        // Load initial student list (missing before)
        await loadStudentList();

    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to connect to backend. Make sure the Flask server is running on port 5500.');
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Slider value updates
    document.getElementById('difficulty').addEventListener('input', updateSliderValues);
    document.getElementById('timePressure').addEventListener('input', updateSliderValues);
    document.getElementById('language').addEventListener('input', updateSliderValues);
    document.getElementById('newMastery').addEventListener('input', updateSliderValues);

    // Button clicks
    document.getElementById('predictBtn').addEventListener('click', predictPerformance);
    document.getElementById('interveneBtn').addEventListener('click', applyIntervention);
    document.getElementById('submitAnswerBtn').addEventListener('click', submitPartialAnswer);

    // File upload
    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Student selection
    document.getElementById('studentSelect').addEventListener('change', handleStudentChange);

    // Student filters
    document.getElementById('filterSchool').addEventListener('change', applyStudentFilters);
    document.getElementById('filterGrade').addEventListener('change', applyStudentFilters);
    document.getElementById('filterClass').addEventListener('change', applyStudentFilters);
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
}

function updateSliderValues() {
    document.getElementById('difficultyValue').textContent =
        document.getElementById('difficulty').value;
    document.getElementById('timePressureValue').textContent =
        document.getElementById('timePressure').value;
    document.getElementById('languageValue').textContent =
        document.getElementById('language').value;
    document.getElementById('newMasteryValue').textContent =
        document.getElementById('newMastery').value;

    // Safety check for optional elements
    const optRisk = document.getElementById('opt-risk');
    if (optRisk) {
        document.getElementById('opt-risk-val').textContent = (optRisk.value * 100).toFixed(0) + '%';
        optRisk.addEventListener('input', updateSliderValues);
    }
}

// ============================================================================
// GRAPH VISUALIZATION
// ============================================================================

// ============================================================================
// GRAPH VISUALIZATION (D3.js)
// ============================================================================

function renderGraph(showFragility = false) {
    const container = document.getElementById('graphContainer');

    // Safety check for container
    if (!container) return;

    container.innerHTML = '';

    // Defensive Graph Data Check
    if (!currentGraph || !currentGraph.nodes || !Array.isArray(currentGraph.nodes) || currentGraph.nodes.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 2rem; color: var(--text-secondary);">
                <p>⚠️ No concept graph data available.</p>
                <small>Please ensure the backend is running and data is loaded.</small>
            </div>
        `;
        return;
    }

    // Update legend
    const legend = document.getElementById('graph-legend');
    if (legend) {
        if (showFragility) {
            legend.innerHTML = `
                <span class="legend-item"><span class="dot" style="background:var(--danger)"></span> Critical Bottleneck</span>
                <span class="legend-item"><span class="dot" style="background:#4ade80"></span> Stable</span>
            `;
        } else {
            legend.innerHTML = `
                <span class="legend-item"><span class="dot mastered"></span> Mastered</span>
                <span class="legend-item"><span class="dot learning"></span> Learning</span>
                <span class="legend-item"><span class="dot unknown"></span> Unknown</span>
            `;
        }
    }

    // Check if D3 is loaded
    if (typeof d3 === 'undefined') {
        container.innerHTML = '<p class="error">Error: D3.js library not loaded.</p>';
        return;
    }

    const width = container.clientWidth || 800;
    const height = 500; // Fixed height for visualization

    // Prepare data for D3 safely
    const nodes = currentGraph.nodes.map(n => ({ id: n.id, ...n }));
    const links = (currentGraph.edges || []).map(e => ({ source: e.source, target: e.target }));

    // Create SVG
    const svg = d3.select("#graphContainer")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .style("max-width", "100%")
        .style("height", "auto");

    // Arrow marker for directed edges
    svg.append("defs").selectAll("marker")
        .data(["end"])
        .enter().append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25) // Offset to not overlap node
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#666");

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(40));

    const link = svg.append("g")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrow)");

    const node = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("cursor", "pointer")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Node circles with mastery coloring
    node.append("circle")
        .attr("r", 20)
        .attr("fill", d => {
            if (showFragility && fragilityData) {
                // Find fragility score
                const item = fragilityData.find(f => f.concept === d.id);
                const score = item ? item.fragility_score : 0;
                return d3.interpolateRdYlGn(1 - score);
            } else {
                // Mastery Mode Safety Check
                if (!currentStudent || !currentStudent.mastery) return "#999";

                const idx = concepts ? concepts.indexOf(d.id) : -1;
                if (idx === -1) return "#999";

                // Ensure index is within bounds
                if (idx >= currentStudent.mastery.length) return "#999";

                const m = currentStudent.mastery[idx];
                return d3.interpolateRdYlGn(m);
            }
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .on("click", (event, d) => highlightNode(d.id));

    // Node labels
    node.append("text")
        .text(d => d.id)
        .attr("x", 25)
        .attr("y", 5)
        .style("font-size", "12px")
        .style("font-family", "Inter, sans-serif")
        .style("fill", "#e0e0e0")
        .style("pointer-events", "none")
        .style("text-shadow", "0 1px 2px black");

    // Add title/tooltip
    node.append("title")
        .text(d => d.id);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

function highlightNode(nodeId) {
    if (!currentGraph || !currentGraph.edges) return;

    const prerequisites = currentGraph.edges
        .filter(e => e.target === nodeId)
        .map(e => e.source);

    const dependents = currentGraph.edges
        .filter(e => e.source === nodeId)
        .map(e => e.target);

    // Find mastery safely
    let m = 'N/A';
    if (currentStudent && currentStudent.mastery && concepts) {
        const idx = concepts.indexOf(nodeId);
        if (idx !== -1 && idx < currentStudent.mastery.length) {
            m = (currentStudent.mastery[idx] * 100).toFixed(0) + '%';
        }
    }

    alert(`Concept: ${nodeId}\nMastery: ${m}\n\nPrerequisites: ${prerequisites.join(', ') || 'None'}\n\ndependent Concepts: ${dependents.join(', ') || 'None'}`);
}

// ============================================================================
// MASTERY VISUALIZATION
// ============================================================================

function renderMastery() {
    const container = document.getElementById('masteryContainer');
    if (!container) return;
    container.innerHTML = '';

    // Safety check for student data
    if (!currentStudent || !currentStudent.mastery || !concepts) {
        container.innerHTML = '<p style="color:var(--text-secondary)">No student mastery data available.</p>';
        return;
    }

    concepts.forEach((concept, index) => {
        // Safe access
        const mastery = (index < currentStudent.mastery.length) ? currentStudent.mastery[index] : 0;
        const masteryPercent = Math.round(mastery * 100);

        const item = document.createElement('div');
        item.className = 'mastery-item';

        item.innerHTML = `
            <div class="mastery-label">
                <span class="mastery-concept">${concept}</span>
                <span class="mastery-value">${masteryPercent}%</span>
            </div>
            <div class="mastery-bar-container">
                <div class="mastery-bar" style="width: ${masteryPercent}%"></div>
            </div>
        `;

        container.appendChild(item);
    });
}

// ============================================================================
// TAB NAVIGATION & NEW FEATURES
// ============================================================================

function switchTab(tabId) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    // Show selected
    document.getElementById(`tab-${tabId}`).style.display = 'block';

    // Activate button
    // Find the button that calls this function (approximate)
    const btns = document.querySelectorAll('.tab-btn');
    if (tabId === 'causal') btns[0].classList.add('active');
    if (tabId === 'optimize') btns[1].classList.add('active');
    if (tabId === 'fragility') {
        btns[2].classList.add('active');
        analyzeFragility(); // Auto-load data
    }
}

async function generateStudyPlan() {
    const target = document.getElementById('opt-target').value;
    const risk = parseFloat(document.getElementById('opt-risk').value);
    const container = document.getElementById('opt-result');

    container.innerHTML = 'Generating plan...';

    try {
        const response = await fetch(`${API_BASE}/recommend_interventions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_concepts: [target],
                risk_threshold: risk
            })
        });

        const data = await response.json();
        const set = data.intervention_set;

        if (set.length === 0) {
            container.innerHTML = `<div class="success-box">✅ Target is already safe! (Risk: ${(data.projected_risk * 100).toFixed(1)}%)</div>`;
        } else {
            container.innerHTML = `
                <div class="plan-card">
                    <h4>Recommended Study List:</h4>
                    <ul>${set.map(c => `<li>📚 <strong>${c}</strong></li>`).join('')}</ul>
                    <p>Reduces failure risk to ${(data.projected_risk * 100).toFixed(1)}%</p>
                    <small>${data.explanation.final_recommendation}</small>
                </div>
            `;
        }

    } catch (e) {
        container.innerHTML = 'Error generating plan.';
        console.error(e);
    }
}

let fragilityData = null;

async function analyzeFragility() {
    const list = document.getElementById('fragility-list');
    list.innerHTML = 'Loading analysis...';

    try {
        const response = await fetch(`${API_BASE}/analyze_bottlenecks`);
        const data = await response.json();
        fragilityData = data.bottlenecks;

        list.innerHTML = fragilityData.map(item => `
            <div class="fragility-item ${item.fragility_score > 0.4 ? 'critical' : ''}">
                <span class="concept-name">${item.concept}</span>
                <span class="score-bar">
                    <div class="bar-fill" style="width:${item.fragility_score * 100}%"></div>
                </span>
                <span class="score-val">${item.fragility_score.toFixed(2)}</span>
            </div>
        `).join('');

    } catch (e) {
        list.innerHTML = 'Error loading fragility data.';
    }
}

function toggleFragilityMode() {
    const isFragility = document.getElementById('fragility-toggle').checked;
    renderGraph(isFragility);
}

// ============================================================================
// CONCEPT SELECT DROPDOWNS
// ============================================================================

function populateConceptSelects() {
    const testSelect = document.getElementById('testConcept');
    const interventionSelect = document.getElementById('interventionConcept');
    const optSelect = document.getElementById('opt-target');

    // Safety checks for elements that may not exist
    if (!testSelect || !interventionSelect) {
        console.error('Required select elements not found in DOM');
        return;
    }

    // Clear existing options before populating
    testSelect.innerHTML = '';
    interventionSelect.innerHTML = '';
    if (optSelect) optSelect.innerHTML = '';

    concepts.forEach(concept => {
        const option1 = document.createElement('option');
        option1.value = concept;
        option1.textContent = concept;
        testSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = concept;
        option2.textContent = concept;
        interventionSelect.appendChild(option2);

        // Only populate opt-target if it exists
        if (optSelect) {
            const option3 = document.createElement('option');
            option3.value = concept;
            option3.textContent = concept;
            optSelect.appendChild(option3);
        }
    });

    // Populate partial marking checkboxes
    const checkboxContainer = document.getElementById('markingConcepts');
    if (checkboxContainer) {
        checkboxContainer.innerHTML = '';
        concepts.forEach(concept => {
            const wrapper = document.createElement('label');
            wrapper.className = 'concept-checkbox-item';
            wrapper.innerHTML = `
                <input type="checkbox" class="concept-check" value="${concept}">
                ${concept}
            `;
            checkboxContainer.appendChild(wrapper);
        });
    }
}

// ============================================================================
// FILE UPLOAD
// ============================================================================

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const statusEl = document.getElementById('uploadStatus');
    statusEl.textContent = 'Uploading...';
    statusEl.style.color = 'var(--accent)';

    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            statusEl.textContent = `✓ Added ${result.students_added} students`;
            statusEl.style.color = 'var(--success)';

            // Refresh student list
            await loadStudentList();

            setTimeout(() => {
                statusEl.textContent = '';
            }, 3000);

            alert(`Successfully added ${result.students_added} students! Select them from the dropdown.`);
        } else {
            throw new Error(result.error || 'Upload failed');
        }

    } catch (error) {
        console.error('Upload error:', error);
        statusEl.textContent = `✗ ${error.message}`;
        statusEl.style.color = 'hsl(0, 70%, 50%)';
    }

    // Reset file input
    event.target.value = '';
}

async function loadStudentList() {
    try {
        const response = await fetch(`${API_BASE}/students`);
        const data = await response.json();

        // Store all students for filtering
        allStudents = data.students;

        // Populate filters
        populateFilters();

        // Initially show all students
        updateStudentDropdown(allStudents, data.current);

    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function populateFilters() {
    const schoolFilter = document.getElementById('filterSchool');
    const gradeFilter = document.getElementById('filterGrade');
    const classFilter = document.getElementById('filterClass');

    // Extract unique values
    const schools = [...new Set(allStudents.map(s => s.metadata.school || 'Unknown'))].sort();
    const grades = [...new Set(allStudents.map(s => s.metadata.grade || 'Unknown'))].sort();
    const classes = [...new Set(allStudents.map(s => s.metadata.class || 'Unknown'))].sort();

    // Clear and populate school filter
    schoolFilter.innerHTML = '<option value="">All Schools</option>';
    schools.forEach(school => {
        const option = document.createElement('option');
        option.value = school;
        option.textContent = school;
        schoolFilter.appendChild(option);
    });

    // Clear and populate grade filter
    gradeFilter.innerHTML = '<option value="">All Grades</option>';
    grades.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = grade;
        gradeFilter.appendChild(option);
    });

    // Clear and populate class filter
    classFilter.innerHTML = '<option value="">All Classes</option>';
    classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls;
        classFilter.appendChild(option);
    });
}

function applyStudentFilters() {
    const schoolFilter = document.getElementById('filterSchool').value;
    const gradeFilter = document.getElementById('filterGrade').value;
    const classFilter = document.getElementById('filterClass').value;

    // Filter students based on selected criteria
    let filteredStudents = allStudents.filter(student => {
        const metadata = student.metadata;

        const schoolMatch = !schoolFilter || (metadata.school || 'Unknown') === schoolFilter;
        const gradeMatch = !gradeFilter || (metadata.grade || 'Unknown') === gradeFilter;
        const classMatch = !classFilter || (metadata.class || 'Unknown') === classFilter;

        return schoolMatch && gradeMatch && classMatch;
    });

    // Update dropdown with filtered students
    updateStudentDropdown(filteredStudents);

    // Show filter stats
    const statsEl = document.getElementById('filterStats');
    if (schoolFilter || gradeFilter || classFilter) {
        statsEl.classList.add('visible');
        statsEl.innerHTML = `
            📊 Showing ${filteredStudents.length} of ${allStudents.length} students
            ${schoolFilter ? `<br>• School: <strong>${schoolFilter}</strong>` : ''}
            ${gradeFilter ? `<br>• Grade: <strong>${gradeFilter}</strong>` : ''}
            ${classFilter ? `<br>• Class: <strong>${classFilter}</strong>` : ''}
        `;
    } else {
        statsEl.classList.remove('visible');
    }
}

function clearAllFilters() {
    document.getElementById('filterSchool').value = '';
    document.getElementById('filterGrade').value = '';
    document.getElementById('filterClass').value = '';
    document.getElementById('filterStats').classList.remove('visible');

    // Show all students
    updateStudentDropdown(allStudents);
}

function updateStudentDropdown(students, currentId = null) {
    const select = document.getElementById('studentSelect');
    select.innerHTML = '';

    // Update student count
    const countEl = document.getElementById('studentCount');
    if (countEl) {
        countEl.textContent = `(${students.length} students)`;
    }

    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;

        const metadata = student.metadata;
        const label = `${student.id} - ${metadata.school || 'School?'}, Grade ${metadata.grade || '?'}${metadata.class ? ', Class ' + metadata.class : ''}`;
        option.textContent = label;

        if (student.id === currentId || (currentId === null && student.id === 'student_001')) {
            option.selected = true;
        }

        select.appendChild(option);
    });
}

async function handleStudentChange(event) {
    const studentId = event.target.value;

    try {
        const response = await fetch(`${API_BASE}/student/${studentId}`);
        const data = await response.json();

        currentStudent = data;
        concepts = data.concepts;

        renderMastery();
        populateConceptSelects(); // Repopulate concept selects for the new student
        displayStudentMetadata(data.metadata);

    } catch (error) {
        console.error('Error changing student:', error);
        showError('Failed to load student data');
    }
}

function displayStudentMetadata(metadata) {
    const container = document.getElementById('studentMetadata');

    if (!metadata || Object.keys(metadata).length === 0) {
        container.classList.remove('visible');
        container.innerHTML = ''; // Clear content if no metadata
        return;
    }

    container.innerHTML = '';
    container.classList.add('visible');

    // Display relevant metadata
    const displayFields = ['school', 'age', 'grade', 'class', 'uploaded_at'];

    displayFields.forEach(field => {
        if (metadata[field]) {
            const item = document.createElement('div');
            item.className = 'metadata-item';

            let label = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
            let value = metadata[field];

            if (field === 'uploaded_at') {
                value = new Date(value).toLocaleString();
            }

            item.innerHTML = `
                <span class="metadata-label">${label}:</span>
                <span class="metadata-value">${value}</span>
            `;

            container.appendChild(item);
        }
    });
}

// ============================================================================
// PERFORMANCE PREDICTION
// ============================================================================

async function predictPerformance() {
    const concept = document.getElementById('testConcept').value;
    const difficulty = parseFloat(document.getElementById('difficulty').value);
    const timePressure = parseFloat(document.getElementById('timePressure').value);
    const language = parseFloat(document.getElementById('language').value);

    try {
        const response = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                concept,
                difficulty,
                time_pressure: timePressure,
                language_complexity: language
            })
        });

        const result = await response.json();
        displayPrediction(result);

    } catch (error) {
        console.error('Prediction error:', error);
        showError('Failed to predict performance');
    }
}

function displayPrediction(result) {
    const container = document.getElementById('predictionResult');

    const probability = (result.probability * 100).toFixed(1);
    const components = result.components;

    container.innerHTML = `
        <div class="probability-display">
            <div class="probability-value">${probability}%</div>
            <div class="probability-label">Predicted Success Probability</div>
        </div>
        
        <div class="result-header">Causal Breakdown</div>
        
        <div class="result-item">
            <span class="result-label">Target Mastery Contribution</span>
            <span class="result-value">${components.target_mastery_contribution.toFixed(2)}</span>
        </div>
        
        <div class="result-item">
            <span class="result-label">Prerequisite Contribution</span>
            <span class="result-value">${components.prerequisite_contribution.toFixed(2)}</span>
        </div>
        
        <div class="result-item">
            <span class="result-label">Confounder Effect (difficulty, time, language)</span>
            <span class="result-value">${components.confounder_contribution.toFixed(2)}</span>
        </div>
        
        <div style="margin-top: 1rem; padding: 1rem; background: rgba(100, 180, 255, 0.1); border-radius: 8px;">
            <strong>Prerequisites:</strong> ${result.prerequisites.join(', ') || 'None'}
        </div>
    `;
}

// ============================================================================
// COUNTERFACTUAL INTERVENTION
// ============================================================================

async function applyIntervention() {
    const concept = document.getElementById('interventionConcept').value;
    const newMastery = parseFloat(document.getElementById('newMastery').value);
    const testConcept = document.getElementById('testConcept').value;
    const difficulty = parseFloat(document.getElementById('difficulty').value);
    const timePressure = parseFloat(document.getElementById('timePressure').value);
    const language = parseFloat(document.getElementById('language').value);

    try {
        const response = await fetch(`${API_BASE}/intervene`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                concept,
                new_mastery: newMastery,
                test_concept: testConcept,
                difficulty,
                time_pressure: timePressure,
                language_complexity: language
            })
        });

        const result = await response.json();
        displayIntervention(result);

    } catch (error) {
        console.error('Intervention error:', error);
        showError('Failed to apply intervention');
    }
}

function displayIntervention(result) {
    const container = document.getElementById('interventionResult');

    const intervention = result.intervention.intervention;
    const comparison = result.performance_comparison;

    const beforeProb = (comparison.original_probability * 100).toFixed(1);
    const afterProb = (comparison.counterfactual_probability * 100).toFixed(1);
    const improvement = (comparison.improvement * 100).toFixed(1);

    const improvementClass = comparison.improvement > 0 ? 'success' : 'warning';
    const improvementSign = comparison.improvement > 0 ? '+' : '';

    container.innerHTML = `
        <div class="result-header">Intervention Applied</div>
        
        <div class="result-item">
            <span class="result-label">Intervened Concept</span>
            <span class="result-value">${intervention.concept}</span>
        </div>
        
        <div class="result-item">
            <span class="result-label">Mastery Change</span>
            <span class="result-value">${(intervention.before_mastery * 100).toFixed(0)}% → ${(intervention.after_mastery * 100).toFixed(0)}%</span>
        </div>
        
        <div class="result-item">
            <span class="result-label">Affected Concepts</span>
            <span class="result-value">${result.intervention.affected_concepts.join(', ')}</span>
        </div>
        
        <div class="comparison-grid">
            <div class="comparison-card before">
                <div class="comparison-title">🔵 Before Intervention</div>
                <div class="probability-display">
                    <div class="probability-value">${beforeProb}%</div>
                    <div class="probability-label">Success Probability on "${comparison.test_concept}"</div>
                </div>
            </div>
            
            <div class="comparison-card after">
                <div class="comparison-title">🟢 After Intervention</div>
                <div class="probability-display">
                    <div class="probability-value">${afterProb}%</div>
                    <div class="probability-label">Success Probability on "${comparison.test_concept}"</div>
                </div>
                <div class="improvement-badge">
                    ${improvementSign}${improvement}% improvement
                </div>
            </div>
        </div>
        
        <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(72, 187, 120, 0.1); border-radius: 8px; border-left: 4px solid var(--success);">
            <strong>💡 Causal Insight:</strong> Improving mastery in "${intervention.concept}" from ${(intervention.before_mastery * 100).toFixed(0)}% to ${(intervention.after_mastery * 100).toFixed(0)}% leads to a ${improvementSign}${improvement}% change in predicted performance on "${comparison.test_concept}" <em>without any retraining</em>.
        </div>
    `;
}

// ============================================================================
// UTILITIES
// ============================================================================

function showError(message) {
    alert(`⚠️ Error: ${message}`);
}


// ============================================================================
// PARTIAL MARKING / SOFT EVIDENCE
// ============================================================================

async function submitPartialAnswer() {
    const answer = document.getElementById('studentAnswer').value;

    // Get selected concepts
    const selectedConcepts = [];
    document.querySelectorAll('.concept-check:checked').forEach(cb => {
        selectedConcepts.push(cb.value);
    });

    if (!answer.trim()) {
        alert('Please enter an answer.');
        return;
    }

    if (selectedConcepts.length === 0) {
        alert('Please select at least one related concept.');
        return;
    }

    const btn = document.getElementById('submitAnswerBtn');
    btn.textContent = 'Analyzing...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/submit_answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                answer: answer,
                concepts: selectedConcepts,
                student_id: currentStudent.student_id // Use actual ID
            })
        });

        const result = await response.json();

        displayMarkingResults(result);

        // Refresh mastery display as it might have changed
        await loadData();

    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('Failed to analyze answer.');
    } finally {
        btn.textContent = '📝 Analyze & Update Mastery';
        btn.disabled = false;
    }
}

function displayMarkingResults(result) {
    const container = document.getElementById('markingResult');
    const evidenceContainer = document.getElementById('evidenceBars');
    const updatesContainer = document.getElementById('masteryUpdates');

    container.style.display = 'block';
    evidenceContainer.innerHTML = '';
    updatesContainer.innerHTML = '';

    // Display Evidence Scores
    if (Object.keys(result.evidence).length === 0) {
        evidenceContainer.innerHTML = '<p>No evidence found for selected concepts.</p>';
    } else {
        for (const [concept, score] of Object.entries(result.evidence)) {
            const percent = (score * 100).toFixed(0);
            const div = document.createElement('div');
            div.className = 'evidence-item';
            div.innerHTML = `
                <span style="width: 120px; font-weight:bold;">${concept}</span>
                <div class="evidence-bar-bg">
                    <div class="evidence-bar-fill" style="width: ${percent}%"></div>
                </div>
                <span style="width: 50px; text-align:right;">${percent}%</span>
            `;
            evidenceContainer.appendChild(div);
        }
    }

    // Display Updates
    if (result.updates && result.updates.length > 0) {
        result.updates.forEach(update => {
            const div = document.createElement('div');
            div.className = 'update-log';
            const change = (update.new - update.old) * 100;
            const sign = change >= 0 ? '+' : '';
            div.innerHTML = `
                <strong>${update.concept}</strong> updated: 
                ${(update.old * 100).toFixed(1)}% → 
                <strong>${(update.new * 100).toFixed(1)}%</strong> 
                (${sign}${change.toFixed(1)}%)
            `;
            updatesContainer.appendChild(div);
        });
    }
}
