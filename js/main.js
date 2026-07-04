// Mobile navigation toggle
const hamburger = document.getElementById('hamburger');
const mainNav = document.getElementById('mainNav');

hamburger.addEventListener('click', () => {
  const isActive = hamburger.classList.toggle('active');
  mainNav.classList.toggle('active');
  hamburger.setAttribute('aria-expanded', isActive);
});

// Close mobile nav when a nav-link is clicked (not dropdown toggles)
mainNav.querySelectorAll('.nav-link:not(.nav-dropdown-toggle)').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    mainNav.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// Close mobile nav when a dropdown menu link is clicked
mainNav.querySelectorAll('.nav-dropdown-menu a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    mainNav.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// Mobile dropdown toggle (tap to expand on mobile)
document.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
  toggle.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      const dropdown = toggle.closest('.nav-dropdown');
      dropdown.classList.toggle('active');
    }
  });
});

// Shared gallery image detection: probe gallery-1, gallery-2, ... by convention
const GALLERY_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const GALLERY_MAX = 60;

// Resolve one gallery-N image across supported extensions; resolve to the URL or null
function probeGalleryImage(base, index) {
  return new Promise((resolve) => {
    let e = 0;
    const attempt = () => {
      if (e >= GALLERY_EXTENSIONS.length) return resolve(null);
      const url = `${base}/gallery-${index}.${GALLERY_EXTENSIONS[e++]}`;
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = attempt;
      img.src = url;
    };
    attempt();
  });
}

// Walk gallery-1, gallery-2, ... until a gap is found
async function collectGalleryImages(base) {
  const found = [];
  for (let i = 1; i <= GALLERY_MAX; i++) {
    const url = await probeGalleryImage(base, i);
    if (!url) break;
    found.push(url);
  }
  return found;
}

// Slideshow (auto-detected "In Action" gallery)
(async function () {
  const slideshow = document.getElementById('slideshow');
  if (!slideshow) return;

  const slidesContainer = slideshow.querySelector('.slides');
  const base = slidesContainer.getAttribute('data-gallery');
  const urls = await collectGalleryImages(base);

  slidesContainer.innerHTML = urls.map((url, i) =>
    `<div class="slide${i === 0 ? ' active' : ''}">` +
    `<img src="${url}" alt="Cougar Mountain Alloy Robotics team in action" loading="lazy"></div>`
  ).join('');

  const slides = Array.from(slideshow.querySelectorAll('.slide'));
  if (!slides.length) return;

  const dotsContainer = slideshow.querySelector('.slide-dots');
  const prevBtn = slideshow.querySelector('.slide-prev');
  const nextBtn = slideshow.querySelector('.slide-next');
  let current = 0;
  let timer;
  const INTERVAL = 3000;

  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'slide-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
    dot.addEventListener('click', () => { goTo(i); restart(); });
    dotsContainer.appendChild(dot);
    return dot;
  });

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startTimer() {
    stopTimer();
    timer = setInterval(next, INTERVAL);
  }
  function stopTimer() {
    if (timer) clearInterval(timer);
  }
  // Restart the auto-advance timer after any manual interaction
  function restart() { startTimer(); }

  nextBtn.addEventListener('click', () => { next(); restart(); });
  prevBtn.addEventListener('click', () => { prev(); restart(); });

  slideshow.addEventListener('mouseenter', stopTimer);
  slideshow.addEventListener('mouseleave', startTimer);

  if (slides.length > 1) startTimer();
})();

// Season recap galleries (auto-detected) + shared lightbox
(function () {
  const galleries = document.querySelectorAll('.season-gallery');
  if (!galleries.length) return;

  // Build one shared lightbox for all galleries
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML =
    '<button class="lightbox-close" aria-label="Close">&times;</button>' +
    '<button class="lightbox-nav lightbox-prev" aria-label="Previous photo">&#8249;</button>' +
    '<img class="lightbox-img" src="" alt="">' +
    '<button class="lightbox-nav lightbox-next" aria-label="Next photo">&#8250;</button>';
  document.body.appendChild(lightbox);
  const lightboxImg = lightbox.querySelector('.lightbox-img');
  let currentList = [];
  let currentIndex = 0;

  function render() { lightboxImg.src = currentList[currentIndex]; }
  function open(list, index) {
    currentList = list;
    currentIndex = index;
    render();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  function nav(dir) {
    currentIndex = (currentIndex + dir + currentList.length) % currentList.length;
    render();
  }

  lightbox.querySelector('.lightbox-close').addEventListener('click', close);
  lightbox.querySelector('.lightbox-prev').addEventListener('click', (e) => { e.stopPropagation(); nav(-1); });
  lightbox.querySelector('.lightbox-next').addEventListener('click', (e) => { e.stopPropagation(); nav(1); });
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') nav(-1);
    else if (e.key === 'ArrowRight') nav(1);
  });

  galleries.forEach(async (gallery) => {
    const base = gallery.getAttribute('data-gallery');
    const found = await collectGalleryImages(base);

    if (!found.length) {
      gallery.innerHTML = '<div class="season-gallery-empty">Season recap pictures coming soon</div>';
      return;
    }

    const hint = document.createElement('p');
    hint.className = 'gallery-hint';
    hint.textContent = 'Click to enlarge';
    gallery.appendChild(hint);

    const grid = document.createElement('div');
    grid.className = 'gallery-tiles';
    found.forEach((url, idx) => {
      const tile = document.createElement('button');
      tile.className = 'gallery-tile';
      tile.setAttribute('aria-label', `Open photo ${idx + 1}`);
      tile.innerHTML = `<img src="${url}" alt="Season recap photo ${idx + 1}" loading="lazy">`;
      tile.addEventListener('click', () => open(found, idx));
      grid.appendChild(tile);
    });
    gallery.appendChild(grid);
  });
})();

// Add header background opacity on scroll
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});
