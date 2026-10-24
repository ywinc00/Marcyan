// Estado del boceto por hash (#historia) y estrellas deterministas.
if (location.hash === '#historia') document.documentElement.classList.add('is-story');
(function stars() {
  document.querySelectorAll('svg.stars').forEach(function (svg) {
    var n = +(svg.dataset.n || 70), seed = +(svg.dataset.seed || 7);
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var w = svg.viewBox.baseVal.width || 1440, h = svg.viewBox.baseVal.height || 600, out = '';
    for (var i = 0; i < n; i++) {
      var gold = rnd() < .25, r = rnd() < .3 ? .9 : .55;
      out += '<circle cx="' + (rnd() * w).toFixed(1) + '" cy="' + (rnd() * h).toFixed(1) + '" r="' + r +
        '" fill="' + (gold ? '#c8a96e' : '#f0ede8') + '" opacity="' + (gold ? .7 : (.35 + rnd() * .45)).toFixed(2) + '"/>';
    }
    svg.innerHTML = out;
  });
})();
