// ================================
// Food Recommendation App - JS with API Integration
// ================================

// API Configuration (using TheMealDB API - Free, no auth required)
const MEAL_API_BASE = 'https://www.themealdb.com/api/json/v1/1';

// Favorites storage
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    setupSmoothScrolling();
    loadInitialRecipes();
    initHeroFloating();
});

// Initialize all event listeners
function initializeEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
}

// Initialize hero floating decorations and simple parallax
function initHeroFloating() {
    const decor = document.querySelector('.hero-decor');
    if (!decor) return;

    const items = Array.from(decor.querySelectorAll('.floating-food'));

    // Randomize starting offsets for a lively look
    items.forEach((el, i) => {
        const jitterX = (Math.random() - 0.5) * 8; // +/- px
        const jitterY = (Math.random() - 0.5) * 6;
        el.style.transform = `translate(${jitterX}px, ${jitterY}px)`;
        el.style.opacity = 0.95 - Math.random() * 0.15;
        // small stagger using CSS animation delay
        el.style.animationDelay = `${Math.random() * 1.5}s`;
    });

    // Parallax on mouse move (subtle)
    const hero = document.querySelector('.hero-section');
    let bounds = hero.getBoundingClientRect();

    function onMove(e) {
        const x = (e.clientX - bounds.left) / bounds.width - 0.5; // -0.5..0.5
        const y = (e.clientY - bounds.top) / bounds.height - 0.5;

        items.forEach((el, idx) => {
            const speed = parseFloat(el.getAttribute('data-speed')) || 1;
            const tx = x * 12 * speed * (idx % 2 === 0 ? 1 : -1);
            const ty = y * 8 * speed;
            el.style.transform = `translate(${tx}px, ${ty}px)`;
        });
    }

    function onLeave() {
        items.forEach((el) => {
            el.style.transform = '';
        });
    }

    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);

    // Recompute bounds on resize
    window.addEventListener('resize', () => {
        bounds = hero.getBoundingClientRect();
    });
}

// Load initial recipes on page load
function loadInitialRecipes() {
    // Load recipes for common ingredients
    searchByIngredient('chicken');
}

// Handle search functionality
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const ingredients = searchInput.value.trim();

    if (ingredients.length > 0) {
        // Use the first ingredient for the search
        const firstIngredient = ingredients.split(',')[0].trim();
        searchByIngredient(firstIngredient);
        searchInput.value = '';
    } else {
        showError('Please enter at least one ingredient');
    }
}

// Search meals by ingredient
async function searchByIngredient(ingredient) {
    const spinner = document.getElementById('loadingSpinner');
    const container = document.getElementById('recipesContainer');
    const errorDiv = document.getElementById('errorMessage');
    const status = document.getElementById('recipeStatus');

    // Show loading state
    spinner.style.display = 'block';
    errorDiv.style.display = 'none';
    container.innerHTML = '';

    try {
        const cleanIngredient = ingredient.trim().toLowerCase();
        
        // Fetch meals by ingredient
        const response = await fetch(
            `${MEAL_API_BASE}/filter.php?i=${encodeURIComponent(cleanIngredient)}`
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const meals = data.meals;

        if (!meals || meals.length === 0) {
            showError(`No recipes found with ingredient: ${cleanIngredient}. Try another ingredient!`);
            spinner.style.display = 'none';
            loadInitialRecipes();
            return;
        }

        // Fetch detailed information for up to 9 meals
        const detailedMeals = await Promise.all(
            meals.slice(0, 9).map(meal => fetchMealDetails(meal.idMeal))
        );

        spinner.style.display = 'none';
        displayRecipes(detailedMeals);
        status.textContent = `Found ${detailedMeals.length} delicious recipes with "${cleanIngredient}"`;

    } catch (error) {
        console.error('Search error:', error);
        spinner.style.display = 'none';
        showError(`Unable to fetch recipes. Please try again.`);
    }
}

// Fetch detailed meal information
async function fetchMealDetails(mealId) {
    try {
        const response = await fetch(
            `${MEAL_API_BASE}/lookup.php?i=${mealId}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch meal details');
        }

        const data = await response.json();
        return data.meals ? data.meals[0] : null;
    } catch (error) {
        console.error('Error fetching meal details:', error);
        return null;
    }
}

// Display recipes in the container
function displayRecipes(meals) {
    const container = document.getElementById('recipesContainer');
    container.innerHTML = '';

    meals.forEach(meal => {
        if (meal) {
            const recipeCard = createRecipeCard(meal);
            container.innerHTML += recipeCard;
        }
    });

    // Re-setup like buttons after rendering
    setupLikeButtons();
}

// Create a recipe card HTML
function createRecipeCard(meal) {
    const isFavorite = favorites.includes(meal.idMeal);
    const heartClass = isFavorite ? 'fas' : 'far';

    const category = meal.strCategory || 'Mixed';
    const cuisine = meal.strArea || 'International';

    // Extract ingredients
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        if (meal[`strIngredient${i}`]) {
            ingredients.push(meal[`strIngredient${i}`]);
        }
    }

    return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="food-card card h-100 border-0 shadow-sm">
                <div class="food-image bg-secondary" style="height: 200px; overflow: hidden;">
                    <img src="${meal.strMealThumb}" class="card-img-top h-100 w-100" alt="${meal.strMeal}" style="object-fit: cover;">
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fw-bold mb-2" style="min-height: 2.5rem; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                        ${meal.strMeal}
                    </h5>
                    <div class="mb-3 flex-grow-1">
                        <small class="text-muted d-block">
                            <i class="fas fa-utensils"></i> ${category}
                        </small>
                        <small class="text-muted d-block">
                            <i class="fas fa-globe"></i> ${cuisine}
                        </small>
                        <small class="text-muted d-block mt-1">
                            <strong>Ingredients:</strong> ${ingredients.slice(0, 3).join(', ')}${ingredients.length > 3 ? '...' : ''}
                        </small>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-success">${category}</span>
                        <i class="${heartClass} fa-heart recipe-like text-danger" 
                           data-recipe-id="${meal.idMeal}" 
                           data-recipe-title="${meal.strMeal}"
                           style="cursor: pointer; font-size: 1.2rem;"></i>
                    </div>
                    <a href="${meal.strSource || '#'}" target="_blank" class="btn btn-sm btn-primary mt-3">
                        View Recipe <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Setup like button functionality
function setupLikeButtons() {
    const likeButtons = document.querySelectorAll('.recipe-like');

    likeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const recipeId = this.getAttribute('data-recipe-id');
            const recipeName = this.getAttribute('data-recipe-title');

            const isFavorite = favorites.includes(recipeId);

            if (isFavorite) {
                favorites = favorites.filter(id => id !== recipeId);
                this.classList.remove('fas');
                this.classList.add('far');
                showNotification(`Removed "${recipeName}" from favorites`);
            } else {
                favorites.push(recipeId);
                this.classList.remove('far');
                this.classList.add('fas');
                showNotification(`Added "${recipeName}" to favorites`);
            }

            // Save to localStorage
            localStorage.setItem('favorites', JSON.stringify(favorites));
        });
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.style.display = 'block';
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success alert-dismissible fade show position-fixed bottom-0 end-0 m-3';
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Setup smooth scrolling for navigation links
function setupSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                const target = document.querySelector(href);
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Navbar background on scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('shadow-lg');
    } else {
        navbar.classList.remove('shadow-lg');
    }
});

// Collapse mobile menu when a link is clicked
document.querySelectorAll('.navbar-nav a').forEach(link => {
    link.addEventListener('click', function() {
        const navbarToggle = document.querySelector('.navbar-toggler');
        const navbarNav = document.querySelector('#navbarNav');

        if (navbarNav && navbarNav.classList.contains('show')) {
            navbarToggle.click();
        }
    });
});