# K-Means Clustering Visualization

A real-time, interactive visualization of the K-Means clustering algorithm built with **p5.js**. This project was created to demonstrate how the algorithm iteratively groups data points into clusters.

## Features

*   **Interactive Canvas:** Click anywhere to add data points dynamically.
*   **Real-time Animations:** Watch centroids move and converge smoothly.
*   **Voronoi Tessellation:** Visualizes the effective area of each cluster in the background.
*   **Dynamic Controls:**
    *   Adjust the number of clusters (K) on the fly.
    *   Step-by-step execution or automatic convergence.
    *   Dark and Light themes.

## Usage

1.  **Add Points:** Click anywhere on the screen to add data points to the playground.
2.  **Control the Algorithm:**
    *   **STEP:** Perform a single iteration of the assignment and update steps.
    *   **AUTO:** Continuously run the algorithm until convergence.
    *   **restart:** Reset the centroids' positions while keeping your data points.
    *   **clr:** Remove all data points to start fresh.
3.  **Adjust Parameters:** Use the `+` and `-` buttons under "CLUSTERS (K)" to change the number of centroids.

## How It Works

The K-Means algorithm is an unsupervised learning technique used to partition data into $k$ clusters. Here's how it is implemented in this visualization:

1.  **Initialization:**
    *   The algorithm starts by randomly placing $k$ centroids (the large, pulsing circles) on the canvas.

2.  **Assignment Step:**
    *   Each data point (small dot) is assigned to the nearest centroid based on Euclidean distance.
    *   *Visual:* The dots change color to match their assigned cluster. The background regions (Voronoi cells) show which centroid is closest to any given pixel.

3.  **Update Step:**
    *   The new position of each centroid is calculated by taking the average (mean) position of all points assigned to it.
    *   *Visual:* The centroids smoothly animate to these new average centers.

4.  **Repeat:**
    *   Steps 2 and 3 are repeated until the centroids stop moving (convergence) or until you stop the process.

## Technologies Used

*   **[p5.js](https://p5js.org/):** Used for the core rendering, vector math, and animation loop. It makes handling the canvas and interactive elements seamless.
*   **HTML5 & CSS3:** For the responsive user interface overlay and styling.
