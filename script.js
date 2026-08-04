gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

// Shared device check — the custom cursor, magnetic hover, and tilt
// effects are desktop-pointer interactions and should never attach on
// phones, both because touch has no "hover" and to avoid wasted
// event listeners / GPU layers on lower-power devices.
const isDesktop = window.innerWidth > 768;

// SMOOTH SCROLL (Lenis) — fixes mouse-wheel jitter and gives the whole
// site (including the frame sequence) inertia-based easing instead of
// raw native scroll jumps.
const lenis = new Lenis({
    duration: 1.8,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.8,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// 147-FRAME IMAGE SEQUENCE SCROLL BACKGROUND
(function () {
    const canvas = document.getElementById('canvas-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const frameCount = 147;
    const imgFolder = './ezgif-4f1872df9712c541-jpg/';
    const currentFrame = index =>
        `${imgFolder}ezgif-frame-${(index + 1).toString().padStart(3, '0')}.jpg`;

    // Phones jank on this animation for two reasons: (1) drawing a plain
    // <img> to canvas forces the browser to synchronously decode that JPEG
    // on the main thread the first time it's painted, which stalls the
    // scroll handler; (2) pushing a full-DPR canvas's worth of pixels every
    // frame is expensive fill-rate work on weaker mobile GPUs. Both are
    // fixed below — decode is moved off-thread via createImageBitmap, and
    // the backing canvas resolution is reduced on phones (CSS still shows
    // it full-bleed, the browser just upscales a smaller buffer).
    const canDecodeOffThread = typeof createImageBitmap === 'function';
    const RES_SCALE = isDesktop ? 1 : 0.75;

    const images = [];   // <img> elements — network cache + fallback draw source
    const bitmaps = [];  // pre-decoded ImageBitmap per frame, once ready
    const imageSeq = { frame: 0 };
    let activeIndex = -1;   // index of the frame currently painted
    let activeSource = null; // the actual drawable (bitmap or img) in use
    let loadedCount = 0;

    // Loading overlay
    const loader = document.getElementById('loading-overlay');
    const loadStartTime = Date.now();
    const MIN_LOADER_TIME = 2600; // ms — loader stays up at least this long,
                                   // even if frames finish loading instantly

    function hideLoader() {
        if (!loader || loader.classList.contains('hidden')) return;
        const elapsed = Date.now() - loadStartTime;
        const remaining = Math.max(0, MIN_LOADER_TIME - elapsed);
        setTimeout(() => {
            loader.classList.add('hidden');
            window.dispatchEvent(new Event('loaderComplete'));
        }, remaining);
    }

    function resizeCanvas() {
        canvas.width = Math.round(window.innerWidth * RES_SCALE);
        canvas.height = Math.round(window.innerHeight * RES_SCALE);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = isDesktop ? 'high' : 'low';
        geom = activeSource ? computeGeometry() : null;
        render(true);
    }

    // Cache of draw geometry — only depends on canvas size + the current
    // image's aspect ratio, both of which only change on resize or when
    // activeSource changes. Recalculating this on every scroll frame was
    // wasted work since it's almost always the same value.
    let geom = null;

    function computeGeometry() {
        if (!activeSource) return null;
        const w = canvas.width;
        const h = canvas.height;
        const naturalW = activeSource.naturalWidth || activeSource.width;
        const naturalH = activeSource.naturalHeight || activeSource.height;
        const imgRatio = naturalW / naturalH;
        const canvasRatio = w / h;

        let renderWidth, renderHeight, offsetX, offsetY;

        if (canvasRatio > imgRatio) {
            renderWidth = w;
            renderHeight = w / imgRatio;
            offsetX = 0;
            offsetY = (h - renderHeight) / 2;
        } else {
            renderWidth = h * imgRatio;
            renderHeight = h;
            offsetX = (w - renderWidth) / 2;
            offsetY = 0;
        }

        return { w, h, renderWidth, renderHeight, offsetX, offsetY };
    }

    function render(force) {
        const idx = Math.round(imageSeq.frame);
        // Skip repaint entirely if the target frame hasn't actually
        // changed — ScrollTrigger's onUpdate fires on every scroll tick,
        // but the rounded frame index is often unchanged between ticks.
        if (!force && idx === activeIndex) return;

        const source = bitmaps[idx] || images[idx];
        const ready = source && (bitmaps[idx] || (source.complete && source.naturalWidth !== 0));
        if (!ready) return;

        if (idx !== activeIndex || source !== activeSource) {
            activeIndex = idx;
            activeSource = source;
            geom = computeGeometry();
        }

        if (!activeSource || !geom) return;

        ctx.clearRect(0, 0, geom.w, geom.h);
        ctx.drawImage(activeSource, geom.offsetX, geom.offsetY, geom.renderWidth, geom.renderHeight);
    }

    // Preload all images
    for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.decoding = 'async';
        img.src = currentFrame(i);
        img.onload = () => {
            loadedCount++;
            // Update loader progress
            if (loader) {
                const pct = Math.round((loadedCount / frameCount) * 100);
                const bar = loader.querySelector('.loader-bar-fill');
                const txt = loader.querySelector('.loader-pct');
                if (bar) bar.style.width = pct + '%';
                if (txt) txt.textContent = pct + '%';
            }
            // Show first frame immediately
            if (i === 0 || (activeIndex === -1 && img.complete)) {
                render(true);
                hideLoader();
            } else if (Math.round(imageSeq.frame) === i) {
                render(true);
            }

            // Decode off the main thread so the eventual canvas draw during
            // scroll is a cheap blit instead of a jank-causing JPEG decode.
            if (canDecodeOffThread) {
                createImageBitmap(img).then(bmp => {
                    bitmaps[i] = bmp;
                    if (Math.round(imageSeq.frame) === i) render(true);
                }).catch(() => { /* fall back to drawing the <img> directly */ });
            }
        };
        images.push(img);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Fallback: force-dismiss loader after 5s even if images don't load
    setTimeout(() => {
        if (loader && !loader.classList.contains('hidden')) {
            loader.classList.add('hidden');
            window.dispatchEvent(new Event('loaderComplete'));
        }
    }, 5000);

    // Fade canvas IN as About section enters — page1 keeps its original bg
    gsap.to(canvas, {
        opacity: 1,
        ease: "none",
        scrollTrigger: {
            trigger: "#page2",
            start: "top 80%",
            end: "top 20%",
            scrub: 0.8
        }
    });

    // Frame sequence — starts when About enters, completes at bottom of Contact
    // scrub:2.2 = slower catch-up lag behind scroll position, for a
    // heavier, more drifting glide rather than instant 1:1 tracking
    gsap.to(imageSeq, {
        frame: frameCount - 1,
        ease: "none",
        scrollTrigger: {
            trigger: "#page2",
            start: "top bottom",
            endTrigger: "#page4",
            end: "bottom bottom",
            scrub: 2.2,
            onUpdate: render
        }
    });

    // Fade canvas OUT after Contact section scrolls away
    gsap.to(canvas, {
        opacity: 0,
        ease: "none",
        scrollTrigger: {
            trigger: "#page4",
            start: "bottom 70%",
            end: "bottom top",
            scrub: 0.8
        }
    });
})();

// CURSOR — desktop only; there's no mouse position on touch devices,
// and without this gate the circle just sits stuck in a corner on phones.
const cursor = document.querySelector("#cursor");

if (isDesktop) {
    window.addEventListener("mousemove", (e) => {
        gsap.to(cursor, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.15,
            ease: "power3.out"
        });
    });

    document.querySelectorAll("a, button, .work-card, .about-card").forEach((elem) => {
        elem.addEventListener("mouseenter", () => {
            gsap.to("#cursor", {
                scale: 1.4,
                backgroundColor: "rgba(138,43,226,0.15)",
                duration: 0.3
            });
        });

        elem.addEventListener("mouseleave", () => {
            gsap.to("#cursor", {
                scale: 1,
                backgroundColor: "transparent",
                duration: 0.3
            });
        });
    });
}

// MAGNETIC BUTTONS — element subtly pulls toward the cursor as it
// approaches, then eases back to rest on mouseleave.
function applyMagnetic(el, strength = 0.4, liftScale = 1.06) {
    // GSAP owns `transform` on this element while it's active, so any
    // CSS `:hover { transform: ... }` on it gets overridden — fold the
    // lift/scale into the animation itself instead.
    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    const scaleTo = gsap.quickTo(el, "scale", { duration: 0.4, ease: "power3.out" });

    el.addEventListener("mouseenter", () => scaleTo(liftScale));

    el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        xTo(relX * strength);
        yTo(relY * strength);
    });

    el.addEventListener("mouseleave", () => {
        xTo(0);
        yTo(0);
        scaleTo(1);
    });
}

if (isDesktop) {
    document.querySelectorAll(".cta-btn, .contact-form button, #nav-links a, #social-sidebar a")
        .forEach((el) => applyMagnetic(el, el.classList.contains("cta-btn") || el.tagName === "BUTTON" ? 0.35 : 0.5));
}

// STAR CANVAS
(function () {
    const canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createStars(count) {
        stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.4 + 0.2,
                alpha: Math.random() * 0.7 + 0.1,
                speed: Math.random() * 0.4 + 0.05,
                flicker: Math.random() * Math.PI * 2
            });
        }
    }

    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            s.flicker += s.speed * 0.02;
            const a = s.alpha * (0.6 + 0.4 * Math.sin(s.flicker));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.fill();
        });
        requestAnimationFrame(drawStars);
    }

    resize();
    createStars(180);
    requestAnimationFrame(drawStars);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resize();
            createStars(180);
        }, 150);
    });
})();

// MOUSE TILT FOR HERO TEXT
if (isDesktop) {
    document.addEventListener("mousemove", (e) => {
        gsap.to(".hello-text", {
            rotationY: (e.clientX / window.innerWidth - 0.5) * 20,
            rotationX: -(e.clientY / window.innerHeight - 0.5) * 20,
            transformPerspective: 1200,
            transformOrigin: "center",
            duration: 0.8,
            ease: "power3.out"
        });
    });
}

// ENTRANCE ANIMATION — held until the loader has actually finished, so the
// nav is guaranteed to be revealed after loading rather than depending on
// timing luck with the loader's minimum display time.
function playNavEntrance() {
    if (playNavEntrance.done) return;
    playNavEntrance.done = true;

    gsap.set("#nav", { opacity: 1 });

    gsap.timeline()
        .from("#nav h1", {
            y: 30,
            opacity: 0,
            duration: 0.6,
            ease: "back.out(1.7)"
        })
        .from("#nav-links a", {
            y: 30,
            opacity: 0,
            duration: 0.6,
            stagger: 0.12,
            ease: "back.out(1.7)",
            clearProps: "all"
        }, "-=0.3");
}

window.addEventListener('loaderComplete', playNavEntrance, { once: true });
// Safety net in case the loading overlay is absent or the event never fires
setTimeout(playNavEntrance, 5200);

const sidebar = document.querySelector("#social-sidebar");
const glow = document.querySelector("#sidebar-glow");

if (sidebar && glow) {
    sidebar.addEventListener("mouseenter", () => {
        gsap.to(glow, { opacity: 1, duration: 0.3 });
    });

    sidebar.addEventListener("mousemove", (e) => {
        glow.style.left = (e.clientX - 40) + "px";
        glow.style.top = (e.clientY - 40) + "px";
    });

    sidebar.addEventListener("mouseleave", () => {
        gsap.to(glow, { opacity: 0, duration: 0.3 });
    });
}

// MOBILE MENU
const menuBtn = document.getElementById("menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const closeBtn = document.getElementById("mobile-close");

function openMenu() {
    mobileMenu.style.display = "flex";
    requestAnimationFrame(() => mobileMenu.classList.add("open"));
}

function closeMenu() {
    mobileMenu.classList.remove("open");
    mobileMenu.addEventListener("transitionend", () => {
        if (!mobileMenu.classList.contains("open")) {
            mobileMenu.style.display = "none";
        }
    }, { once: true });
}

if (menuBtn && mobileMenu && closeBtn) {
    menuBtn.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);

    mobileMenu.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", closeMenu);
    });
}

// ABOUT SECTION ANIMATION
gsap.from(".about-header h2, .about-line", {
    scrollTrigger: {
        trigger: "#about",
        start: "top 95%"
    },
    y: 40,
    opacity: 0,
    duration: 0.8,
    stagger: 0.2,
    ease: "power2.out"
});

gsap.from(".about-card", {
    scrollTrigger: {
        trigger: ".about-grid",
        start: "top 95%"
    },
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.2,
    ease: "power2.out"
});

// ABOUT CARD ANIMATION
if (isDesktop) {
    document.querySelectorAll(".about-card").forEach((card) => {
        card.addEventListener("mousemove", (e) => {
            let rect = card.getBoundingClientRect();
            let x = e.clientX - rect.left - rect.width / 2;
            let y = e.clientY - rect.top - rect.height / 2;

            gsap.to(card, {
                rotationY: x / 8,
                rotationX: -y / 8,
                transformPerspective: 1000,
                transformOrigin: "center",
                scale: 1.03,
                z: 20,
                duration: 0.5,
                ease: "power2.out"
            });
        });

        card.addEventListener("mouseleave", () => {
            gsap.to(card, {
                rotationY: 0,
                rotationX: 0,
                scale: 1,
                z: 0,
                duration: 1,
                ease: "elastic.out(1,0.3)"
            });
        });
    });
}

// WORK CARD 3D TILT
if (isDesktop) {
    document.querySelectorAll(".work-card").forEach((card) => {
        let rotateX = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power2.out" });
        let rotateY = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power2.out" });
        let scale = gsap.quickTo(card, "scale", { duration: 0.5, ease: "power2.out" });

        card.addEventListener("mousemove", (e) => {
            let rect = card.getBoundingClientRect();
            let x = e.clientX - rect.left - rect.width / 2;
            let y = e.clientY - rect.top - rect.height / 2;

            rotateY(x / 5);
            rotateX(-y / 5);
            scale(1.03);
        });

        card.addEventListener("mouseleave", () => {
            rotateX(0);
            rotateY(0);
            scale(1);
        });
    });
}

document.querySelectorAll(".about-card,.work-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
        let rect = card.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        card.style.setProperty("--x", `${x}px`);
        card.style.setProperty("--y", `${y}px`);
    });
});

// SCROLL BAR PROGRESS — driven by Lenis's own scroll event instead of a
// separate window.onscroll listener, so we're not doing two independent
// scroll-triggered layout reads every frame.
const progressBar = document.getElementById("progress-bar");
lenis.on('scroll', ({ scroll, limit }) => {
    if (progressBar) {
        const progress = limit > 0 ? (scroll / limit) * 100 : 0;
        progressBar.style.width = progress + "%";
    }
});

// Hide cursor on form focus (desktop only — on mobile the cursor is
// already hidden entirely via CSS, and this would otherwise force it
// back to display:block on blur, fighting that media query).
if (isDesktop) {
    document.querySelectorAll("input, textarea").forEach((field) => {
        field.addEventListener("focus", () => {
            if (cursor) cursor.style.display = "none";
        });
        field.addEventListener("blur", () => {
            if (cursor) cursor.style.display = "block";
        });
    });
}

// CONTACT FORM
const contactForm = document.querySelector(".contact-form");
if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = contactForm.querySelector("button");
        const name = contactForm.querySelector("input[type='text']").value.trim();
        const email = contactForm.querySelector("input[type='email']").value.trim();
        const message = contactForm.querySelector("textarea").value.trim();

        if (!name || !email || !message) {
            showToast("Please fill in all fields.", "error");
            return;
        }

        btn.disabled = true;
        btn.innerHTML = `Sending... <i class="ri-loader-4-line"></i>`;

        try {
            const res = await fetch("https://formspree.io/f/xjgzodow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, message }),
            });

            if (res.ok) {
                showToast("Message sent! I'll get back to you soon.", "success");
                contactForm.reset();
            } else {
                showToast("Something went wrong. Try again.", "error");
            }
        } catch (err) {
            showToast("Network error. Please try again.", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `Send Message <i class="ri-send-plane-line"></i>`;
        }
    });
}

function showToast(msg, type) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("toast-visible"), 10);
    setTimeout(() => {
        toast.classList.remove("toast-visible");
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}