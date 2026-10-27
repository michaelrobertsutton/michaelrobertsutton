/**
 * Michael Sutton - Editorial Portfolio
 * Vanilla JavaScript
 *
 * Theme is set by an inline script in <head> (before CSS) so it never flashes.
 */

// ---------- Motion ----------
// Apple-style springs, parameterised by damping ratio + response (seconds), solved
// analytically so dropped frames or a backgrounded tab can't destabilise them.
// Values are px (or any unit); velocities are units per second.
var Motion = (function () {
  "use strict";

  var reducedQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function prefersReducedMotion() {
    return !!(reducedQuery && reducedQuery.matches);
  }

  // Displacement x and velocity v at time t for a spring released at x0 with velocity v0.
  function solve(x0, v0, damping, response, t) {
    var w0 = (2 * Math.PI) / response;
    if (damping >= 1) {
      var b = v0 + w0 * x0;
      var e = Math.exp(-w0 * t);
      return { x: e * (x0 + b * t), v: e * (v0 - w0 * t * b) };
    }
    var wd = w0 * Math.sqrt(1 - damping * damping);
    var A = x0;
    var B = (v0 + damping * w0 * x0) / wd;
    var decay = Math.exp(-damping * w0 * t);
    var c = Math.cos(wd * t);
    var s = Math.sin(wd * t);
    return {
      x: decay * (A * c + B * s),
      v: decay * (-damping * w0 * (A * c + B * s) + wd * (-A * s + B * c))
    };
  }

  /**
   * spring({ from, to, velocity, damping, response, precision, onUpdate, onComplete })
   * Returns { value(), velocity(), retarget(to, velocity?), stop() }.
   * Retargeting starts from the live on-screen value and velocity, so every
   * animation can be interrupted and reversed without a jump.
   */
  function spring(opts) {
    var damping = opts.damping == null ? 1 : opts.damping;
    var response = opts.response || 0.4;
    var precision = opts.precision || 0.5;
    var to = opts.to;
    var x0 = opts.from - to;
    var v0 = opts.velocity || 0;
    var t0 = performance.now();
    var frame = 0;
    var finished = false;

    function sample(now) {
      var r = solve(x0, v0, damping, response, Math.max(0, (now - t0) / 1000));
      return { value: to + r.x, velocity: r.v, x: r.x };
    }

    function finish() {
      finished = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      opts.onUpdate(to);
      if (opts.onComplete) opts.onComplete();
    }

    function tick(now) {
      frame = 0;
      if (finished) return;
      var s = sample(now);
      if (Math.abs(s.x) < precision && Math.abs(s.velocity) < precision * 20) {
        finish();
        return;
      }
      opts.onUpdate(s.value);
      frame = requestAnimationFrame(tick);
    }

    var handle = {
      value: function () { return finished ? to : sample(performance.now()).value; },
      velocity: function () { return finished ? 0 : sample(performance.now()).velocity; },
      retarget: function (newTo, newVelocity) {
        var now = performance.now();
        var s = finished ? { value: to, velocity: 0 } : sample(now);
        to = newTo;
        x0 = s.value - newTo;
        v0 = newVelocity == null ? s.velocity : newVelocity;
        t0 = now;
        if (finished) {
          finished = false;
          frame = requestAnimationFrame(tick);
        }
      },
      stop: function () {
        finished = true;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    if (prefersReducedMotion()) {
      // Jump to the target, but after the caller has stored the handle.
      Promise.resolve().then(function () { if (!finished) finish(); });
    } else {
      frame = requestAnimationFrame(tick);
    }
    return handle;
  }

  // Where a flick would come to rest (Apple's projection, decelerationRate ~0.998).
  function project(velocity, decelerationRate) {
    var d = decelerationRate || 0.998;
    return ((velocity / 1000) * d) / (1 - d);
  }

  // Progressive resistance past a boundary.
  function rubberband(overshoot, dimension, constant) {
    var c = constant == null ? 0.55 : constant;
    return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  return {
    spring: spring,
    project: project,
    rubberband: rubberband,
    clamp: clamp,
    prefersReducedMotion: prefersReducedMotion
  };
})();

(function () {
  "use strict";

  var root = document.documentElement;
  var header = document.getElementById("site-header");
  var hero = document.getElementById("home");
  var backToTop = document.getElementById("back-to-top");
  var navToggle = document.getElementById("nav-toggle");
  var mobileMenu = document.getElementById("mobile-menu");
  var mobileMenuClose = document.getElementById("mobile-menu-close");
  var mobileNavLinks = document.querySelectorAll(".mobile-nav-link");
  var navLinks = document.querySelectorAll(".nav-link");
  var themeToggle = document.getElementById("theme-toggle");
  var themeColor = document.getElementById("theme-color");

  // Lets iOS Safari apply :active on touch, so press feedback lands on pointer-down.
  document.addEventListener("touchstart", function () {}, { passive: true });

  function scrollBehavior() {
    return Motion.prefersReducedMotion() ? "auto" : "smooth";
  }

  // ---------- Theme Toggle ----------
  if (themeToggle) {
    var themeTransitionTimer = 0;

    function updateThemeLabel(theme) {
      themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }

    updateThemeLabel(root.getAttribute("data-theme") || "dark");

    themeToggle.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") || "dark";
      var next = current === "dark" ? "light" : "dark";

      // Ease the brightness change; only for user toggles, never on first paint.
      if (!Motion.prefersReducedMotion()) {
        root.classList.add("theme-transition");
        clearTimeout(themeTransitionTimer);
        themeTransitionTimer = setTimeout(function () {
          root.classList.remove("theme-transition");
        }, 400);
      }

      root.setAttribute("data-theme", next);
      if (themeColor) themeColor.setAttribute("content", next === "dark" ? "#0A0F16" : "#FBFBF9");
      try { localStorage.setItem("theme", next); } catch (e) {}
      updateThemeLabel(next);
    });
  }

  // ---------- Navigation Sheet (native <dialog>, spring-driven, draggable) ----------
  if (mobileMenu && typeof mobileMenu.showModal === "function") {
    var panel = mobileMenu.querySelector(".sheet-panel");
    var scrim = mobileMenu.querySelector(".sheet-scrim");
    var handleEl = mobileMenu.querySelector("[data-sheet-drag]");
    var desktopQuery = window.matchMedia("(min-width: 1024px)");

    var sheetY = 0;          // 0 = fully open, sheetHeight = fully closed
    var sheetHeight = 1;
    var sheetSpring = null;
    var closing = false;
    var afterClose = null;
    var lockedScrollY = 0;

    var drag = null;         // active gesture state

    function renderSheet(y) {
      sheetY = y;
      panel.style.transform = "translate3d(0," + y + "px,0)";
      // Scrim tracks the sheet continuously; it's fully dim at rest and while over-dragged.
      scrim.style.opacity = String(Motion.clamp(1 - y / sheetHeight, 0, 1));
    }

    function lockScroll() {
      lockedScrollY = window.pageYOffset;
      root.classList.add("sheet-locked");
      document.body.style.top = -lockedScrollY + "px";
    }

    function unlockScroll() {
      root.classList.remove("sheet-locked");
      document.body.style.top = "";
      // Restore instantly; smooth-scroll here would visibly fly the page back.
      var previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, lockedScrollY);
      root.style.scrollBehavior = previous;
    }

    function animateSheet(to, velocity, damping, onComplete) {
      if (sheetSpring) sheetSpring.stop();
      sheetSpring = Motion.spring({
        from: sheetY,
        to: to,
        velocity: velocity || 0,
        damping: damping == null ? 1 : damping,
        response: 0.35,
        onUpdate: renderSheet,
        onComplete: function () {
          sheetSpring = null;
          if (onComplete) onComplete();
        }
      });
    }

    function finishClose() {
      closing = false;
      if (mobileMenu.open) mobileMenu.close();
    }

    function onDialogClosed() {
      // Runs for every close path, including a browser-forced Escape.
      if (sheetSpring) { sheetSpring.stop(); sheetSpring = null; }
      closing = false;
      drag = null;
      unlockScroll();
      if (navToggle) {
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus({ preventScroll: true });
      }
      var next = afterClose;
      afterClose = null;
      if (next) next();
    }

    function openMobileMenu() {
      if (desktopQuery.matches) return;
      if (mobileMenu.open) {
        // Re-open while closing: catch it and send it back up from where it is.
        closing = false;
        animateSheet(0, sheetSpring ? sheetSpring.velocity() : 0);
        return;
      }
      lockScroll();
      mobileMenu.showModal();
      sheetHeight = panel.offsetHeight || 1;
      renderSheet(sheetHeight);
      if (navToggle) navToggle.setAttribute("aria-expanded", "true");
      animateSheet(0, 0);
    }

    function closeMobileMenu(velocity, then) {
      if (!mobileMenu.open) {
        if (then) then();
        return;
      }
      if (then) afterClose = then;
      closing = true;
      sheetHeight = panel.offsetHeight || sheetHeight;
      animateSheet(sheetHeight, velocity || 0, 1, finishClose);
    }

    if (navToggle) navToggle.addEventListener("click", function () { openMobileMenu(); });
    if (mobileMenuClose) mobileMenuClose.addEventListener("click", function () { closeMobileMenu(); });
    scrim.addEventListener("click", function () { closeMobileMenu(); });

    // Escape: animate out along the same path instead of vanishing.
    mobileMenu.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeMobileMenu();
    });
    mobileMenu.addEventListener("close", onDialogClosed);

    // Nav links: close first, then scroll, so focus return and scrolling don't fight.
    mobileNavLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        var href = link.getAttribute("href");
        if (!href || href.charAt(0) !== "#") return;
        event.preventDefault();
        closeMobileMenu(0, function () {
          var target = document.getElementById(href.slice(1));
          if (history.pushState) history.pushState(null, "", href);
          if (target) target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        });
      });
    });

    // Crossing into the desktop layout while open: close instantly.
    desktopQuery.addEventListener("change", function (event) {
      if (event.matches && mobileMenu.open) {
        if (sheetSpring) sheetSpring.stop();
        mobileMenu.close();
      }
    });

    // ---- Drag: 1:1 tracking, rubber-band, momentum projection, velocity handoff ----
    var HYSTERESIS = 10;
    var MAX_VELOCITY = 4000;

    function velocityFromSamples(samples) {
      if (samples.length < 2) return 0;
      var first = samples[0];
      var last = samples[samples.length - 1];
      var dt = (last.t - first.t) / 1000;
      if (dt <= 0) return 0;
      return Motion.clamp((last.y - first.y) / dt, -MAX_VELOCITY, MAX_VELOCITY);
    }

    function positionFor(rawY) {
      // Past the open position, resist progressively instead of hard-stopping.
      return rawY < 0 ? -Motion.rubberband(-rawY, sheetHeight) : rawY;
    }

    handleEl.addEventListener("pointerdown", function (event) {
      if (!mobileMenu.open || !event.isPrimary || event.button !== 0) return;
      if (event.target.closest("a, button")) return;

      var caught = !!sheetSpring;
      if (sheetSpring) {
        // Grab it mid-flight: freeze at the live on-screen value.
        renderSheet(sheetSpring.value());
        sheetSpring.stop();
        sheetSpring = null;
      }
      closing = false;
      sheetHeight = panel.offsetHeight || sheetHeight;

      drag = {
        id: event.pointerId,
        startPointer: event.clientY,
        startSheet: sheetY,
        active: caught,       // a caught sheet tracks immediately; a resting one waits for intent
        samples: [{ t: event.timeStamp, y: event.clientY }]
      };
      if (caught) handleEl.setPointerCapture(event.pointerId);
    });

    handleEl.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      var dy = event.clientY - drag.startPointer;

      if (!drag.active) {
        if (Math.abs(dy) < HYSTERESIS) return;
        drag.active = true;
        // Re-base so the sheet doesn't jump by the hysteresis distance.
        drag.startPointer = event.clientY;
        dy = 0;
        handleEl.setPointerCapture(event.pointerId);
      }

      drag.samples.push({ t: event.timeStamp, y: event.clientY });
      while (drag.samples.length > 2 && event.timeStamp - drag.samples[0].t > 100) {
        drag.samples.shift();
      }
      renderSheet(positionFor(drag.startSheet + dy));
    });

    function endDrag(event, cancelled) {
      if (!drag || (event && event.pointerId !== drag.id)) return;
      var wasActive = drag.active;
      var velocity = cancelled ? 0 : velocityFromSamples(drag.samples);
      drag = null;
      if (!wasActive && !cancelled) {
        // A tap on the handle that never became a drag.
        if (sheetY !== 0) animateSheet(0, 0);
        return;
      }

      // Decide by where the gesture is going, not where it was let go.
      var projected = sheetY + Motion.clamp(Motion.project(velocity), -sheetHeight, sheetHeight);
      var dismiss = !cancelled && (velocity > 500 || (velocity > -300 && projected > sheetHeight * 0.5));

      if (dismiss) {
        closeMobileMenu(velocity);
      } else {
        animateSheet(0, velocity, velocity !== 0 ? 0.85 : 1);
      }
    }

    handleEl.addEventListener("pointerup", function (event) { endDrag(event, false); });
    handleEl.addEventListener("pointercancel", function (event) { endDrag(event, true); });
    handleEl.addEventListener("lostpointercapture", function (event) {
      if (drag && drag.active) endDrag(event, true);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && drag) endDrag(null, true);
    });
  } else if (mobileMenu && navToggle) {
    // No <dialog> support: fall back to a plain show/hide.
    navToggle.addEventListener("click", function () {
      mobileMenu.setAttribute("open", "");
      navToggle.setAttribute("aria-expanded", "true");
    });
    if (mobileMenuClose) {
      mobileMenuClose.addEventListener("click", function () {
        mobileMenu.removeAttribute("open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
      });
    }
  }

  // ---------- Work Case Details (spring height, interruptible) ----------
  document.querySelectorAll("details.work-detail").forEach(function (details) {
    var summary = details.querySelector("summary");
    var clip = details.querySelector(".work-detail-clip");
    if (!summary || !clip) return;

    var heightSpring = null;
    var wantOpen = details.open;
    var fullHeight = 1;

    function setProgress(p) {
      details.style.setProperty("--p", String(Motion.clamp(p, 0, 1.2)));
    }

    function renderHeight(h) {
      clip.style.height = Math.max(0, h) + "px";
      setProgress(h / fullHeight);
    }

    function settle() {
      heightSpring = null;
      clip.style.height = "";
      setProgress(details.open ? 1 : 0);
    }

    setProgress(details.open ? 1 : 0);

    summary.addEventListener("click", function (event) {
      if (Motion.prefersReducedMotion()) return; // native instant toggle
      event.preventDefault();

      var opening = heightSpring ? !wantOpen : !details.open;
      var from = heightSpring ? heightSpring.value() : (details.open ? clip.offsetHeight : 0);
      var velocity = heightSpring ? heightSpring.velocity() : 0;
      if (heightSpring) heightSpring.stop();
      wantOpen = opening;

      if (opening && !details.open) {
        clip.style.height = "0px";
        details.open = true; // render content so it can be measured
      }
      fullHeight = clip.scrollHeight || 1;
      renderHeight(from);

      heightSpring = Motion.spring({
        from: from,
        to: opening ? fullHeight : 0,
        velocity: velocity,
        damping: 1,
        response: 0.4,
        onUpdate: renderHeight,
        onComplete: function () {
          if (!wantOpen) details.open = false;
          settle();
        }
      });
    });

    // Opens we didn't start (hash link, find-in-page, history restore) snap open, no animation.
    details.addEventListener("toggle", function () {
      if (details.open === wantOpen) return;
      if (heightSpring) heightSpring.stop();
      wantOpen = details.open;
      settle();
    });
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

  // ---------- Header Scroll Edge + Back to Top ----------
  if (header) {
    var updateScrollUI = function () {
      if (root.classList.contains("sheet-locked")) return;
      var currentScroll = window.pageYOffset;

      header.classList.toggle("scrolled", currentScroll > 12);

      if (backToTop && hero) {
        var showBackToTop = currentScroll > hero.offsetHeight * 0.8;
        backToTop.classList.toggle("visible", showBackToTop);
        backToTop.inert = !showBackToTop;
        backToTop.setAttribute("aria-hidden", showBackToTop ? "false" : "true");
      }
    };

    window.addEventListener(
      "scroll",
      updateScrollUI,
      { passive: true }
    );

    updateScrollUI();
  }

  // ---------- Hash Deep Links (open the matching work case on load / hashchange) ----------
  function openWorkDetailFromHash() {
    var hash = window.location.hash.slice(1);
    if (!hash) return;
    var target = document.getElementById(hash);
    if (!target || !target.classList.contains("work-detail")) return;

    target.open = true; // the details controller snaps this open without animating

    var headerOffset = (header ? header.offsetHeight : 0) + 16;
    var targetTop = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: targetTop, behavior: scrollBehavior() });
  }

  window.addEventListener("hashchange", openWorkDetailFromHash);
  openWorkDetailFromHash();

  // ---------- Footer Year ----------
  var year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // ---------- Scroll Reveal ----------
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // ---------- Sticky Mobile CTA ----------
  // Visible only between the hero and Contact; both states are tracked so it
  // reappears after scrolling back out of Contact.
  var stickyCta = document.getElementById("sticky-cta");
  var contactSection = document.getElementById("contact");
  if (stickyCta && hero && "IntersectionObserver" in window) {
    var heroVisible = true;
    var contactVisible = false;

    var stickyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === contactSection) contactVisible = entry.isIntersecting;
      });
      var show = !heroVisible && !contactVisible;
      stickyCta.classList.toggle("is-visible", show);
      stickyCta.setAttribute("aria-hidden", show ? "false" : "true");
      stickyCta.inert = !show;
    }, { threshold: 0.1 });
    stickyObserver.observe(hero);
    if (contactSection) stickyObserver.observe(contactSection);
  }

})();
