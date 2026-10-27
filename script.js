(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // Starfield: three parallax layers, low-resolution canvas and a paused hidden-tab loop.
  const canvas = document.querySelector("#starfield");
  const ctx = canvas.getContext("2d", { alpha: true });
  const stars = [];
  const starCounts = () => {
    const area = innerWidth * innerHeight;
    const factor = innerWidth < 600 ? 0.000075 : 0.00016;
    const total = clamp(Math.round(area * factor), 38, 230);
    return [Math.round(total * .56), Math.round(total * .30), Math.round(total * .14)];
  };
  let width = 0, height = 0, dpr = 1, lastFrame = 0, scrollY = 0, scrollSpeed = 0, mouseX = 0, mouseY = 0;
  let shootingStar = null, nextShootingStar = 0, animationFrame = 0;

  function resizeCanvas() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars.length = 0;
    const counts = starCounts();
    counts.forEach((count, layer) => {
      for (let i = 0; i < count; i++) {
        const tinted = layer === 2 && Math.random() < .18;
        stars.push({
          x: Math.random() * width, y: Math.random() * height,
          radius: layer === 0 ? .35 + Math.random() * .5 : layer === 1 ? .7 + Math.random() * .7 : 1 + Math.random() * 1.2,
          layer, phase: Math.random() * Math.PI * 2, speed: .08 + Math.random() * .24,
          color: tinted ? (Math.random() < .7 ? "#8EF0FF" : "#FFF7A8") : "#E7ECFF",
        });
      }
    });
    if (reducedMotion) drawStars(performance.now(), false);
  }

  function drawStars(now, animate = true) {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const depth = [0.12, 0.28, 0.55][star.layer];
      const x = (star.x + mouseX * depth * 20 + width) % width;
      const y = (star.y - scrollY * depth * .12 + height * 3) % height;
      const twinkle = animate ? .48 + .52 * Math.sin(now / (950 + star.layer * 350) + star.phase) : .78;
      ctx.globalAlpha = twinkle * (star.layer === 0 ? .48 : star.layer === 1 ? .72 : .95);
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      if (animate && scrollSpeed > 1.5 && star.layer > 0) {
        ctx.globalAlpha = twinkle * Math.min(.45, scrollSpeed / 80);
        ctx.strokeStyle = star.color;
        ctx.lineWidth = star.radius;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + Math.min(16, scrollSpeed * depth * .14));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    if (animate && now >= nextShootingStar && !shootingStar) {
      shootingStar = { x: Math.random() * width * .9, y: Math.random() * height * .45, born: now, duration: 850 };
      nextShootingStar = now + 6000 + Math.random() * 6000;
    }
    if (shootingStar) {
      const progress = (now - shootingStar.born) / shootingStar.duration;
      if (progress >= 1) shootingStar = null;
      else {
        const x = shootingStar.x + progress * 270;
        const y = shootingStar.y + progress * 190;
        ctx.globalAlpha = Math.sin(progress * Math.PI) * .8;
        const tail = ctx.createLinearGradient(x - 90, y - 60, x, y);
        tail.addColorStop(0, "transparent");
        tail.addColorStop(1, "#C4F7FF");
        ctx.strokeStyle = tail;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 90, y - 60);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  function tick(now) {
    if (document.hidden) { animationFrame = 0; return; }
    const elapsed = Math.min(40, now - (lastFrame || now));
    lastFrame = now;
    for (const star of stars) {
      star.x -= star.speed * elapsed * (star.layer + 1) * .035;
      if (star.x < 0) star.x = width;
    }
    scrollSpeed *= .88;
    if (scrollSpeed < .08) scrollSpeed = 0;
    drawStars(now);
    animationFrame = requestAnimationFrame(tick);
  }

  function startStars() {
    if (reducedMotion || animationFrame || document.hidden) return;
    if (!nextShootingStar) nextShootingStar = performance.now() + 6000 + Math.random() * 6000;
    animationFrame = requestAnimationFrame(tick);
  }
  function stopStars() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
  resizeCanvas();
  if (!reducedMotion) startStars();
  document.addEventListener("visibilitychange", () => document.hidden ? stopStars() : startStars());
  addEventListener("resize", resizeCanvas, { passive: true });
  addEventListener("pointermove", (event) => {
    mouseX = (event.clientX / Math.max(1, innerWidth) - .5) * 2;
    mouseY = (event.clientY / Math.max(1, innerHeight) - .5) * 2;
    updateEyes(event.clientX, event.clientY);
  }, { passive: true });
  addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    if (touch) updateEyes(touch.clientX, touch.clientY);
  }, { passive: true });

  // Nattu: eye tracking, click reactions, flying moods and the hero's typewriter.
  const allBots = [...document.querySelectorAll(".nattu")];
  const heroBot = document.querySelector(".nattu-hero");
  const heroBubble = document.querySelector("#hero-dialogue");
  const lines = [
    "Oh! A human! :wave:",
    "I'm Nattu.",
    "I'm flying to the corner of your screen, to worry about things so you don't have to.",
  ];
  function updateEyes(x, y) {
    for (const bot of allBots) {
      const face = bot.querySelector(".face");
      if (!face) continue;
      const rect = face.getBoundingClientRect();
      const dx = clamp((x - (rect.left + rect.width / 2)) / 16, -3, 3);
      const dy = clamp((y - (rect.top + rect.height / 2)) / 16, -3, 3);
      bot.style.setProperty("--lx", `${dx}em`);
      bot.style.setProperty("--ly", `${dy}em`);
    }
  }

  if (reducedMotion) {
    heroBubble.innerHTML = lines.map((line) => `<span>${line}</span>`).join("");
  } else {
    let lineIndex = 0;
    let charIndex = 0;
    function typeNext() {
      if (!heroBot || !heroBubble) return;
      if (lineIndex >= lines.length) return;
      let span = heroBubble.querySelector(`span[data-line="${lineIndex}"]`);
      if (!span) {
        span = document.createElement("span");
        span.dataset.line = String(lineIndex);
        heroBubble.append(span);
      }
      span.textContent = lines[lineIndex].slice(0, ++charIndex);
      if (charIndex >= lines[lineIndex].length) {
        lineIndex++;
        charIndex = 0;
        setTimeout(typeNext, 360);
      } else {
        setTimeout(typeNext, 28);
      }
    }
    setTimeout(typeNext, 2050);
  }

  let clickTimes = [];
  const dizzyBubble = document.createElement("div");
  dizzyBubble.className = "dizzy-bubble";
  dizzyBubble.setAttribute("role", "status");
  dizzyBubble.textContent = "Stop poking me. I'm load-bearing.";
  document.body.append(dizzyBubble);
  for (const bot of allBots) {
    bot.addEventListener("click", () => {
      const now = Date.now();
      clickTimes = clickTimes.filter((time) => now - time < 900);
      clickTimes.push(now);
      if (clickTimes.length >= 3) {
        clickTimes = [];
        bot.classList.add("is-dizzy");
        bot.style.animation = "spin-once .65s ease-in-out";
        dizzyBubble.classList.add("show");
        setTimeout(() => {
          bot.classList.remove("is-dizzy");
          bot.style.animation = "";
          dizzyBubble.classList.remove("show");
        }, 2000);
      }
    });
  }

  // Scroll scenes: route progress, moving journey robot, planet activation and nebula hue.
  const journey = document.querySelector(".journey");
  const stops = [...document.querySelectorAll(".planet-stop")];
  const desktopPath = document.querySelector(".route-desktop .route-progress");
  const mobilePath = document.querySelector(".route-mobile .route-progress");
  const journeyBot = document.querySelector(".journey-bot");
  const meter = document.querySelector(".distance-meter");
  const landing = document.querySelector(".landing");
  const landingBot = document.querySelector(".landing-bot");
  const nebulae = [...document.querySelectorAll(".nebula")];
  const moods = ["jump", "worried", "happy", "calm", "hot"];
  let scrollPending = false;
  let priorBotPoint = null;
  const landingObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      landingBot.classList.add("landed");
      landingObserver.disconnect();
    }
  }, { threshold: .18 });
  landingObserver.observe(landing);

  function updateScrollScenes() {
    scrollPending = false;
    const doc = document.documentElement;
    const maxScroll = Math.max(1, doc.scrollHeight - innerHeight);
    const pageProgress = clamp(scrollY / maxScroll, 0, 1);
    const hue = Math.round(pageProgress * 55 - 18);
    for (const nebula of nebulae) nebula.style.filter = `blur(100px) hue-rotate(${hue}deg)`;
    const sectionRect = journey.getBoundingClientRect();
    const sectionProgress = clamp((innerHeight * .52 - sectionRect.top) / Math.max(1, sectionRect.height), 0, 1);
    const mobile = matchMedia("(max-width: 700px)").matches;
    const path = mobile ? mobilePath : desktopPath;
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length * (1 - sectionProgress));
    const point = path.getPointAtLength(length * sectionProgress);
    const matrix = path.getScreenCTM();
    const activeIndex = clamp(Math.floor(sectionProgress * stops.length), 0, stops.length - 1);
    if (matrix && sectionRect.bottom > 0 && sectionRect.top < innerHeight) {
      const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(matrix);
      journeyBot.classList.add("is-flying");
      journeyBot.style.left = `${screenPoint.x - 48}px`;
      journeyBot.style.top = `${screenPoint.y - 48}px`;
      const mood = activeIndex === 5
        ? ["happy", "sleepy", "dizzy"][Math.floor(Date.now() / 1500) % 3]
        : moods[activeIndex];
      journeyBot.className = `journey-bot nattu is-flying is-${mood}`;
      if (priorBotPoint) {
        const dx = screenPoint.x - priorBotPoint.x;
        const dy = screenPoint.y - priorBotPoint.y;
        const tilt = clamp(Math.atan2(dx, -dy) * 180 / Math.PI, -8, 8);
        journeyBot.style.setProperty("--tilt", `${tilt}deg`);
        journeyBot.classList.toggle("fast", Math.abs(dx) + Math.abs(dy) > 3);
      }
      priorBotPoint = screenPoint;
    } else {
      journeyBot.classList.remove("is-flying");
      priorBotPoint = null;
    }
    stops.forEach((stop, index) => stop.classList.toggle("active", index === activeIndex && sectionRect.top < innerHeight * .7 && sectionRect.bottom > innerHeight * .3));
    const landingRect = landing.getBoundingClientRect();
    const distanceProgress = clamp((innerHeight - landingRect.top) / (innerHeight + landingRect.height * .35), 0, 1);
    const distance = Math.round((1 - distanceProgress) * 384400).toLocaleString("en-US");
    meter.textContent = distanceProgress > .99 ? "0 km. Home sweet home." : `Distance to your screen: ${distance} km`;
  }

  function requestScrollUpdate() {
    scrollY = window.scrollY;
    if (!scrollPending) {
      scrollPending = true;
      requestAnimationFrame(updateScrollScenes);
    }
  }
  addEventListener("scroll", () => {
    const nowY = window.scrollY;
    scrollSpeed = Math.abs(nowY - scrollY);
    scrollY = nowY;
    requestScrollUpdate();
  }, { passive: true });
  addEventListener("resize", requestScrollUpdate, { passive: true });
  requestScrollUpdate();
  setInterval(() => {
    if (document.hidden) return;
    const rect = journey.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight && (innerHeight * .52 - rect.top) / Math.max(1, rect.height) > .82) {
      requestScrollUpdate();
    }
  }, 1500);

  // OS detection: suggest the matching installer without hiding other download options.
  const platform = `${navigator.userAgentData?.platform || navigator.platform || ""} ${navigator.userAgent}`.toLowerCase();
  const detectedOS = platform.includes("win") ? "windows" : platform.includes("mac") ? "mac" : null;
  if (detectedOS) {
    const tag = document.querySelector(`[data-os="${detectedOS}"] .os-tag`);
    if (tag) tag.hidden = false;
  }

  // Distance meter and page click sparkles.
  document.addEventListener("click", (event) => {
    if (event.target.closest("a, button, .nattu")) return;
    if (reducedMotion) return;
    const layer = document.querySelector("#sparkle-layer");
    for (let i = 0; i < 6; i++) {
      const sparkle = document.createElement("i");
      sparkle.className = "sparkle";
      sparkle.style.left = `${event.clientX}px`;
      sparkle.style.top = `${event.clientY}px`;
      const angle = Math.PI * 2 * i / 6;
      sparkle.style.setProperty("--dx", `${Math.cos(angle) * (12 + Math.random() * 14)}px`);
      sparkle.style.setProperty("--dy", `${Math.sin(angle) * (12 + Math.random() * 14)}px`);
      layer.append(sparkle);
      sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
    }
  });
})();
