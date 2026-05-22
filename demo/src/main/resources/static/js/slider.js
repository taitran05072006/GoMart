"use strict";

function initSlider() {
  const track = document.getElementById("sliderTrack");
  const slider = document.getElementById("heroSlider");
  if (!track || !slider) return;

  const slides = track.querySelectorAll(".slide");
  const count = slides.length;
  let cur = 0,
    timer,
    startX = 0,
    isDragging = false;

  function updateDots() {
    document.querySelectorAll(".dot").forEach((d, i) => {
      d.classList.toggle("active", i === cur);
    });
  }

  function go(idx) {
    cur = ((idx % count) + count) % count;
    track.style.transform = `translateX(-${cur * 100}%)`;
    updateDots();
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => go(cur + 1), 5000);
  }

  const prevBtn = document.getElementById("sliderPrev");
  const nextBtn = document.getElementById("sliderNext");
  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      go(cur - 1);
      startTimer();
    });
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      go(cur + 1);
      startTimer();
    });

  document.querySelectorAll(".dot").forEach((d) =>
    d.addEventListener("click", () => {
      go(+d.dataset.idx);
      startTimer();
    }),
  );

  // Touch/swipe support
  slider.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
    },
    { passive: true },
  );
  slider.addEventListener(
    "touchend",
    (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        go(cur + (diff > 0 ? 1 : -1));
        startTimer();
      }
    },
    { passive: true },
  );

  startTimer();
}
