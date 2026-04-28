
if (sessionStorage.getItem('token')) {
  window.location.href = '/dashboard';
}


if (window.location.search.includes('signup=success')) {
  alert('Account created successfully! Please log in.');
  window.history.replaceState({}, '', '/login');
}

const isSignupPage = document.getElementById('usernameInput') !== null;

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('show');
}

function hideError() {
  document.getElementById('errorMsg').classList.remove('show');
}

function extractError(data) {
  if (!data || !data.detail) return null;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    return data.detail[0].msg || 'Validation error';
  }
  return 'An error occurred';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


function isValidPassword(password) {
  if (password.length < 8)          return 'Password must be at least 8 characters.';
  if (!/[0-9]/.test(password))      return 'Password must contain at least 1 number.';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must contain at least 1 special character (e.g. @, #, !).';
  return null; 
}


async function doLogin(email, password) {
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();

  if (!r.ok) {
    showError(extractError(data) || 'Invalid email or password.');
    return;
  }

  
  sessionStorage.setItem('token', data.access_token);
  sessionStorage.setItem('username', data.username);
  window.location.href = '/dashboard';
}


async function doSignup(email, username, password) {
  const r    = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  const data = await r.json();

  if (!r.ok) {
    showError(extractError(data) || 'Signup failed. Try a different email.');
    return;
  }

 
  window.location.href = '/login?signup=success';
}


async function handleSubmit() {
  hideError();

  const email    = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();

  
  if (!email && !password) {
    showError('Email and password are required.');
    return;
  }
  if (!email) {
    showError('Email is required.');
    return;
  }
  if (!password) {
    showError('Password is required.');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Invalid email format. Please enter a valid email address.');
    return;
  }

  if (isSignupPage) {
    const username        = document.getElementById('usernameInput').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordInput').value.trim();

    if (!username) {
      showError('Username is required.');
      return;
    }

    
    const passwordError = isValidPassword(password);
    if (passwordError) {
      showError(passwordError);
      return;
    }

    
    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Please wait...';
    try {
      await doSignup(email, username, password);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Please wait...';
  try {
    await doLogin(email, password);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}


document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSubmit();
});

