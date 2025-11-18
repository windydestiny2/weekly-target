const userId = localStorage.getItem('user_id');
if (userId) {
  window.location.href = 'dashboard.html';
}
