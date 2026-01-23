document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const header = document.getElementById('header');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const counters = document.querySelectorAll('.achievement-number');

    // Sticky Header
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile Menu Toggle
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }));

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

    // Coach Profile Modal Logic
    const coachCards = document.querySelectorAll('.team-card');
    const coachModal = document.getElementById('coach-modal');
    const modalImg = document.getElementById('modal-img');
    const modalName = document.getElementById('modal-name');
    const modalRole = document.getElementById('modal-role');
    const modalDesc = document.getElementById('modal-desc');
    const closeModal = document.querySelector('.close-modal');

    // Check if modal elements exist to avoid errors
    if (coachModal && coachCards.length > 0) {
        coachCards.forEach(card => {
            card.addEventListener('click', () => {
                // Populate Modal Data
                const img = card.querySelector('img').src;
                const name = card.getAttribute('data-name');
                const role = card.getAttribute('data-role');
                const desc = card.getAttribute('data-desc');

                modalImg.src = img;
                modalName.innerText = name;
                modalRole.innerText = role;
                modalDesc.innerText = desc || "Pelatih profesional yang berdedikasi tinggi.";

                // Show Modal
                coachModal.classList.add('active');
            });
        });

        // Close Modal Logic
        closeModal.addEventListener('click', () => {
            coachModal.classList.remove('active');
        });

        window.addEventListener('click', (e) => {
            if (e.target == coachModal) {
                coachModal.classList.remove('active');
            }
        });
    }

    console.log("Club Renang Scripts Loaded");
});
