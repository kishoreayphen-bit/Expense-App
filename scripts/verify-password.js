const bcrypt = require('bcrypt');

const password = 'admin123';
const storedHash = '$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C';

bcrypt.compare(password, storedHash, (err, result) => {
  if (err) {
    console.error('Error comparing passwords:', err);
    return;
  }
  console.log('Password matches:', result);
});
