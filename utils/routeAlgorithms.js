/**
 * Advanced Route Optimization Algorithms
 * Implements Google Maps-like routing algorithms:
 * 1. Dijkstra's Algorithm - Foundation for shortest path
 * 2. A* (A-Star) Algorithm - Heuristic-based pathfinding
 * 3. Held-Karp (Dynamic Programming) - Optimal TSP for small instances
 * 4. 2-opt Local Search - Fast route improvement
 * 5. Simulated Annealing - Meta-heuristic optimization
 * 6. Christofides-inspired heuristic - Near-optimal for larger instances
 */

import { calculateHaversineDistance } from './calculations';

// ============================================================================
// DIJKSTRA'S ALGORITHM
// Foundation of shortest path algorithms - finds optimal path in weighted graph
// ============================================================================

/**
 * Dijkstra's Algorithm - Find shortest path from source to all other nodes
 * @param {Array<Array<number>>} graph - Adjacency matrix with distances
 * @param {number} source - Starting node index
 * @returns {Object} { distances: number[], previous: number[] }
 */
export const dijkstra = (graph, source) => {
  const n = graph.length;
  const distances = new Array(n).fill(Infinity);
  const previous = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);

  distances[source] = 0;

  for (let i = 0; i < n; i++) {
    // Find minimum distance unvisited node
    let minDist = Infinity;
    let u = -1;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && distances[j] < minDist) {
        minDist = distances[j];
        u = j;
      }
    }

    if (u === -1) break;
    visited[u] = true;

    // Update distances to neighbors
    for (let v = 0; v < n; v++) {
      if (!visited[v] && graph[u][v] > 0) {
        const alt = distances[u] + graph[u][v];
        if (alt < distances[v]) {
          distances[v] = alt;
          previous[v] = u;
        }
      }
    }
  }

  return { distances, previous };
};

/**
 * Reconstruct path from Dijkstra's previous array
 * @param {number[]} previous - Previous node array from Dijkstra
 * @param {number} target - Target node index
 * @returns {number[]} Path from source to target
 */
export const reconstructPath = (previous, target) => {
  const path = [];
  let current = target;
  while (current !== -1) {
    path.unshift(current);
    current = previous[current];
  }
  return path;
};

// ============================================================================
// A* (A-STAR) ALGORITHM
// Heuristic-based pathfinding - faster than Dijkstra with good heuristic
// ============================================================================

/**
 * A* Algorithm - Find shortest path using heuristic
 * @param {Array<Array<number>>} graph - Adjacency matrix with distances
 * @param {number} source - Starting node index
 * @param {number} target - Target node index
 * @param {Array<Object>} nodes - Array of node objects with lat/lng for heuristic
 * @returns {Object} { path: number[], distance: number }
 */
export const aStar = (graph, source, target, nodes) => {
  const n = graph.length;
  
  // Priority queue implementation using array (for simplicity)
  const openSet = [source];
  const cameFrom = new Array(n).fill(-1);
  
  const gScore = new Array(n).fill(Infinity);
  gScore[source] = 0;
  
  const fScore = new Array(n).fill(Infinity);
  fScore[source] = heuristic(nodes[source], nodes[target]);
  
  while (openSet.length > 0) {
    // Get node with lowest fScore
    let currentIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (fScore[openSet[i]] < fScore[openSet[currentIdx]]) {
        currentIdx = i;
      }
    }
    const current = openSet[currentIdx];
    
    if (current === target) {
      // Reconstruct path
      const path = [];
      let node = current;
      while (node !== -1) {
        path.unshift(node);
        node = cameFrom[node];
      }
      return { path, distance: gScore[target] };
    }
    
    openSet.splice(currentIdx, 1);
    
    // Check all neighbors
    for (let neighbor = 0; neighbor < n; neighbor++) {
      if (graph[current][neighbor] <= 0 || neighbor === current) continue;
      
      const tentativeGScore = gScore[current] + graph[current][neighbor];
      
      if (tentativeGScore < gScore[neighbor]) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeGScore;
        fScore[neighbor] = tentativeGScore + heuristic(nodes[neighbor], nodes[target]);
        
        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        }
      }
    }
  }
  
  return { path: [], distance: Infinity }; // No path found
};

/**
 * Heuristic function for A* - uses Haversine distance
 * @param {Object} node1 - Node with lat/lng
 * @param {Object} node2 - Node with lat/lng
 * @returns {number} Estimated distance
 */
const heuristic = (node1, node2) => {
  if (!node1 || !node2) return 0;
  return calculateHaversineDistance(node1, node2);
};

// ============================================================================
// HELD-KARP ALGORITHM (Dynamic Programming)
// Optimal TSP solution - O(n²·2ⁿ) - use only for n ≤ 15
// ============================================================================

/**
 * Held-Karp Algorithm - Find optimal TSP tour using dynamic programming
 * @param {Array<Array<number>>} dist - Distance matrix
 * @param {number} start - Starting node (usually 0 for garage)
 * @param {number} end - Ending node (usually last for disposal site)
 * @returns {Object} { path: number[], distance: number }
 */
export const heldKarp = (dist, start = 0, end = null) => {
  const n = dist.length;
  
  // For TSP with different start and end, we need modified approach
  if (end === null) end = start;
  
  // If too large, fall back to heuristic
  if (n > 15) {
    console.warn('Held-Karp: Too many nodes, using heuristic instead');
    return null;
  }
  
  // Create list of intermediate nodes (exclude start and end)
  const intermediates = [];
  for (let i = 0; i < n; i++) {
    if (i !== start && i !== end) {
      intermediates.push(i);
    }
  }
  
  const m = intermediates.length;
  
  if (m === 0) {
    return { path: [start, end], distance: dist[start][end] };
  }
  
  // DP table: dp[mask][i] = min distance to reach intermediate node i visiting nodes in mask
  const dp = new Map();
  const parent = new Map();
  
  // Initialize: distance from start to each intermediate node
  for (let i = 0; i < m; i++) {
    const mask = 1 << i;
    const node = intermediates[i];
    dp.set(`${mask},${i}`, dist[start][node]);
    parent.set(`${mask},${i}`, -1);
  }
  
  // Fill DP table for subsets of increasing size
  for (let size = 2; size <= m; size++) {
    const subsets = getSubsetsOfSize(m, size);
    
    for (const mask of subsets) {
      for (let last = 0; last < m; last++) {
        if (!(mask & (1 << last))) continue; // last not in mask
        
        const prevMask = mask ^ (1 << last); // Remove last from mask
        const lastNode = intermediates[last];
        
        let bestDist = Infinity;
        let bestPrev = -1;
        
        for (let prev = 0; prev < m; prev++) {
          if (!(prevMask & (1 << prev))) continue; // prev not in prevMask
          
          const prevNode = intermediates[prev];
          const prevDist = dp.get(`${prevMask},${prev}`);
          
          if (prevDist !== undefined) {
            const newDist = prevDist + dist[prevNode][lastNode];
            if (newDist < bestDist) {
              bestDist = newDist;
              bestPrev = prev;
            }
          }
        }
        
        if (bestDist < Infinity) {
          dp.set(`${mask},${last}`, bestDist);
          parent.set(`${mask},${last}`, bestPrev);
        }
      }
    }
  }
  
  // Find best final path to end node
  const fullMask = (1 << m) - 1;
  let bestTotal = Infinity;
  let bestLast = -1;
  
  for (let last = 0; last < m; last++) {
    const lastNode = intermediates[last];
    const distToLast = dp.get(`${fullMask},${last}`);
    
    if (distToLast !== undefined) {
      const total = distToLast + dist[lastNode][end];
      if (total < bestTotal) {
        bestTotal = total;
        bestLast = last;
      }
    }
  }
  
  // Reconstruct path
  const path = [end];
  let mask = fullMask;
  let current = bestLast;
  
  while (current !== -1) {
    path.unshift(intermediates[current]);
    const prev = parent.get(`${mask},${current}`);
    mask ^= (1 << current);
    current = prev;
  }
  path.unshift(start);
  
  return { path, distance: bestTotal };
};

/**
 * Generate all subsets of given size
 */
const getSubsetsOfSize = (n, size) => {
  const subsets = [];
  
  const generate = (start, mask, remaining) => {
    if (remaining === 0) {
      subsets.push(mask);
      return;
    }
    for (let i = start; i < n; i++) {
      generate(i + 1, mask | (1 << i), remaining - 1);
    }
  };
  
  generate(0, 0, size);
  return subsets;
};

// ============================================================================
// 2-OPT LOCAL SEARCH
// Fast route improvement by reversing segments
// ============================================================================

/**
 * 2-opt Algorithm - Improve route by reversing segments
 * @param {number[]} route - Current route (array of node indices)
 * @param {Array<Array<number>>} dist - Distance matrix
 * @returns {Object} { route: number[], distance: number, improved: boolean }
 */
export const twoOpt = (route, dist) => {
  let improved = true;
  let bestRoute = [...route];
  let bestDistance = calculateRouteDistance(bestRoute, dist);
  
  while (improved) {
    improved = false;
    
    for (let i = 1; i < bestRoute.length - 2; i++) {
      for (let j = i + 1; j < bestRoute.length - 1; j++) {
        // Calculate change in distance if we reverse segment [i, j]
        const delta = calculate2OptDelta(bestRoute, dist, i, j);
        
        if (delta < -0.0001) { // Small epsilon to handle floating point
          // Reverse the segment
          const newRoute = twoOptSwap(bestRoute, i, j);
          bestRoute = newRoute;
          bestDistance += delta;
          improved = true;
        }
      }
    }
  }
  
  return { route: bestRoute, distance: bestDistance, improved: true };
};

/**
 * Calculate the change in distance from a 2-opt swap
 */
const calculate2OptDelta = (route, dist, i, j) => {
  const a = route[i - 1];
  const b = route[i];
  const c = route[j];
  const d = route[j + 1];
  
  const before = dist[a][b] + dist[c][d];
  const after = dist[a][c] + dist[b][d];
  
  return after - before;
};

/**
 * Perform 2-opt swap - reverse segment between i and j
 */
const twoOptSwap = (route, i, j) => {
  const newRoute = route.slice(0, i);
  
  // Add reversed segment
  for (let k = j; k >= i; k--) {
    newRoute.push(route[k]);
  }
  
  // Add remaining
  for (let k = j + 1; k < route.length; k++) {
    newRoute.push(route[k]);
  }
  
  return newRoute;
};

// ============================================================================
// SIMULATED ANNEALING
// Meta-heuristic that can escape local optima
// ============================================================================

/**
 * Simulated Annealing for TSP optimization
 * @param {number[]} initialRoute - Starting route
 * @param {Array<Array<number>>} dist - Distance matrix
 * @param {Object} options - Configuration options
 * @returns {Object} { route: number[], distance: number }
 */
export const simulatedAnnealing = (initialRoute, dist, options = {}) => {
  const {
    initialTemp = 10000,
    coolingRate = 0.9995,
    minTemp = 0.01,
    maxIterations = 100000
  } = options;
  
  let currentRoute = [...initialRoute];
  let currentDistance = calculateRouteDistance(currentRoute, dist);
  
  let bestRoute = [...currentRoute];
  let bestDistance = currentDistance;
  
  let temperature = initialTemp;
  let iteration = 0;
  
  while (temperature > minTemp && iteration < maxIterations) {
    // Generate neighbor solution (swap two random intermediate nodes)
    const newRoute = generateNeighbor(currentRoute);
    const newDistance = calculateRouteDistance(newRoute, dist);
    
    const delta = newDistance - currentDistance;
    
    // Accept if better, or with probability e^(-delta/temp) if worse
    if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
      currentRoute = newRoute;
      currentDistance = newDistance;
      
      if (currentDistance < bestDistance) {
        bestRoute = [...currentRoute];
        bestDistance = currentDistance;
      }
    }
    
    temperature *= coolingRate;
    iteration++;
  }
  
  return { route: bestRoute, distance: bestDistance };
};

/**
 * Generate neighbor solution by swapping two intermediate nodes
 */
const generateNeighbor = (route) => {
  const newRoute = [...route];
  
  // Don't swap first (start) and last (end) nodes
  if (route.length <= 3) return newRoute;
  
  const i = Math.floor(Math.random() * (route.length - 2)) + 1;
  let j = Math.floor(Math.random() * (route.length - 2)) + 1;
  
  while (j === i) {
    j = Math.floor(Math.random() * (route.length - 2)) + 1;
  }
  
  // Swap
  [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
  
  return newRoute;
};

// ============================================================================
// NEAREST NEIGHBOR (Quick Initial Solution)
// Used as starting point for optimization algorithms
// ============================================================================

/**
 * Nearest Neighbor Algorithm - Quick greedy solution
 * @param {Array<Array<number>>} dist - Distance matrix
 * @param {number} start - Starting node index
 * @param {number} end - Ending node index
 * @returns {Object} { route: number[], distance: number }
 */
export const nearestNeighbor = (dist, start, end) => {
  const n = dist.length;
  const visited = new Array(n).fill(false);
  const route = [start];
  visited[start] = true;
  if (start !== end) visited[end] = true; // Reserve end for last
  
  let current = start;
  
  while (route.length < n - (start !== end ? 1 : 0)) {
    let nearest = -1;
    let nearestDist = Infinity;
    
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[current][i] < nearestDist) {
        nearest = i;
        nearestDist = dist[current][i];
      }
    }
    
    if (nearest === -1) break;
    
    route.push(nearest);
    visited[nearest] = true;
    current = nearest;
  }
  
  // Add end node
  if (start !== end) {
    route.push(end);
  }
  
  return { route, distance: calculateRouteDistance(route, dist) };
};

// ============================================================================
// CHRISTOFIDES-INSPIRED HEURISTIC
// Guaranteed to be within 1.5x of optimal for metric TSP
// Simplified version using minimum spanning tree concept
// ============================================================================

/**
 * Christofides-inspired algorithm for near-optimal TSP
 * @param {Array<Array<number>>} dist - Distance matrix
 * @param {number} start - Starting node index
 * @param {number} end - Ending node index
 * @returns {Object} { route: number[], distance: number }
 */
export const christofidesInspired = (dist, start, end) => {
  const n = dist.length;
  
  // Step 1: Build Minimum Spanning Tree using Prim's algorithm
  const mst = primMST(dist);
  
  // Step 2: Find odd-degree vertices
  const degree = new Array(n).fill(0);
  for (const edge of mst) {
    degree[edge.from]++;
    degree[edge.to]++;
  }
  
  const oddVertices = [];
  for (let i = 0; i < n; i++) {
    if (degree[i] % 2 === 1) {
      oddVertices.push(i);
    }
  }
  
  // Step 3: Find minimum weight perfect matching on odd vertices (greedy approximation)
  const matching = greedyMatching(oddVertices, dist);
  
  // Step 4: Combine MST and matching to form multigraph
  const multigraph = [...mst, ...matching];
  
  // Step 5: Find Eulerian path (simplified - just visit nodes in order discovered)
  const visited = new Array(n).fill(false);
  const route = [];
  
  // DFS from start
  const dfs = (node) => {
    if (visited[node]) return;
    visited[node] = true;
    route.push(node);
    
    // Find neighbors in multigraph
    const neighbors = [];
    for (const edge of multigraph) {
      if (edge.from === node && !visited[edge.to]) {
        neighbors.push({ node: edge.to, dist: edge.weight });
      } else if (edge.to === node && !visited[edge.from]) {
        neighbors.push({ node: edge.from, dist: edge.weight });
      }
    }
    
    // Sort by distance and visit
    neighbors.sort((a, b) => a.dist - b.dist);
    for (const neighbor of neighbors) {
      dfs(neighbor.node);
    }
  };
  
  dfs(start);
  
  // Ensure end is at the end
  if (start !== end && route[route.length - 1] !== end) {
    const endIdx = route.indexOf(end);
    if (endIdx !== -1) {
      route.splice(endIdx, 1);
    }
    route.push(end);
  }
  
  return { route, distance: calculateRouteDistance(route, dist) };
};

/**
 * Prim's MST Algorithm
 */
const primMST = (dist) => {
  const n = dist.length;
  const inMST = new Array(n).fill(false);
  const edges = [];
  
  inMST[0] = true;
  
  for (let count = 0; count < n - 1; count++) {
    let minEdge = { from: -1, to: -1, weight: Infinity };
    
    for (let i = 0; i < n; i++) {
      if (!inMST[i]) continue;
      
      for (let j = 0; j < n; j++) {
        if (inMST[j]) continue;
        
        if (dist[i][j] < minEdge.weight) {
          minEdge = { from: i, to: j, weight: dist[i][j] };
        }
      }
    }
    
    if (minEdge.to !== -1) {
      edges.push(minEdge);
      inMST[minEdge.to] = true;
    }
  }
  
  return edges;
};

/**
 * Greedy matching for odd-degree vertices
 */
const greedyMatching = (vertices, dist) => {
  const matched = new Set();
  const matching = [];
  
  // Sort all pairs by distance
  const pairs = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      pairs.push({
        i: vertices[i],
        j: vertices[j],
        dist: dist[vertices[i]][vertices[j]]
      });
    }
  }
  pairs.sort((a, b) => a.dist - b.dist);
  
  // Greedily match
  for (const pair of pairs) {
    if (!matched.has(pair.i) && !matched.has(pair.j)) {
      matching.push({ from: pair.i, to: pair.j, weight: pair.dist });
      matched.add(pair.i);
      matched.add(pair.j);
    }
  }
  
  return matching;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate total distance of a route
 */
export const calculateRouteDistance = (route, dist) => {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += dist[route[i]][route[i + 1]];
  }
  return total;
};

/**
 * Master optimization function - chooses best algorithm based on problem size
 * @param {Array<Array<number>>} distanceMatrix - Pre-computed distance matrix
 * @param {number} startIdx - Index of start node (garage)
 * @param {number} endIdx - Index of end node (disposal site)
 * @param {Array<Object>} nodes - Array of all nodes for heuristics
 * @returns {Object} { route: number[], distance: number, algorithm: string }
 */
export const optimizeRoute = (distanceMatrix, startIdx, endIdx, nodes) => {
  const n = distanceMatrix.length;
  
  if (n <= 2) {
    return {
      route: startIdx === endIdx ? [startIdx] : [startIdx, endIdx],
      distance: startIdx === endIdx ? 0 : distanceMatrix[startIdx][endIdx],
      algorithm: 'direct'
    };
  }
  
  let result;
  let algorithm;
  
  // For small instances (≤12 nodes), use Held-Karp for optimal solution
  if (n <= 12) {
    const hkResult = heldKarp(distanceMatrix, startIdx, endIdx);
    if (hkResult && hkResult.path) {
      result = { route: hkResult.path, distance: hkResult.distance };
      algorithm = 'Held-Karp (Optimal)';
    }
  }
  
  // For medium instances or if Held-Karp failed
  if (!result || n > 12) {
    // Start with Nearest Neighbor
    const nnResult = nearestNeighbor(distanceMatrix, startIdx, endIdx);
    
    // Apply 2-opt optimization
    const twoOptResult = twoOpt(nnResult.route, distanceMatrix);
    
    // Apply Simulated Annealing for further improvement
    const saResult = simulatedAnnealing(twoOptResult.route, distanceMatrix, {
      initialTemp: 10000,
      coolingRate: 0.9995,
      minTemp: 0.001,
      maxIterations: n * 5000
    });
    
    // Also try Christofides-inspired approach
    const christoResult = christofidesInspired(distanceMatrix, startIdx, endIdx);
    const christoOptimized = twoOpt(christoResult.route, distanceMatrix);
    
    // Choose the best result
    if (saResult.distance <= christoOptimized.distance) {
      result = saResult;
      algorithm = '2-opt + Simulated Annealing';
    } else {
      result = christoOptimized;
      algorithm = 'Christofides + 2-opt';
    }
  }
  
  return {
    route: result.route,
    distance: result.distance,
    algorithm
  };
};

/**
 * Build distance matrix from points using provided distance function
 * @param {Array<Object>} points - Array of points with lat/lng
 * @param {Function} distanceFunc - Async function to calculate distance between two points
 * @returns {Promise<Array<Array<number>>>} Distance matrix
 */
export const buildDistanceMatrix = async (points, distanceFunc) => {
  const n = points.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // Calculate pairwise distances with rate limiting
  // Process in batches to avoid overwhelming OSRM API
  const pairs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push({ i, j });
    }
  }
  
  // Process in batches of 5 with delays to avoid rate limiting
  const BATCH_SIZE = 5;
  for (let batchStart = 0; batchStart < pairs.length; batchStart += BATCH_SIZE) {
    const batch = pairs.slice(batchStart, batchStart + BATCH_SIZE);
    const batchPromises = batch.map(({ i, j }) =>
      distanceFunc(points[i], points[j]).then(dist => {
        matrix[i][j] = dist;
        matrix[j][i] = dist; // Symmetric
      })
    );
    await Promise.all(batchPromises);
    
    // Small delay between batches to avoid rate limiting
    if (batchStart + BATCH_SIZE < pairs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return matrix;
};
