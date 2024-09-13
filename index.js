const express = require('express');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const session = require('express-session');
const csv = require('csv-parser');
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
const app = express();
const port = 3000;

mongoose.connect('mongodb+srv://multimax:multimax@db1.qh7xc.mongodb.net/?retryWrites=true&w=majority&appName=db1', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model('User', {
  username: String,
  password: String,
});

const Password = mongoose.model('Password', {
  userId: mongoose.Schema.Types.ObjectId,
  appName: String,
  username: String,
  password: String,
});

app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcryptjs.hash(password, 10);
  const user = new User({ username, password: hashedPassword });
  await user.save();
  res.json({ message: 'User registered successfully' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcryptjs.compare(password, user.password)) {
    req.session.userId = user._id;
    res.json({ message: 'Logged in successfully' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

app.post('/api/passwords', requireAuth, async (req, res) => {
  const { appName, username, password } = req.body;
  const newPassword = new Password({
    userId: req.session.userId,
    appName,
    username,
    password,
  });
  await newPassword.save();
  res.json({ message: 'Password saved successfully' });
});

app.get('/api/passwords', requireAuth, async (req, res) => {
  const passwords = await Password.find({ userId: req.session.userId });
  res.json(passwords);
});

app.put('/api/passwords/:id', requireAuth, async (req, res) => {
  const { appName, username, password } = req.body;
  await Password.findByIdAndUpdate(req.params.id, { appName, username, password });
  res.json({ message: 'Password updated successfully' });
});

app.delete('/api/passwords/:id', requireAuth, async (req, res) => {
  await Password.findByIdAndDelete(req.params.id);
  res.json({ message: 'Password deleted successfully' });
});

app.delete('/api/account', requireAuth, async (req, res) => {
  await User.findByIdAndDelete(req.session.userId);
  await Password.deleteMany({ userId: req.session.userId });
  req.session.destroy();
  res.json({ message: 'Account deleted successfully' });
});

app.post('/api/import', requireAuth, async (req, res) => {
  const { csvData } = req.body;
  const results = [];
  
  csv()
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const row of results) {
        const newPassword = new Password({
          userId: req.session.userId,
          appName: row.url || row.appName,
          username: row.username,
          password: row.password,
        });
        await newPassword.save();
      }
      res.json({ message: 'Passwords imported successfully' });
    })
    .write(csvData);
});

app.get('/api/export', requireAuth, async (req, res) => {
  const passwords = await Password.find({ userId: req.session.userId });
  const csvStringifier = createCsvStringifier({
    header: [
      { id: 'appName', title: 'URL' },
      { id: 'username', title: 'Username' },
      { id: 'password', title: 'Password' },
    ],
  });
  
  const csvString = csvStringifier.stringifyRecords(passwords);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=passwords.csv');
  res.send(csvString);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});