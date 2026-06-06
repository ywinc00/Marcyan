const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const target = el.textContent;
      const num = parseInt(target.replace(/\D/g, ''));
      if (!isNaN(num) && num > 0) {
        let start = 0;
        const step = num / 40;
        const suffix = target.replace(/[\d.]/g, '');
        const timer = setInterval(() => {
          start = Math.min(start + step, num);
          el.textContent = Math.floor(start) + suffix;
          if (start >= num) clearInterval(timer);
        }, 30);
      }
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num').forEach(s => counterObserver.observe(s));
