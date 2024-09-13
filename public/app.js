document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const passwordForm = document.getElementById('passwordForm');
  const passwordList = document.getElementById('passwordList');
  const logoutBtn = document.getElementById('logoutBtn');
  const importBtn = document.getElementById('importBtn');
  const exportBtn = document.getElementById('exportBtn');
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      document.getElementById('authContainer').style.display = 'none';
      document.getElementById('appContainer').style.display = 'block';
      loadPasswords();
      loginForm.reset();
    } else {
      alert('Login failed');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      alert('Registration successful. Please login.');
      registerForm.reset();
    } else {
      alert('Registration failed');
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const appName = document.getElementById('appName').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const response = await fetch('/api/passwords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName, username, password }),
    });
    if (response.ok) {
      loadPasswords();
      passwordForm.reset();
    } else {
      alert('Failed to save password');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    const response = await fetch('/api/logout', { method: 'POST' });
    if (response.ok) {
      document.getElementById('authContainer').style.display = 'block';
      document.getElementById('appContainer').style.display = 'none';
    }
  });

  importBtn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvData = event.target.result;
        showLoading();
        const response = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvData }),
        });
        hideLoading();
        if (response.ok) {
          alert('Passwords imported successfully');
          loadPasswords();
        } else {
          alert('Failed to import passwords');
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  });

  exportBtn.addEventListener('click', async () => {
    const response = await fetch('/api/export');
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'passwords.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      alert('Failed to export passwords');
    }
  });

  deleteAccountBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      const response = await fetch('/api/account', { method: 'DELETE' });
      if (response.ok) {
        alert('Account deleted successfully');
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('appContainer').style.display = 'none';
      } else {
        alert('Failed to delete account');
      }
    }
  });

  async function loadPasswords() {
    const response = await fetch('/api/passwords');
    if (response.ok) {
      const passwords = await response.json();
      passwordList.innerHTML = '';
      passwords.forEach((pwd) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center mb-2';
        li.innerHTML = `
          <span>${pwd.appName}: ${pwd.username}</span>
          <div class="relative">
            <button class="text-gray-600 hover:text-gray-800 focus:outline-none" onclick="toggleOptionsMenu('${pwd._id}')">...</button>
            <div id="optionsMenu-${pwd._id}" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden">
              <button class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onclick="viewPassword('${pwd._id}', '${pwd.password}')">View Password</button>
              <button class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onclick="editPassword('${pwd._id}', '${pwd.appName}', '${pwd.username}', '${pwd.password}')">Edit Password</button>
              <button class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onclick="deletePassword('${pwd._id}')">Delete Password</button>
            </div>
          </div>
        `;
        passwordList.appendChild(li);
      });
    }
  }

  window.toggleOptionsMenu = (id) => {
    const menu = document.getElementById(`optionsMenu-${id}`);
    menu.classList.toggle('hidden');
  };

  window.viewPassword = (id, password) => {
    alert(`Password: ${password}`);
    toggleOptionsMenu(id);
  };

  window.editPassword = async (id, appName, username, password) => {
    const newAppName = prompt('Enter new app name:', appName);
    const newUsername = prompt('Enter new username:', username);
    const newPassword = prompt('Enter new password:', password);

    if (newAppName && newUsername && newPassword) {
      const response = await fetch(`/api/passwords/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName: newAppName, username: newUsername, password: newPassword }),
      });
      if (response.ok) {
        loadPasswords();
      } else {
        alert('Failed to update password');
      }
    }
    toggleOptionsMenu(id);
  };

  window.deletePassword = async (id) => {
    if (confirm('Are you sure you want to delete this password?')) {
      const response = await fetch(`/api/passwords/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadPasswords();
      } else {
        alert('Failed to delete password');
      }
    }
    toggleOptionsMenu(id);
  };

  function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingDiv';
    loadingDiv.className = 'fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-800 bg-opacity-50 z-50';
    loadingDiv.innerHTML = '<div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>';
    document.body.appendChild(loadingDiv);
  }

  function hideLoading() {
    const loadingDiv = document.getElementById('loadingDiv');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }
});