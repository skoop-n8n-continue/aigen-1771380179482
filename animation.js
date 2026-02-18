// Zen Garden Dispensary - Animation Logic
// Dependencies: GSAP Core, MotionPathPlugin

// --- Configuration ---
const PRODUCTS_PER_CYCLE = 3; 
const CYCLE_DURATION = 18; // Seconds for one product to traverse the river
const STAGGER_DELAY = 3.5; // Seconds between products in a batch entering

let PRODUCTS = [];

// --- Initialization ---
async function loadProducts() {
  try {
    const response = await fetch('./products.json');
    const data = await response.json();
    PRODUCTS = data.products || [];
    console.log(`Loaded ${PRODUCTS.length} products.`);
    
    // Register GSAP Plugins
    gsap.registerPlugin(MotionPathPlugin);

    // Start the infinite cycle
    startCycle(0);
  } catch (error) {
    console.error('Failed to load products.json:', error);
  }
}

// --- Batch Logic ---
function getBatch(batchIndex) {
  if (PRODUCTS.length === 0) return [];
  
  // Calculate start index based on continuous flow
  // We want to loop through ALL products eventually
  const totalProducts = PRODUCTS.length;
  const start = (batchIndex * PRODUCTS_PER_CYCLE) % totalProducts;
  
  const batch = [];
  for (let i = 0; i < PRODUCTS_PER_CYCLE; i++) {
    const index = (start + i) % totalProducts;
    batch.push(PRODUCTS[index]);
  }
  return batch;
}

// --- DOM Creation ---
function createProductCard(product, index) {
  const el = document.createElement('div');
  el.className = 'product';
  // Use a unique ID based on batch index to avoid collisions if we wanted to target specifically
  
  // Format Price
  let priceDisplay = `$${product.price}`;
  if (product.discounted_price > 0) {
    priceDisplay = `<span style="text-decoration: line-through; opacity: 0.6; font-size: 0.8em; margin-right: 8px;">$${product.price}</span> $${product.discounted_price}`;
  }

  // Get THC if available
  let thcDisplay = '';
  if (product.labResults) {
    const thcResult = product.labResults.find(r => r.labTest === 'THC');
    if (thcResult) {
      thcDisplay = `${thcResult.value}%`;
    }
  }

  el.innerHTML = `
    <div class="product-image-container">
      <img class="product-image" src="${product.image_url}" alt="${product.name}">
    </div>
    <div class="product-name">${product.name}</div>
    <div class="product-category">${product.category}</div>
    <div class="product-meta-row">
      <div class="product-price">${priceDisplay}</div>
      ${thcDisplay ? `<div class="product-thc">THC: ${thcDisplay}</div>` : ''}
    </div>
  `;
  
  return el;
}

// --- Animation Sequence ---
function startCycle(batchIndex) {
  const container = document.getElementById('products-container');
  
  // Create a dedicated container for this batch to easily remove it later
  const batchContainer = document.createElement('div');
  batchContainer.className = 'batch-wrapper';
  batchContainer.style.position = 'absolute';
  batchContainer.style.inset = '0';
  batchContainer.style.pointerEvents = 'none';
  container.appendChild(batchContainer);

  const batch = getBatch(batchIndex);
  const cards = [];

  // Create Cards
  batch.forEach((product, i) => {
    const card = createProductCard(product, i);
    batchContainer.appendChild(card);
    cards.push(card);
    
    // Initial State (Hidden, managed by GSAP)
    gsap.set(card, { 
      opacity: 0, 
      scale: 0.5,
      xPercent: -50, 
      yPercent: -50 
    });
  });

  // Create Timeline for this Batch
  const tl = gsap.timeline({
    onComplete: () => {
      // Cleanup DOM after batch finishes
      batchContainer.remove();
    }
  });

  // Animate each card
  cards.forEach((card, i) => {
    // Stagger start time relative to the batch timeline start
    const startTime = i * STAGGER_DELAY;

    // 1. Motion Path (The River Flow)
    tl.to(card, {
      motionPath: {
        path: "#river-path",
        align: "#river-path",
        alignOrigin: [0.5, 0.5],
        start: 0,
        end: 1,
        autoRotate: false 
      },
      duration: CYCLE_DURATION,
      ease: "power1.inOut", // Smooth river flow
    }, startTime);

    // 2. Entrance Fade In (Parallel)
    tl.to(card, {
      opacity: 1,
      scale: 1,
      duration: 1.5,
      ease: "power2.out"
    }, startTime);

    // 3. Exit Fade Out (Parallel, near end)
    const exitTime = startTime + (CYCLE_DURATION * 0.85);
    tl.to(card, {
      opacity: 0,
      scale: 0.8,
      duration: CYCLE_DURATION * 0.15,
      ease: "power2.in"
    }, exitTime);

    // 4. Secondary Floating Animation (Bobbing)
    // We can use a separate tween on the element itself since motionPath handles x/y transforms
    // Rotation is safe to animate independently
    gsap.to(card, {
      rotation: 2,
      duration: 2 + Math.random(),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    
    // Add a subtle vertical float offset if possible? 
    // MotionPath overwrites 'y', so we can't easily animate 'y' directly.
    // Instead, we can animate a wrapper or inner content?
    // Let's stick to rotation and scale breathing for the "floating" effect.
    gsap.to(card, {
      scale: 1.02,
      duration: 3 + Math.random(),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  });

  // Schedule Next Batch
  // To create an infinite stream, we spawn the next batch before this one finishes.
  // We want a constant cadence of cards appearing every STAGGER_DELAY seconds.
  // So the next batch should start after (PRODUCTS_PER_CYCLE * STAGGER_DELAY) seconds.
  
  const nextBatchDelay = PRODUCTS_PER_CYCLE * STAGGER_DELAY;
  
  gsap.delayedCall(nextBatchDelay, () => {
    startCycle(batchIndex + 1);
  });
}

// Start
window.addEventListener('DOMContentLoaded', loadProducts);
