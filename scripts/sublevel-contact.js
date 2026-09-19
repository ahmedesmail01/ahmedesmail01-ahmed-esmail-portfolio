  // A project enquiry using the visitor's email app, with no simulated signup.
  (function contact() {
    const form = document.querySelector('footer .signup');
    if (!form) return;
    const input = form.querySelector('input');
    const feedback = document.createElement('p');
    feedback.className = 'form-feedback';
    feedback.id = 'contact-feedback';
    feedback.setAttribute('role', 'status');
    input.setAttribute('aria-describedby', feedback.id);
    form.after(feedback);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
        input.setAttribute('aria-invalid', 'true');
        feedback.textContent = 'Enter a valid email address to start your enquiry.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      const email = document.querySelector('.contact .mail a').getAttribute('href');
      const body = `Hi Ahmed,\n\nI’d like to discuss a project.\n\nMy email: ${input.value.trim()}\nProject overview: \nTimeline: \n\nThanks!`;
      const href = `${email}?subject=${encodeURIComponent('New project enquiry')}&body=${encodeURIComponent(body)}`;
      feedback.replaceChildren('Continue in your email app, or ');
      const link = document.createElement('a');
      link.href = href;
      link.textContent = 'open the email draft again';
      link.className = 'actionable';
      feedback.append(link, '.');
      link.click();
    });

    // Existing detail pages link to /#work and /#contact. Forward those hashes
    // into the authored document without adding another scrolling container.
    if (window.parent !== window) {
      const followHash = () => {
        const hash = window.parent.location.hash;
        const aliases = { '#about': '#top', '#people': '#contact', '#skills': '#showcase' };
        const target = aliases[hash] || hash;
        if (target) document.getElementById(target.slice(1))?.scrollIntoView();
      };
      window.parent.addEventListener('hashchange', followHash);
      window.addEventListener('load', followHash, { once: true });
      window.addEventListener('pagehide', () => window.parent.removeEventListener('hashchange', followHash), { once: true });
    }
  })();
