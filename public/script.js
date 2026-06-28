document.addEventListener('DOMContentLoaded', () => {
    // --- Dynamic Year ---
    document.getElementById('year').textContent = new Date().getFullYear();

    // --- Custom Cursor Glow ---
    const cursorGlow = document.querySelector('.cursor-glow');
    if (cursorGlow && window.matchMedia("(min-width: 768px)").matches) {
        document.addEventListener('mousemove', (e) => {
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });
    }

    // --- Mobile Navigation Toggle ---
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navIcon = mobileToggle.querySelector('i');

    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        if (navLinks.classList.contains('active')) {
            navIcon.classList.remove('fa-bars');
            navIcon.classList.add('fa-times');
        } else {
            navIcon.classList.remove('fa-times');
            navIcon.classList.add('fa-bars');
        }
    });

    // Close mobile menu when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            navIcon.classList.remove('fa-times');
            navIcon.classList.add('fa-bars');
        });
    });

    // --- Navbar Scroll Effect & Active Link Highlighting ---
    const navbar = document.querySelector('.navbar');
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        // Navbar styling on scroll
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Active link highlighting
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href').includes(current)) {
                item.classList.add('active');
            }
        });
    });

    // --- Scroll Reveal Animation using IntersectionObserver ---
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // --- Contact Form Submission Prevent Default ---
    const contactForm = document.getElementById('contactForm');
    if(contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Basic animation or feedback for the user
            const btn = contactForm.querySelector('button');
            const originalContent = btn.innerHTML;
            
            btn.innerHTML = '<span>Sent Successfully!</span> <i class="fas fa-check"></i>';
            btn.style.background = 'linear-gradient(135deg, #00f0ff, #00ff88)';
            contactForm.reset();

            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.background = '';
            }, 3000);
        });
    }
});
