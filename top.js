(function () {
  function createTopButton(className) {
    var btn = document.createElement('a');
    btn.href = '#top';
    btn.className = 'to-top-btn' + (className ? ' ' + className : '');
    btn.textContent = '↑ 맨 위';
    btn.setAttribute('aria-label', '맨 위로 이동');
    return btn;
  }

  document.querySelectorAll('main section h2').forEach(function (h2) {
    var title = h2.textContent.trim();
    var span = document.createElement('span');
    span.textContent = title;

    h2.textContent = '';
    h2.classList.add('section-heading-with-top');
    h2.appendChild(span);
    h2.appendChild(createTopButton('to-top-btn--section'));
  });

  document.querySelectorAll('main section h3').forEach(function (h3) {
    var wrap = document.createElement('div');
    wrap.className = 'subheading-wrap';

    h3.parentNode.insertBefore(wrap, h3);
    wrap.appendChild(h3);
    wrap.appendChild(createTopButton());
  });
})();
