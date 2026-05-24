gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
// CURSOR
const cursor = document.querySelector("#cursor");

window.addEventListener("mousemove",(e)=>{

    gsap.to(cursor,{
        x:e.clientX,
        y:e.clientY,
        duration:0.15,
        ease:"power3.out"
    });

});
document.querySelectorAll("a, button, .work-card, .about-card").forEach((elem)=>{

    elem.addEventListener("mouseenter",()=>{

        gsap.to("#cursor",{
            scale:1.4,
            backgroundColor:"rgba(138,43,226,0.15)",
            duration:0.3
        });

    });

    elem.addEventListener("mouseleave",()=>{

        gsap.to("#cursor",{
            scale:1,
            backgroundColor:"transparent",
            duration:0.3
        });

    });

});

// STAR CANVAS
(function() {
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

    function drawStars(t) {
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
    window.addEventListener('resize', () => { resize(); createStars(180); });
})();

// LETTER ANIMATION (removed - using CSS animations now)
if (window.innerWidth > 768) {
    document.addEventListener("mousemove", (e) => {
        gsap.to(".hello-text", {
            rotationY: (e.clientX / window.innerWidth - 0.5) * 25,
            rotationX: -(e.clientY / window.innerHeight - 0.5) * 25,
            transformPerspective: 1200,
            transformOrigin: "center",
            duration: 0.8,
            ease: "power3.out"
        });
    });
} else {
    gsap.to(".hello-text", {
        rotationY: 8,
        rotationX: -8,
        y: -10,
        repeat: -1,
        yoyo: true,
        duration: 2,
        ease: "sine.inOut"
    });
}
// ENTRANCE ANIMATION
const tl = gsap.timeline();

tl.from("#nav h1", {
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


const sidebar = document.querySelector("#social-sidebar");
const glow = document.querySelector("#sidebar-glow");

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

menuBtn.addEventListener("click", openMenu);
closeBtn.addEventListener("click", closeMenu);

mobileMenu.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", closeMenu);
});
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

gsap.from(".skill-tag", {
    scrollTrigger: {
        trigger: ".skills-grid",
        start: "top 100%"
    },
    y: 20,
    opacity: 0,
    duration: 0.5,
    stagger: 0.1,
    ease: "back.out(1.7)"
});
//ABOUT CARD ANIMATION
document.querySelectorAll(".about-card").forEach((card) => {

    card.addEventListener("mousemove", (e) => {

        let rect = card.getBoundingClientRect();

        let x = e.clientX - rect.left - rect.width / 2;
        let y = e.clientY - rect.top - rect.height / 2;

        let rotateValue = window.innerWidth > 768 ? 8 : 18;

        gsap.to(card, {
            rotationY: x / rotateValue,
            rotationX: -y / rotateValue,
            transformPerspective: 1000,
            transformOrigin: "center",
            scale: 1.03,
            z: 20,
            duration: 0.5,
            ease: "power2.out"
        })
    })

    card.addEventListener("mouseleave", () => {

        gsap.to(card, {
            rotationY: 0,
            rotationX: 0,
            scale: 1,
            z: 0,
            duration: 1,
            ease: "elastic.out(1,0.3)"
        })

    })

})


// WORK CARD 3D TILT
document.querySelectorAll(".work-card").forEach((card) => {

    let rotateX = gsap.quickTo(card, "rotationX", {
        duration: 0.5,
        ease: "power2.out"
    });

    let rotateY = gsap.quickTo(card, "rotationY", {
        duration: 0.5,
        ease: "power2.out"
    });

    let scale = gsap.quickTo(card, "scale", {
        duration: 0.5,
        ease: "power2.out"
    });

    card.addEventListener("mousemove", (e) => {

        let rect = card.getBoundingClientRect();

        let x = e.clientX - rect.left - rect.width / 2;
        let y = e.clientY - rect.top - rect.height / 2;

        let rotateValue = window.innerWidth > 768 ? 5 : 15;

        rotateY(x / rotateValue);
        rotateX(-y / rotateValue);
        scale(1.03);
    });

    card.addEventListener("mouseleave", () => {

        rotateX(0);
        rotateY(0);
        scale(1);

    });

});
document.querySelectorAll(".about-card,.work-card").forEach((card)=>{

    card.addEventListener("mousemove",(e)=>{

        let rect = card.getBoundingClientRect();

        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        card.style.setProperty("--x",`${x}px`);
        card.style.setProperty("--y",`${y}px`);

    });

});
//scroll bar animations
window.onscroll = () => {

    let totalHeight =
        document.documentElement.scrollHeight -
        window.innerHeight;

    let progress =
        (window.pageYOffset / totalHeight) * 100;

    document.getElementById("progress-bar").style.width =
        progress + "%";

};
// Hide cursor on form focus (mobile fix)
document.querySelectorAll("input, textarea").forEach((field) => {
  field.addEventListener("focus", () => {
    cursor.style.display = "none";
  });
  field.addEventListener("blur", () => {
    cursor.style.display = "block";
  });
});

// CONTACT FORM - FORMSPREE
const contactForm = document.querySelector(".contact-form");

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