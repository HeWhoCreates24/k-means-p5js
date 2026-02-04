const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 640;
const POINT_RAD = 10;
const VORONOI_STEP = 20;
const CONVERGENCE_TH = 1;
let k = 0;
let points = [];
let centroids = [];
let centroidTargets = [];
let colors = [];
let autoCluster = false;
let hoverPoint = null;

function setup() {
    createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    pixelDensity(1);
    initColors();
    initCentroids();
    textFont("Helvetica, Arial");
}

function draw() {
    background(245);

    drawGrid();
    if (centroids.length > 0) drawVoronoi();
    drawClusterLines();
    drawPoints();
    drawCentroids();

    if (!(mouseX > 10 && mouseX < 320 && mouseY > 10 && mouseY < 104)) drawUI();

    if (autoCluster) {
        if (frameCount % 10 == 0) {
            stepKMeans();
        }
    }

    animateCentroids();
}

function initColors() {
    const palette = [
        [244, 117, 96],   // coral
        [100, 143, 255],  // blue
        [100, 220, 150],  // mint
        [255, 200, 90],   // warm yellow
        [200, 120, 255],  // lavender
        [80, 220, 220],   // cyan
        [255, 140, 190],  // pink
        [180, 220, 120],  // lime
        [200, 170, 255],
        [255, 170, 110]
    ];

    colors = palette.map(c => color(c[0], c[1], c[2], 220));
}

function initCentroids() {
    centroids = [];
    centroidTargets = [];

    for (let i = 0; i < k; i++) {
        let v = createVector(random(60, width - 60), random(60, height - 60));

        centroids.push(v.copy());
        centroidTargets.push(v.copy());
    }

    for (let p of points) p.cluster = undefined;
}

function drawGrid() {
    push();

    stroke(230);
    strokeWeight(1);

    for (let x = 0; x < width; x += 40) line(x, 0, x, height);
    for (let y = 0; y < height; y += 40) line(0, y, width, y);

    stroke(200);
    line(0, height / 2, width, height / 2);
    line(width / 2, 0, width / 2, height);

    pop();
}

function drawVoronoi() {
    noStroke();

    for (let x = 0; x < width; x += VORONOI_STEP) {
        for (let y = 0; y < height; y += VORONOI_STEP) {
            let minDist = Infinity;
            let idx = 0;

            for (let i = 0; i < centroids.length; i++) {
                let sqDist = (x - centroids[i].x) ** 2 + (y - centroids[i].y) ** 2;

                if (sqDist < minDist) {
                    minDist = sqDist;
                    idx = i;
                }
            }

            let c = colors[idx];

            fill(red(c), green(c), blue(c), 20);
            rect(x, y, VORONOI_STEP, VORONOI_STEP);
        }
    }
}

function drawClusterLines() {
    strokeWeight(1.5);

    for (let p of points) {
        if (p.cluster !== undefined && centroids[p.cluster]) {
            let c = colors[p.cluster];

            stroke(red(c), green(c), blue(c), 90);
            line(p.x, p.y, centroids[p.cluster].x, centroids[p.cluster].y);
        }
    }
    noStroke();
}

function drawPoints() {
    hoverPoint = null;

    for (let p of points) {
        let d = dist(mouseX, mouseY, p.x, p.y);

        if (d < 12) {
            hoverPoint = p;
            break;
        }
    }

    for (let p of points) {
        push();

        if (p.cluster !== undefined && centroids[p.cluster]) {
            let c = colors[p.cluster];

            fill(red(c), green(c), blue(c), 220);
            stroke(255);
            strokeWeight(1.2);
            circle(p.x, p.y, POINT_RAD + 2);

            noStroke();
            fill(255, 220);
            circle(p.x, p.y, POINT_RAD - 3);
        } else {
            fill(120, 130);
            stroke(60, 160);
            strokeWeight(0.8);
            circle(p.x, p.y, POINT_RAD + 4);
        }

        if (p === hoverPoint) {
            stroke(0, 60);
            strokeWeight(1.4);
            noFill();
            circle(p.x, p.y, POINT_RAD + 10);
        }

        pop();
    }

    if (hoverPoint) {
        push();

        fill(40, 230);
        stroke(0, 60);
        rectMode(CORNER);

        let txt = `(${Math.round(hoverPoint.x - width / 2) / 8}, ${Math.round(hoverPoint.y - height / 2) / 8})`;

        textSize(12);
        let w = textWidth(txt) + 12;
        let h = 18;
        let tx = constrain(mouseX + 12, 8, width - w - 8);
        let ty = constrain(mouseY - 10, 8, height - h - 8);

        fill(255);
        stroke(200);
        rect(tx, ty, w, h, 6);

        noStroke();
        fill(20);
        text(txt, tx + 6, ty + 13);

        pop();
    }
}

function drawCentroids() {
    for (let i = 0; i < centroids.length; i++) {
        let c = colors[i];

        push();

        stroke(red(c), green(c), blue(c), 200);
        strokeWeight(2.4);
        fill(255);
        circle(centroids[i].x, centroids[i].y, POINT_RAD + 16)

        noStroke();
        fill(red(c), green(c), blue(c), 230);
        circle(centroids[i].x, centroids[i].y, POINT_RAD + 10);

        fill(255);
        textSize(12);
        textAlign(CENTER, CENTER);
        text(i + 1, centroids[i].x, centroids[i].y);

        pop();
    }
}

function drawUI() {
    push();

    fill(255);
    stroke(200);
    rect(10, 10, 300, 84, 10);

    noStroke();
    fill(30);
    textSize(13);
    textAlign(LEFT, TOP);
    text(`Points: ${points.length}`, 20, 18);
    text(`Clusters (k): ${k}`, 110, 18);
    text(`Mode: ${autoCluster ? "Auto" : "Manual"}`, 220, 18);

    text("Click to add points", 20, 40);
    text("Space: Toggle Auto | S: Manual Step | R: Reset", 20, 56);
    text("+ / - : Change k", 20, 72);

    pop();
}

function mousePressed() {
    if (mouseButton === LEFT) {
        points.push({
            x: mouseX,
            y: mouseY,
            cluster: undefined
        });

        if (!autoCluster) assignToClusters();
    }
}

function keyPressed() {
    if (key === ' ') {
        autoCluster = !autoCluster;

        if (autoCluster) {
            if (k == 0) {
                k = 1;
                initCentroids();
            }
            assignToClusters();
            computeCentroidTargets();
        }
    } else if (key === 'S' || key === 's') {
        autoCluster = false;
        stepKMeans();
    } else if (key === 'R' || key === 'r') {
        points = [];
        k = 0;
        initCentroids();
        autoCluster = false;
    } else if (key === 'w' || key === 'W') {
        initCentroids();
    } else if (key === '+') {
        k = min(k + 1, 10);
        initCentroids();
    } else if (key === '-') {
        k = max(k - 1, 0);
        initCentroids();
    }
}

function assignToClusters() {
    for (let p of points) {
        let minDist = Infinity;
        let idx = 0;

        for (let i = 0; i < centroids.length; i++) {
            let sqDist = (p.x - centroids[i].x) ** 2 + (p.y - centroids[i].y) ** 2;

            if (sqDist < minDist) {
                minDist = sqDist;
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
            centroidTargets[i] = createVector(random(60, width - 60), random(60, height - 60));
        }
    }
}

function animateCentroids() {
    for (let i = 0; i < k; i++) {
        let t = centroidTargets[i];

        if (!t) continue;

        centroids[i].x = lerp(centroids[i].x, t.x, 0.1);
        centroids[i].y = lerp(centroids[i].y, t.y, 0.1);
    }
}

function stepKMeans() {
    assignToClusters();
    computeCentroidTargets();
}

function checkConvergence() {
    for (let i = 0; i < k; i++) {
        let d = dist(centroids[i].x, centroids[i].y, centroidTargets[i].x, centroidTargets[i].y);

        if (d > CONVERGENCE_TH) return false;
    }

    return true;
}