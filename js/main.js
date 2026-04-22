// Auth Password Configuration
window.AUTH_CONFIG = {
    'newzswimming': 'https://script.google.com/macros/s/AKfycby7rfCZWkaQUn45iZLegI2h5BJyDa6oUdFMgeaMGaD-r-FDT8VFpq-9LEEwuEfY-pZ_aQ/exec',
    'admin123': 'dashboard.html'
};

window.checkAuthPassword = function(pwd) {
    if (window.AUTH_CONFIG[pwd]) {
        return window.AUTH_CONFIG[pwd];
    }
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const header = document.getElementById('header');
    const counters = document.querySelectorAll('.achievement-number');

    // Sticky Header
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Count Up Animation
    const speed = 200; // The lower the slower

    const runCounter = (counter) => {
        const target = +counter.getAttribute('data-target');
        let count = 0;
        const inc = target / speed;

        const updateCount = () => {
            if (count < target) {
                count += inc;
                counter.innerText = Math.ceil(count);
                if (count > target) counter.innerText = target;
                setTimeout(updateCount, 20); // rate of refresh
            } else {
                counter.innerText = target;
                // Add suffix if needed, e.g. "+"
                if (target > 10) counter.innerText += "+";
            }
        };
        updateCount();
    };

    // Intersection Observer for Counters
    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                runCounter(counter);
                observer.unobserve(counter); // Only run once
            }
        });
    }, observerOptions);

    counters.forEach(counter => {
        observer.observe(counter);
    });

    // Lightbox Functionality
    const galleryImages = document.querySelectorAll('.gallery-grid img');

    // Create lightbox elements
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.className = 'lightbox';
    const lightboxImg = document.createElement('img');
    const lightboxClose = document.createElement('div');
    lightboxClose.innerHTML = '&times;';
    lightboxClose.className = 'lightbox-close';

    lightbox.appendChild(lightboxImg);
    lightbox.appendChild(lightboxClose);
    document.body.appendChild(lightbox);

    galleryImages.forEach(image => {
        image.addEventListener('click', e => {
            lightbox.classList.add('active');
            lightboxImg.src = image.src;
        });
    });

    const closeLightbox = () => {
        lightbox.classList.remove('active');
    };

    lightbox.addEventListener('click', e => {
        if (e.target !== lightboxImg) {
            closeLightbox();
        }
    });

    console.log("Club Renang Scripts Loaded");
});
