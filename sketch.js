// --- Constants & Config ---
const POINT_RAD = 8;
const CENTROID_RAD = 16; // Increased size
const VORONOI_STEP = 20; // Increased for better performance
const CONVERGENCE_TH = 1;

// --- State Variables ---
let k = 3;
let points = [];
let centroids = [];
let centroidTargets = []; // For smooth animation
let autoCluster = false;
let isDarkMode = true;

// UI Elements (Cached)
let uiPoints, uiK;
let btnReset, btnRestart, btnStep, btnAuto, btnKInc, btnKDec, btnTheme;
let iconSun, iconMoon;

// --- Themes ---
const THEMES = {
    dark: {
        bg: '#0f172a',
        grid: '#1e293b',
        text: '#f8fafc',
        pointDefault: [148, 163, 184], // Slate 400 - Brighter for visibility
        pointClusterAlpha: 200,
        voronoiAlpha: 15,
        shadowBlur: 15,
        shadowColor: null, // Use point color for glow
        useStroke: false,
        palettes: [
            '#22d3ee', // Cyan
            '#f472b6', // Pink
            '#a3e635', // Lime
            '#facc15', // Yellow
            '#c084fc', // Purple
            '#fb7185', // Rose
            '#38bdf8', // Sky
            '#34d399', // Emerald
            '#818cf8', // Indigo
            '#fbbf24'  // Amber
        ]
    },
    light: {
        bg: '#ffffff', // Pure white for cleaner look
        grid: '#cbd5e1', // Slate 300 - Darker for visibility on white
        text: '#1e293b',
        pointDefault: [203, 213, 225], // Lighter slate for unfilled
        pointClusterAlpha: 220,
        voronoiAlpha: 20, // Slightly lighter
        shadowBlur: 10,  // Soft shadow, not glow
        shadowColor: 'rgba(0,0,0,0.1)', // Drop shadow color
        useStroke: true, // New flag for borders
        palettes: [
            '#0ea5e9', // Sky 500
            '#ec4899', // Pink 500
            '#84cc16', // Lime 500
            '#f59e0b', // Amber 500
            '#a855f7', // Purple 500
            '#f43f5e', // Rose 500
            '#06b6d4', // Cyan 500
            '#10b981', // Emerald 500
            '#6366f1', // Indigo 500
            '#ea580c'  // Orange 500
        ]
    }
};

let currentTheme = THEMES.dark;

function setup() {
    let cnv = createCanvas(windowWidth, windowHeight);
    cnv.style('display', 'block');
    pixelDensity(1);

    // Initial Setup
    // CRITICAL: cacheUI must be first because initCentroids calls updateUIStats
    cacheUI();
    bindEvents();
    initCentroids(); // Initialize with default K

    // Check system preference for theme? Optional. Defaulting to Dark as per CSS.
    updateThemeUI();
    textFont("Inter, sans-serif");
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    // 1. Background
    background(currentTheme.bg);

    // 2. Decor (Grid moved to later)

    // 3. Logic: Auto-step
    if (autoCluster && frameCount % 3 === 0) {
        stepKMeans();
    }

    // 3b. Animation
    animateCentroids();

    // 4. Rendering
    // Order matters: Background -> Voronoi -> Grid -> Lines -> Points -> Centroids
    if (centroids.length > 0) drawVoronoi();
    drawGrid(); // Draw grid *after* Voronoi so it's visible
    drawClusterLines();
    drawPoints();
    drawCentroids();
}

// --- Logic Implementation ---

function initCentroids() {
    centroids = [];
    centroidTargets = [];

    // Reset points cluster assignment
    for (let p of points) p.cluster = undefined;

    // Create random centroids
    for (let i = 0; i < k; i++) {
        let v = createVector(random(width * 0.1, width * 0.9), random(height * 0.1, height * 0.9));
        centroids.push(v.copy());
        centroidTargets.push(v.copy());
    }

    // If we have points, do an initial assignment so we don't see "unassigned" state weirdly
    assignToClusters();
    updateUIStats();
}

function mousePressed(e) {
    // Only add point if not clicking on UI
    // p5.js captures all clicks, but we can check if the target was the canvas
    // Use e.target if available, or fallback to simple check
    let target = e ? e.target : window.event.target;

    // Allow click if canvas or body, but not if it's a specific UI control
    // It's safer to exclude known UI tags or classes if we want to catch "everything else"
    let isControl = target.closest && (target.closest('button') || target.closest('.card') || target.closest('.instructions'));

    if (!isControl) {
        points.push({
            x: mouseX,
            y: mouseY,
            cluster: undefined
        });
        assignToClusters(); // Immediate update
        updateUIStats();
    }
}

function stepKMeans() {
    if (points.length === 0) return;
    assignToClusters();
    computeCentroidTargets();
}

function assignToClusters() {
    for (let p of points) {
        let minDist = Infinity;
        let idx = 0;
        for (let i = 0; i < centroids.length; i++) {
            let d = (p.x - centroids[i].x) ** 2 + (p.y - centroids[i].y) ** 2;
            if (d < minDist) {
                minDist = d;
                idx = i;
            }
        }
        p.cluster = idx;
    }
}

function computeCentroidTargets() {
    let sums = Array.from({ length: k }, () => createVector(0, 0));
    let counts = Array(k).fill(0);

    for (let p of points) {
        if (p.cluster !== undefined && centroids[p.cluster]) {
            sums[p.cluster].x += p.x;
            sums[p.cluster].y += p.y;
            counts[p.cluster]++;
        }
    }

    for (let i = 0; i < k; i++) {
        if (counts[i] > 0) {
            centroidTargets[i] = createVector(sums[i].x / counts[i], sums[i].y / counts[i]);
        } else {
            // If empty cluster, re-initialize randomly to keep it alive
            centroidTargets[i] = createVector(random(width * 0.1, width * 0.9), random(height * 0.1, height * 0.9));
        }
    }
}

function animateCentroids() {
    for (let i = 0; i < k; i++) {
        let t = centroidTargets[i];
        if (!t) continue;
        centroids[i].x = lerp(centroids[i].x, t.x, 0.1); // Smooth lerp
        centroids[i].y = lerp(centroids[i].y, t.y, 0.1);
    }
}

// --- Drawing Functions ---

function drawGrid() {
    stroke(currentTheme.grid);
    strokeWeight(1.5); // Thicker grid lines

    // Simple modern grid: Dots or very light lines
    // Let's do a large grid
    for (let x = 0; x < width; x += 50) line(x, 0, x, height);
    for (let y = 0; y < height; y += 50) line(0, y, width, y);
}

function drawVoronoi() {
    noStroke();
    // Optimization: Low res grid for Voronoi
    // Note: Rendering rects per pixel is slow in P5 for full screen.
    // Let's keep step reasonable (20px).

    for (let x = 0; x < width; x += VORONOI_STEP) {
        for (let y = 0; y < height; y += VORONOI_STEP) {
            let cx = x + VORONOI_STEP / 2;
            let cy = y + VORONOI_STEP / 2;

            let minDist = Infinity;
            let idx = 0;

            for (let i = 0; i < centroids.length; i++) {
                let d = (cx - centroids[i].x) ** 2 + (cy - centroids[i].y) ** 2;
                if (d < minDist) {
                    minDist = d;
                    idx = i;
                }
            }

            let cHex = currentTheme.palettes[idx % currentTheme.palettes.length];
            let c = color(cHex);
            c.setAlpha(currentTheme.voronoiAlpha);
            fill(c);
            rect(x, y, VORONOI_STEP, VORONOI_STEP);
        }
    }
}

function drawClusterLines() {
    strokeWeight(1);
    for (let p of points) {
        if (p.cluster !== undefined && centroids[p.cluster]) {
            let cHex = currentTheme.palettes[p.cluster % currentTheme.palettes.length];
            let c = color(cHex);
            c.setAlpha(50); // Very faint
            stroke(c);
            line(p.x, p.y, centroids[p.cluster].x, centroids[p.cluster].y);
        }
    }
}

function drawPoints() {
    for (let p of points) {
        let isHover = dist(mouseX, mouseY, p.x, p.y) < 15;

        let c;
        if (p.cluster !== undefined) {
            let cHex = currentTheme.palettes[p.cluster % currentTheme.palettes.length];
            c = color(cHex);
        } else {
            c = color(currentTheme.pointDefault);
        }

        // Effects
        if (currentTheme.shadowBlur > 0) {
            drawingContext.shadowBlur = isHover ? 20 : currentTheme.shadowBlur;
            // Use specific shadow color if defined (for drop shadow), otherwise use point color (for glow)
            drawingContext.shadowColor = currentTheme.shadowColor ? currentTheme.shadowColor : c.toString();
        } else {
            drawingContext.shadowBlur = 0;
        }

        if (currentTheme.useStroke) {
            stroke(255);
            strokeWeight(2);
        } else {
            noStroke();
        }

        fill(c);
        circle(p.x, p.y, isHover ? POINT_RAD * 1.5 : POINT_RAD * 2);

        // Reset effects
        drawingContext.shadowBlur = 0;
    }
}

function drawCentroids() {
    for (let i = 0; i < centroids.length; i++) {
        let cHex = currentTheme.palettes[i % currentTheme.palettes.length];
        let c = color(cHex);
        let x = centroids[i].x;
        let y = centroids[i].y;

        // 1. Pulsing Halo
        let pulse = map(sin(frameCount * 0.08), -1, 1, 1.2, 1.6);
        let pulseAlpha = map(sin(frameCount * 0.08), -1, 1, 20, 50);

        noStroke();
        c.setAlpha(pulseAlpha);
        fill(c);
        circle(x, y, CENTROID_RAD * 2 * pulse);
        c.setAlpha(255); // Reset

        // 2. Glow Effects
        if (currentTheme.shadowBlur > 0) {
            drawingContext.shadowBlur = 40; // Stronger glow
            drawingContext.shadowColor = currentTheme.shadowColor ? currentTheme.shadowColor : c.toString();
        }

        // 3. Outer Ring
        stroke(c);
        strokeWeight(currentTheme.useStroke ? 3 : 2.5);
        noFill();
        circle(x, y, CENTROID_RAD * 2 + 6);

        // 4. Inner Core
        if (currentTheme.useStroke) {
            stroke(255);
            strokeWeight(2);
        } else {
            noStroke();
        }

        fill(c);
        circle(x, y, CENTROID_RAD * 2);

        // Reset Effects
        drawingContext.shadowBlur = 0;

        // 5. Label
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(14); // Larger text
        textStyle(BOLD);
        text(i + 1, x, y + 1); // Slight offset for optical center
        textStyle(NORMAL);
    }
}


// --- UI Integration ---

function cacheUI() {
    // Using vanilla JS for reliable DOM selection
    uiPoints = document.getElementById('points-val');
    uiK = document.getElementById('k-val');
    btnReset = document.getElementById('btn-reset');
    btnRestart = document.getElementById('btn-restart');
    btnStep = document.getElementById('btn-step');
    btnAuto = document.getElementById('btn-auto');
    btnKInc = document.getElementById('k-inc');
    btnKDec = document.getElementById('k-dec');
    btnTheme = document.getElementById('theme-toggle');
    iconSun = document.getElementById('sun-icon');
    iconMoon = document.getElementById('moon-icon');
}

function bindEvents() {
    if (btnReset) btnReset.addEventListener('click', () => {
        points = [];
        initCentroids();
        // Auto mode persists
        updateUIStats();
    });

    if (btnRestart) btnRestart.addEventListener('click', () => {
        // Keep points, just re-init centroids
        initCentroids();
        // Auto mode persists
        updateUIStats();
    });

    if (btnStep) btnStep.addEventListener('click', () => {
        autoCluster = false;
        btnAuto.classList.remove('active');
        stepKMeans();
    });

    if (btnAuto) btnAuto.addEventListener('click', () => {
        autoCluster = !autoCluster;
        if (autoCluster) btnAuto.classList.add('active');
        else btnAuto.classList.remove('active');
    });

    if (btnKInc) btnKInc.addEventListener('click', () => {
        k = Math.min(k + 1, 10);
        initCentroids();
    });

    if (btnKDec) btnKDec.addEventListener('click', () => {
        k = Math.max(k - 1, 1);
        initCentroids();
    });

    if (btnTheme) btnTheme.addEventListener('click', toggleTheme);
}

function updateUIStats() {
    if (uiPoints) uiPoints.textContent = points.length;
    if (uiK) uiK.textContent = k;
}

function updateThemeUI() {
    // Update State
    currentTheme = isDarkMode ? THEMES.dark : THEMES.light;

    // Update HTML/CSS
    if (isDarkMode) {
        document.body.classList.remove('light-theme');
        if (iconMoon) iconMoon.style.display = 'block';
        if (iconSun) iconSun.style.display = 'none';
    } else {
        document.body.classList.add('light-theme');
        if (iconMoon) iconMoon.style.display = 'none';
        if (iconSun) iconSun.style.display = 'block';
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    updateThemeUI();
}