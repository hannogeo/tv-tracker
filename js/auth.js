import { auth, createUserProfile } from './firebase.js';
import { showToast, getInitials } from './ui.js';

function renderLoginPage() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-container">
        <div class="auth-logo">TV TRACKER</div>
        <p class="auth-subtitle">Track your shows and movies</p>
        <div class="auth-card">
          <h2>Sign In</h2>
          <div class="auth-error" id="loginError"></div>
          <form id="loginForm">
            <div class="form-group">
              <label for="loginEmail">Email</label>
              <input type="email" id="loginEmail" class="form-input" placeholder="you@example.com" required autocomplete="email" />
            </div>
            <div class="form-group">
              <label for="loginPassword">Password</label>
              <div class="input-with-toggle">
                <input type="password" id="loginPassword" class="form-input" placeholder="Enter your password" required autocomplete="current-password" />
                <button type="button" class="toggle-pw" data-toggle="loginPassword" aria-label="Toggle password visibility">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-group">
                <input type="checkbox" id="rememberMe" /> Remember me
              </label>
            </div>
            <button type="submit" class="btn btn-primary" id="loginBtn" style="width:100%;">Sign In</button>
          </form>
          <div class="auth-footer">
            Don't have an account? <a href="#/register">Register</a>
          </div>
        </div>
      </div>
    </div>
  `;

  setupPasswordToggles();
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  const email = localStorage.getItem('rememberedEmail');
  if (email) {
    document.getElementById('loginEmail').value = email;
    document.getElementById('rememberMe').checked = true;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  errorEl.classList.remove('visible');
  errorEl.textContent = '';

  if (!email) { showFieldError('loginEmail', 'Email is required'); return; }
  if (!password) { showFieldError('loginPassword', 'Password is required'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-sm"></span> Signing in...';

  try {
    if (remember) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Sign In';
    let msg = 'Invalid email or password';
    if (err.code === 'auth/user-not-found') msg = 'No account found with this email';
    else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Invalid email or password';
    else if (err.code === 'auth/invalid-email') msg = 'Invalid email format';
    else if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }
}

function renderRegisterPage() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-container">
        <div class="auth-logo">TV TRACKER</div>
        <p class="auth-subtitle">Track your shows and movies</p>
        <div class="auth-card">
          <h2>Create Account</h2>
          <div class="auth-error" id="registerError"></div>
          <form id="registerForm">
            <div class="form-group">
              <label for="regUsername">Username</label>
              <input type="text" id="regUsername" class="form-input" placeholder="Your username" required autocomplete="username" />
              <div class="error-text" id="regUsernameError"></div>
            </div>
            <div class="form-group">
              <label for="regEmail">Email</label>
              <input type="email" id="regEmail" class="form-input" placeholder="you@example.com" required autocomplete="email" />
              <div class="error-text" id="regEmailError"></div>
            </div>
            <div class="form-group">
              <label for="regPassword">Password</label>
              <div class="input-with-toggle">
                <input type="password" id="regPassword" class="form-input" placeholder="At least 8 characters" required autocomplete="new-password" />
                <button type="button" class="toggle-pw" data-toggle="regPassword" aria-label="Toggle password visibility">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <div class="error-text" id="regPasswordError"></div>
            </div>
            <div class="form-group">
              <label for="regConfirm">Confirm Password</label>
              <div class="input-with-toggle">
                <input type="password" id="regConfirm" class="form-input" placeholder="Confirm your password" required autocomplete="new-password" />
                <button type="button" class="toggle-pw" data-toggle="regConfirm" aria-label="Toggle password visibility">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <div class="error-text" id="regConfirmError"></div>
            </div>
            <button type="submit" class="btn btn-primary" id="registerBtn" style="width:100%;">Create Account</button>
          </form>
          <div class="auth-footer">
            Already have an account? <a href="#/login">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  `;

  setupPasswordToggles();
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const btn = document.getElementById('registerBtn');

  clearFieldErrors('regUsernameError', 'regEmailError', 'regPasswordError', 'regConfirmError');
  document.getElementById('registerError').classList.remove('visible');

  let hasError = false;
  if (!username) { showFieldError('regUsername', 'Username is required'); hasError = true; }
  if (!email) { showFieldError('regEmail', 'Email is required'); hasError = true; }
  if (!password) { showFieldError('regPassword', 'Password is required'); hasError = true; }
  else if (password.length < 8) { showFieldError('regPassword', 'Password must be at least 8 characters'); hasError = true; }
  if (password !== confirm) { showFieldError('regConfirm', 'Passwords do not match'); hasError = true; }
  if (hasError) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-sm"></span> Creating...';

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await createUserProfile(cred.user.uid, { username, email });
    await cred.user.updateProfile({ displayName: username });
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Create Account';
    let msg = 'Registration failed';
    if (err.code === 'auth/email-already-in-use') msg = 'Email already in use';
    else if (err.code === 'auth/invalid-email') msg = 'Invalid email format';
    else if (err.code === 'auth/weak-password') msg = 'Password is too weak';
    document.getElementById('registerError').textContent = msg;
    document.getElementById('registerError').classList.add('visible');
  }
}

function renderChangePassword() {
  const container = document.getElementById('changePasswordSection');
  if (!container) return;
  container.innerHTML = `
    <h3 style="margin-bottom:16px;">Change Password</h3>
    <form id="changePasswordForm">
      <div class="form-group">
        <label for="cpCurrent">Current Password</label>
        <div class="input-with-toggle">
          <input type="password" id="cpCurrent" class="form-input" required autocomplete="current-password" />
          <button type="button" class="toggle-pw" data-toggle="cpCurrent" aria-label="Toggle password visibility">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="error-text" id="cpCurrentError"></div>
      </div>
      <div class="form-group">
        <label for="cpNew">New Password</label>
        <div class="input-with-toggle">
          <input type="password" id="cpNew" class="form-input" required autocomplete="new-password" />
          <button type="button" class="toggle-pw" data-toggle="cpNew" aria-label="Toggle password visibility">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="error-text" id="cpNewError"></div>
      </div>
      <div class="form-group">
        <label for="cpConfirm">Confirm New Password</label>
        <div class="input-with-toggle">
          <input type="password" id="cpConfirm" class="form-input" required autocomplete="new-password" />
          <button type="button" class="toggle-pw" data-toggle="cpConfirm" aria-label="Toggle password visibility">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="error-text" id="cpConfirmError"></div>
      </div>
      <div class="success-text" id="cpSuccess" style="display:none;"></div>
      <button type="submit" class="btn btn-primary" id="cpBtn">Change Password</button>
    </form>
  `;
  setupPasswordToggles();
  document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);
}

async function handleChangePassword(e) {
  e.preventDefault();
  const current = document.getElementById('cpCurrent').value;
  const newPw = document.getElementById('cpNew').value;
  const confirm = document.getElementById('cpConfirm').value;
  const btn = document.getElementById('cpBtn');
  const successEl = document.getElementById('cpSuccess');

  clearFieldErrors('cpCurrentError', 'cpNewError', 'cpConfirmError');
  successEl.style.display = 'none';

  let hasError = false;
  if (!current) { showFieldError('cpCurrent', 'Current password is required'); hasError = true; }
  if (!newPw) { showFieldError('cpNew', 'New password is required'); hasError = true; }
  else if (newPw.length < 8) { showFieldError('cpNew', 'Password must be at least 8 characters'); hasError = true; }
  if (newPw !== confirm) { showFieldError('cpConfirm', 'Passwords do not match'); hasError = true; }
  if (hasError) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-sm"></span> Changing...';

  try {
    const user = auth.currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, current);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(newPw);
    successEl.textContent = 'Password changed successfully!';
    successEl.style.display = 'block';
    document.getElementById('changePasswordForm').reset();
  } catch (err) {
    let msg = 'Failed to change password';
    if (err.code === 'auth/wrong-password') msg = 'Current password is incorrect';
    showFieldError('cpCurrent', msg);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Change Password';
  }
}

async function handleLogout() {
  try {
    await auth.signOut();
  } catch (err) {
    console.error('Logout error:', err);
  }
}

function setupPasswordToggles() {
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.toggle);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });
}

function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  if (input) input.classList.add('error');
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (errorEl) errorEl.textContent = message;
}

function clearFieldErrors(...ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  document.querySelectorAll('.form-input.error').forEach((el) => el.classList.remove('error'));
}

export {
  renderLoginPage,
  renderRegisterPage,
  renderChangePassword,
  handleLogout,
  getInitials,
};
