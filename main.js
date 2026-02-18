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
    const toggleMenu = () => {
        const isActive = hamburger.classList.contains('active');
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        hamburger.setAttribute('aria-expanded', !isActive);
    };

    hamburger.addEventListener('click', toggleMenu);

    // Close mobile menu when clicking any link inside
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
            hamburger.setAttribute('aria-expanded', 'false');
        });
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

    // Absensi Modal Logic
    const btnAbsensi = document.getElementById('btn-absensi');
    const absensiModal = document.getElementById('absensi-modal');
    const absensiPasswordInput = document.getElementById('absensi-password');
    const submitAbsensi = document.getElementById('submit-absensi');
    const absensiError = document.getElementById('absensi-error');
    const closeAbsensi = document.getElementById('close-absensi');
    const absensiFormSection = document.getElementById('absensi-form-section');
    const closeAbsensiForm = document.getElementById('close-absensi-form');

    if (btnAbsensi && absensiModal) {
        btnAbsensi.addEventListener('click', (e) => {
            e.preventDefault();
            absensiModal.classList.add('active');
            absensiPasswordInput.value = '';
            absensiError.style.display = 'none';
            absensiPasswordInput.focus();
        });

        closeAbsensi.addEventListener('click', () => {
            absensiModal.classList.remove('active');
        });

        const checkPassword = () => {
            const password = absensiPasswordInput.value;
            if (password === 'newzswimming') {
                // Hide password modal and show embedded form section
                absensiModal.classList.remove('active');
                
                // Add loading state to form container
                const formContainer = document.querySelector('.absensi-form-container');
                if (formContainer) {
                    formContainer.classList.add('loading');
                }
                
                // Show form section with animation
                if (absensiFormSection) {
                    absensiFormSection.style.display = 'block';
                    // Scroll to the form section
                    absensiFormSection.scrollIntoView({ behavior: 'smooth' });
                    
                    // Hide main content safely
                    const mainContent = document.querySelector('main');
                    const headerContent = document.querySelector('header');
                    const footerContent = document.querySelector('footer');
                    
                    if (mainContent) mainContent.style.display = 'none';
                    if (headerContent) headerContent.style.display = 'none';
                    if (footerContent) footerContent.style.display = 'none';
                    
                    // Set focus to close button for accessibility
                    setTimeout(() => {
                        const closeBtn = document.getElementById('close-absensi-form');
                        if (closeBtn) {
                            closeBtn.focus();
                        }
                        
                        // Remove loading state after iframe loads
                        if (formContainer) {
                            // Add iframe load event listener
                            const iframe = formContainer.querySelector('iframe');
                            if (iframe) {
                                iframe.addEventListener('load', () => {
                                    formContainer.classList.remove('loading');
                                });
                                
                                iframe.addEventListener('error', () => {
                                    formContainer.classList.remove('loading');
                                    // Show error message if iframe fails to load
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'iframe-error';
                                    errorDiv.innerHTML = `
                                        <div style="text-align: center; padding: 2rem; color: var(--blue-3);">
                                            <h3>Terjadi Kesalahan</h3>
                                            <p>Gagal memuat formulir. Silakan coba lagi atau hubungi admin.</p>
                                            <button class="btn btn-primary" onclick="window.location.reload()">Muat Ulang</button>
                                        </div>
                                    `;
                                    formContainer.appendChild(errorDiv);
                                });
                                
                                // Fallback: remove loading state after timeout
                                setTimeout(() => {
                                    formContainer.classList.remove('loading');
                                }, 5000);
                            } else {
                                // Remove loading state if no iframe found
                                setTimeout(() => {
                                    formContainer.classList.remove('loading');
                                }, 2000);
                            }
                        }
                    }, 300);
                }
            } else {
                absensiError.style.display = 'block';
                // Shake effect is handled by CSS animation
                absensiPasswordInput.classList.remove('shake');
                void absensiPasswordInput.offsetWidth; // trigger reflow
                absensiPasswordInput.classList.add('shake');
                // Focus back to password input
                absensiPasswordInput.focus();
            }
        };

        submitAbsensi.addEventListener('click', checkPassword);

        absensiPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });

        // Close when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target == absensiModal) {
                absensiModal.classList.remove('active');
            }
        });
    }

    // Close embedded form and return to main site
    if (closeAbsensiForm) {
        closeAbsensiForm.addEventListener('click', () => {
            if (absensiFormSection) {
                absensiFormSection.style.display = 'none';
                
                // Show main content safely
                const mainContent = document.querySelector('main');
                const headerContent = document.querySelector('header');
                const footerContent = document.querySelector('footer');
                
                if (mainContent) mainContent.style.display = 'block';
                if (headerContent) headerContent.style.display = 'block';
                if (footerContent) footerContent.style.display = 'block';
                
                // Scroll to top and focus back to absensi button
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                setTimeout(() => {
                    if (btnAbsensi) {
                        btnAbsensi.focus();
                    }
                }, 500);
            }
        });
        
        // Add keyboard support for closing form
        closeAbsensiForm.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAbsensiForm.click();
            }
        });
        
        // Add global keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && absensiFormSection && absensiFormSection.style.display === 'block') {
                closeAbsensiForm.click();
            }
        });
    }

    console.log("Club Renang Scripts Loaded");
});
