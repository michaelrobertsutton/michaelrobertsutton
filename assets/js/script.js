/**
 * Michael Sutton - Editorial Portfolio
 * Vanilla JavaScript
 */

// ---------- Theme Toggle ----------
(function() {
  var savedTheme = localStorage.getItem('theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

(function () {
  "use strict";

  var header = document.getElementById("site-header");
  var hero = document.getElementById("home");
  var backToTop = document.getElementById("back-to-top");
  var navToggle = document.getElementById("nav-toggle");
  var mobileMenu = document.getElementById("mobile-menu");
  var mobileMenuClose = document.getElementById("mobile-menu-close");
  var mobileNavLinks = document.querySelectorAll(".mobile-nav-link");
  var navLinks = document.querySelectorAll(".nav-link");
  var themeToggle = document.getElementById('theme-toggle');

  // ---------- Theme Toggle ----------
  if (themeToggle) {
    function updateThemeLabel(theme) {
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }

    updateThemeLabel(document.documentElement.getAttribute('data-theme') || 'dark');

    themeToggle.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeLabel(next);
    });
  }

  // ---------- Mobile Navigation (full-screen overlay) ----------
  function openMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    if (navToggle) navToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    if (mobileMenuClose) mobileMenuClose.focus();
  }

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.focus();
    }
    document.body.style.overflow = "";
  }

  if (navToggle) {
    navToggle.addEventListener("click", openMobileMenu);
  }

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener("click", closeMobileMenu);
  }

  mobileNavLinks.forEach(function (link) {
    link.addEventListener("click", closeMobileMenu);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && mobileMenu && mobileMenu.classList.contains("is-open")) {
      closeMobileMenu();
    }
  });

  // ---------- Active Section State ----------
  if (navLinks.length) {
    var bySection = new Map();

    navLinks.forEach(function (link) {
      var href = link.getAttribute("href");
      if (href && href.charAt(0) === "#") {
        bySection.set(href.slice(1), link);
      }
    });

    var sections = Array.from(bySection.keys())
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);
    var lastSection = sections.length ? sections[sections.length - 1] : null;

    var setActive = function (id) {
      navLinks.forEach(function (link) {
        var isActive = link.getAttribute("href") === "#" + id;
        link.classList.toggle("active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    if ("IntersectionObserver" in window && sections.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              setActive(entry.target.id);
            }
          });
        },
        {
          rootMargin: "-35% 0px -55% 0px",
          threshold: 0.05,
        }
      );

      sections.forEach(function (section) {
        observer.observe(section);
      });
    }

    // When scrolled to page bottom, ensure the final nav section is active.
    if (lastSection) {
      var setLastSectionAtPageEnd = function () {
        var scrollBottom = window.pageYOffset + window.innerHeight;
        var documentBottom = document.documentElement.scrollHeight;
        if (documentBottom - scrollBottom <= 2) {
          setActive(lastSection.id);
        }
      };

      window.addEventListener("scroll", setLastSectionAtPageEnd, { passive: true });
      setLastSectionAtPageEnd();
    }
  }

  // ---------- Header Shadow ----------
  if (header) {
    var updateScrollUI = function () {
      var currentScroll = window.pageYOffset;

      header.classList.toggle('scrolled', currentScroll > 12);

      if (backToTop && hero) {
        var showBackToTop = currentScroll > hero.offsetHeight * 0.8;
        backToTop.classList.toggle("visible", showBackToTop);
      }
    };

    window.addEventListener(
      "scroll",
      updateScrollUI,
      { passive: true }
    );

    updateScrollUI();
  }

  // ---------- Work entries — expand/collapse all together (desktop only) ----------
  var suppressGroupToggle = false;
  var workDetails = document.querySelectorAll('.work-detail');
  if (workDetails.length > 1) {
    workDetails.forEach(function (det) {
      det.addEventListener('toggle', function () {
        if (suppressGroupToggle) return;
        if (window.innerWidth < 768) return;
        var isOpen = det.open;
        workDetails.forEach(function (other) {
          if (other !== det) other.open = isOpen;
        });
      });
    });
  }

  // ---------- Hash Deep Links (open the matching work case on load / hashchange) ----------
  function openWorkDetailFromHash() {
    var hash = window.location.hash.slice(1);
    if (!hash) return;
    var target = document.getElementById(hash);
    if (!target || !target.classList.contains('work-detail')) return;

    if (!target.open) {
      suppressGroupToggle = true;
      target.open = true;
      // The 'toggle' event fires as a queued task, not synchronously —
      // clear the flag in a task scheduled after this one so it's still
      // set when that handler runs, then reverts to normal afterward.
      setTimeout(function () {
        suppressGroupToggle = false;
      }, 0);
    }

    var headerOffset = (header ? header.offsetHeight : 0) + 16;
    var targetTop = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  }

  window.addEventListener('hashchange', openWorkDetailFromHash);
  openWorkDetailFromHash();

  // ---------- Footer Year ----------
  var year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // ---------- Scroll Progress Bar ----------
  var progressBar = document.getElementById('scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', function () {
      var scrollTop = window.pageYOffset;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
    }, { passive: true });
  }

  // ---------- Scroll Reveal ----------
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Pulse the ghost bg number if this is a work entry
          if (entry.target.classList.contains('work-entry')) {
            var bgNum = entry.target.querySelector('.work-bg-num');
            if (bgNum) {
              setTimeout(function() { bgNum.classList.add('pulse'); }, 400);
            }
          }
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  // ---------- Sticky Mobile CTA ----------
  var stickyCta = document.getElementById('sticky-cta');
  var contactSection = document.getElementById('contact');
  if (stickyCta && hero) {
    var stickyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === hero) {
          var show = !entry.isIntersecting;
          stickyCta.classList.toggle('is-visible', show);
          stickyCta.setAttribute('aria-hidden', show ? 'false' : 'true');
        }
        if (entry.target === contactSection && entry.isIntersecting) {
          stickyCta.classList.remove('is-visible');
          stickyCta.setAttribute('aria-hidden', 'true');
        }
      });
    }, { threshold: 0.1 });
    stickyObserver.observe(hero);
    if (contactSection) stickyObserver.observe(contactSection);
  }

})();

