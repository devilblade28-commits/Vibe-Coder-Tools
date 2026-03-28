/**
 * Project templates - Pre-built starter projects for quick creation.
 */

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  icon: string
  files: TemplateFile[]
}

export interface TemplateFile {
  name: string
  content: string
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Modern landing page with hero section, features, and CTA',
    icon: '🌐',
    files: [
      {
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Landing Page</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="hero">
    <nav class="nav">
      <div class="logo">MyApp</div>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#about">About</a>
        <a href="#contact" class="btn-primary">Get Started</a>
      </div>
    </nav>
    <div class="hero-content">
      <h1>Build Something Amazing</h1>
      <p>Create beautiful, responsive websites in minutes with our powerful platform.</p>
      <div class="hero-cta">
        <a href="#contact" class="btn-primary btn-lg">Start Free Trial</a>
        <a href="#features" class="btn-secondary btn-lg">Learn More</a>
      </div>
    </div>
  </header>

  <section id="features" class="features">
    <h2>Features</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Lightning Fast</h3>
        <p>Optimized performance for the best user experience.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>Beautiful Design</h3>
        <p>Modern, clean aesthetics that impress visitors.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📱</div>
        <h3>Mobile First</h3>
        <p>Responsive layouts that work on any device.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>Secure</h3>
        <p>Enterprise-grade security built in from the start.</p>
      </div>
    </div>
  </section>

  <section id="about" class="about">
    <h2>About Us</h2>
    <p>We're passionate about helping creators build their online presence. Our platform combines simplicity with power, making it easy for anyone to create stunning websites.</p>
  </section>

  <section id="contact" class="contact">
    <h2>Get Started Today</h2>
    <form class="contact-form" onsubmit="handleSubmit(event)">
      <input type="email" placeholder="Enter your email" required>
      <button type="submit" class="btn-primary btn-lg">Subscribe</button>
    </form>
  </section>

  <footer class="footer">
    <p>&copy; 2024 MyApp. All rights reserved.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        name: 'style.css',
        content: `/* Landing Page Styles */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #1a1a2e;
  background: #ffffff;
}

/* Navigation */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  font-size: 24px;
  font-weight: 700;
  color: #6366f1;
}

.nav-links {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-links a {
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: #6366f1;
}

/* Buttons */
.btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-secondary {
  background: transparent;
  color: #6366f1;
  padding: 12px 24px;
  border-radius: 8px;
  border: 2px solid #6366f1;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #6366f1;
  color: white;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 16px;
}

/* Hero Section */
.hero {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  min-height: 100vh;
  padding-bottom: 80px;
}

.hero-content {
  text-align: center;
  padding: 80px 20px;
  max-width: 800px;
  margin: 0 auto;
}

.hero-content h1 {
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 20px;
}

.hero-content p {
  font-size: 20px;
  color: #6b7280;
  margin-bottom: 40px;
}

.hero-cta {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Features Section */
.features {
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.features h2 {
  text-align: center;
  font-size: 36px;
  margin-bottom: 60px;
  color: #1a1a2e;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature-card {
  background: #f9fafb;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 20px;
  margin-bottom: 12px;
  color: #1a1a2e;
}

.feature-card p {
  color: #6b7280;
}

/* About Section */
.about {
  background: #f5f3ff;
  padding: 80px 20px;
  text-align: center;
}

.about h2 {
  font-size: 36px;
  margin-bottom: 24px;
  color: #1a1a2e;
}

.about p {
  max-width: 600px;
  margin: 0 auto;
  font-size: 18px;
  color: #6b7280;
}

/* Contact Section */
.contact {
  padding: 80px 20px;
  text-align: center;
}

.contact h2 {
  font-size: 36px;
  margin-bottom: 32px;
  color: #1a1a2e;
}

.contact-form {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 500px;
  margin: 0 auto;
}

.contact-form input {
  flex: 1;
  min-width: 200px;
  padding: 16px 24px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.contact-form input:focus {
  border-color: #6366f1;
}

/* Footer */
.footer {
  background: #1a1a2e;
  color: #9ca3af;
  text-align: center;
  padding: 40px 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .nav {
    padding: 16px 20px;
  }
  
  .nav-links {
    gap: 12px;
  }
  
  .hero-content {
    padding: 60px 16px;
  }
  
  .hero-cta {
    flex-direction: column;
    align-items: center;
  }
}`,
      },
      {
        name: 'script.js',
        content: `// Landing Page Scripts

document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute('href'))
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    })
  })
  
  // Form submission
  const form = document.querySelector('.contact-form')
  if (form) {
    form.addEventListener('submit', handleSubmit)
  }
})

function handleSubmit(e) {
  e.preventDefault()
  const email = e.target.querySelector('input[type="email"]').value
  alert('Thanks for subscribing! We\\'ll contact you at ' + email)
  e.target.reset()
}

// Add scroll animation for feature cards
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1'
      entry.target.style.transform = 'translateY(0)'
    }
  })
}, observerOptions)

document.querySelectorAll('.feature-card').forEach(card => {
  card.style.opacity = '0'
  card.style.transform = 'translateY(20px)'
  card.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
  observer.observe(card)
})`,
      },
    ],
  },
  {
    id: 'todo-app',
    name: 'Todo App',
    description: 'Simple todo list with add, complete, and delete functionality',
    icon: '✅',
    files: [
      {
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>My Tasks</h1>
      <p class="date" id="currentDate"></p>
    </header>
    
    <form id="todoForm" class="todo-form">
      <input 
        type="text" 
        id="todoInput" 
        placeholder="What needs to be done?" 
        autocomplete="off"
      >
      <button type="submit" class="add-btn">Add Task</button>
    </form>
    
    <div class="filters">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="active">Active</button>
      <button class="filter-btn" data-filter="completed">Completed</button>
    </div>
    
    <ul id="todoList" class="todo-list"></ul>
    
    <footer class="stats">
      <span id="taskCount">0 tasks</span>
      <button id="clearCompleted" class="clear-btn">Clear Completed</button>
    </footer>
  </div>
  
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        name: 'style.css',
        content: `/* Todo App Styles */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 40px 20px;
}

.container {
  max-width: 500px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 30px;
  text-align: center;
  color: white;
}

header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.date {
  opacity: 0.9;
  font-size: 14px;
}

.todo-form {
  display: flex;
  padding: 20px;
  gap: 10px;
  border-bottom: 1px solid #eee;
}

.todo-form input {
  flex: 1;
  padding: 14px 18px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.todo-form input:focus {
  border-color: #667eea;
}

.add-btn {
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.filters {
  display: flex;
  padding: 15px 20px;
  gap: 10px;
  border-bottom: 1px solid #eee;
}

.filter-btn {
  flex: 1;
  padding: 10px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #e0e0e0;
}

.filter-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.todo-list {
  list-style: none;
  max-height: 400px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #aaa;
}

.checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid #ddd;
  border-radius: 50%;
  margin-right: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.todo-item.completed .checkbox {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: #667eea;
}

.checkbox::after {
  content: '✓';
  color: white;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.2s;
}

.todo-item.completed .checkbox::after {
  opacity: 1;
}

.todo-text {
  flex: 1;
  font-size: 16px;
  color: #333;
}

.delete-btn {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  color: #ddd;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.delete-btn:hover {
  color: #ff6b6b;
  background: #fff0f0;
}

.stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fafafa;
  font-size: 14px;
  color: #888;
}

.clear-btn {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-weight: 500;
}

.clear-btn:hover {
  text-decoration: underline;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #aaa;
}

.empty-state span {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}`,
      },
      {
        name: 'script.js',
        content: `// Todo App Script

let todos = JSON.parse(localStorage.getItem('todos')) || []
let currentFilter = 'all'

// DOM Elements
const form = document.getElementById('todoForm')
const input = document.getElementById('todoInput')
const list = document.getElementById('todoList')
const taskCount = document.getElementById('taskCount')
const clearBtn = document.getElementById('clearCompleted')
const filterBtns = document.querySelectorAll('.filter-btn')
const dateEl = document.getElementById('currentDate')

// Set current date
const today = new Date()
dateEl.textContent = today.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

// Save todos to localStorage
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos))
}

// Render todos
function renderTodos() {
  const filtered = todos.filter(todo => {
    if (currentFilter === 'active') return !todo.completed
    if (currentFilter === 'completed') return todo.completed
    return true
  })
  
  if (filtered.length === 0) {
    list.innerHTML = \`
      <li class="empty-state">
        <span>📝</span>
        <p>No tasks yet. Add one above!</p>
      </li>
    \`
  } else {
    list.innerHTML = filtered.map(todo => \`
      <li class="todo-item \${todo.completed ? 'completed' : ''}" data-id="\${todo.id}">
        <div class="checkbox" onclick="toggleTodo('\${todo.id}')"></div>
        <span class="todo-text">\${escapeHtml(todo.text)}</span>
        <button class="delete-btn" onclick="deleteTodo('\${todo.id}')">🗑</button>
      </li>
    \`).join('')
  }
  
  // Update count
  const activeCount = todos.filter(t => !t.completed).length
  taskCount.textContent = \`\${activeCount} task\${activeCount !== 1 ? 's' : ''} remaining\`
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Add todo
function addTodo(text) {
  const todo = {
    id: Date.now().toString(),
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  }
  todos.unshift(todo)
  saveTodos()
  renderTodos()
}

// Toggle todo
function toggleTodo(id) {
  todos = todos.map(todo => 
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  )
  saveTodos()
  renderTodos()
}

// Delete todo
function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id)
  saveTodos()
  renderTodos()
}

// Clear completed
function clearCompleted() {
  todos = todos.filter(todo => !todo.completed)
  saveTodos()
  renderTodos()
}

// Filter change
function setFilter(filter) {
  currentFilter = filter
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter)
  })
  renderTodos()
}

// Event Listeners
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (text) {
    addTodo(text)
    input.value = ''
  }
})

clearBtn.addEventListener('click', clearCompleted)

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter))
})

// Make functions globally available
window.toggleTodo = toggleTodo
window.deleteTodo = deleteTodo

// Initial render
renderTodos()`,
      },
    ],
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Functional calculator with basic operations and history',
    icon: '🔢',
    files: [
      {
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculator</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="calculator">
    <div class="display">
      <div class="expression" id="expression"></div>
      <div class="result" id="result">0</div>
    </div>
    
    <div class="buttons">
      <button class="btn function" onclick="clearAll()">AC</button>
      <button class="btn function" onclick="toggleSign()">±</button>
      <button class="btn function" onclick="percentage()">%</button>
      <button class="btn operator" onclick="setOperator('/')">÷</button>
      
      <button class="btn number" onclick="appendNumber('7')">7</button>
      <button class="btn number" onclick="appendNumber('8')">8</button>
      <button class="btn number" onclick="appendNumber('9')">9</button>
      <button class="btn operator" onclick="setOperator('*')">×</button>
      
      <button class="btn number" onclick="appendNumber('4')">4</button>
      <button class="btn number" onclick="appendNumber('5')">5</button>
      <button class="btn number" onclick="appendNumber('6')">6</button>
      <button class="btn operator" onclick="setOperator('-')">−</button>
      
      <button class="btn number" onclick="appendNumber('1')">1</button>
      <button class="btn number" onclick="appendNumber('2')">2</button>
      <button class="btn number" onclick="appendNumber('3')">3</button>
      <button class="btn operator" onclick="setOperator('+')">+</button>
      
      <button class="btn number zero" onclick="appendNumber('0')">0</button>
      <button class="btn number" onclick="appendDecimal()">.</button>
      <button class="btn equals" onclick="calculate()">=</button>
    </div>
    
    <div class="history" id="historyPanel">
      <div class="history-header">
        <span>History</span>
        <button onclick="clearHistory()">Clear</button>
      </div>
      <ul id="historyList"></ul>
    </div>
  </div>
  
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        name: 'style.css',
        content: `/* Calculator Styles */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.calculator {
  background: #0f0f1a;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  width: 320px;
}

.display {
  background: linear-gradient(135deg, #1a1a2e, #0f0f1a);
  padding: 30px 24px;
  text-align: right;
  border-bottom: 1px solid #2a2a4a;
}

.expression {
  font-size: 18px;
  color: #666;
  min-height: 24px;
  margin-bottom: 8px;
  word-break: break-all;
}

.result {
  font-size: 48px;
  font-weight: 300;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
}

.buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 20px;
}

.btn {
  height: 60px;
  border: none;
  border-radius: 16px;
  font-size: 24px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn:active {
  transform: scale(0.95);
}

.btn.number {
  background: #2a2a4a;
  color: white;
}

.btn.number:hover {
  background: #3a3a5a;
}

.btn.operator {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}

.btn.operator:hover {
  filter: brightness(1.1);
}

.btn.function {
  background: #1a1a3a;
  color: #a5a5a5;
}

.btn.function:hover {
  background: #2a2a4a;
  color: white;
}

.btn.equals {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.btn.equals:hover {
  filter: brightness(1.1);
}

.zero {
  grid-column: span 2;
}

.history {
  border-top: 1px solid #2a2a4a;
  max-height: 200px;
  overflow-y: auto;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #1a1a2e;
  color: #666;
  font-size: 14px;
  font-weight: 600;
}

.history-header button {
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  font-size: 12px;
}

.history ul {
  list-style: none;
}

.history li {
  padding: 12px 20px;
  color: #888;
  font-size: 14px;
  border-bottom: 1px solid #1a1a2e;
  display: flex;
  justify-content: space-between;
}

.history li:hover {
  background: #1a1a2e;
}

.history li span:last-child {
  color: #6366f1;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 360px) {
  .calculator {
    width: 100%;
    border-radius: 0;
  }
  
  .result {
    font-size: 36px;
  }
}`,
      },
      {
        name: 'script.js',
        content: `// Calculator Script

let currentValue = '0'
let previousValue = ''
let operator = null
let shouldResetDisplay = false
let history = JSON.parse(localStorage.getItem('calcHistory')) || []

const expressionEl = document.getElementById('expression')
const resultEl = document.getElementById('result')
const historyList = document.getElementById('historyList')

// Update display
function updateDisplay() {
  resultEl.textContent = formatNumber(currentValue)
}

function formatNumber(num) {
  const n = parseFloat(num)
  if (isNaN(n)) return 'Error'
  if (!isFinite(n)) return 'Error'
  
  // Format large numbers
  if (Math.abs(n) >= 1e9) {
    return n.toExponential(4)
  }
  
  // Format with commas and limit decimal places
  const parts = num.toString().split('.')
  let formatted = parseFloat(parts[0]).toLocaleString()
  
  if (parts[1]) {
    formatted += '.' + parts[1].slice(0, 8)
  }
  
  return formatted
}

// Append number
function appendNumber(num) {
  if (shouldResetDisplay) {
    currentValue = num
    shouldResetDisplay = false
  } else {
    if (currentValue === '0' && num !== '.') {
      currentValue = num
    } else if (currentValue.length < 12) {
      currentValue += num
    }
  }
  updateDisplay()
}

// Append decimal
function appendDecimal() {
  if (shouldResetDisplay) {
    currentValue = '0.'
    shouldResetDisplay = false
  } else if (!currentValue.includes('.')) {
    currentValue += '.'
  }
  updateDisplay()
}

// Set operator
function setOperator(op) {
  if (operator && !shouldResetDisplay) {
    calculate()
  }
  
  previousValue = currentValue
  operator = op
  shouldResetDisplay = true
  
  const opSymbol = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op
  expressionEl.textContent = \`\${formatNumber(previousValue)} \${opSymbol}\`
}

// Calculate result
function calculate() {
  if (!operator || !previousValue) return
  
  const prev = parseFloat(previousValue)
  const current = parseFloat(currentValue)
  let result
  
  switch (operator) {
    case '+':
      result = prev + current
      break
    case '-':
      result = prev - current
      break
    case '*':
      result = prev * current
      break
    case '/':
      result = current === 0 ? 'Error' : prev / current
      break
    default:
      return
  }
  
  // Update expression display
  const opSymbol = operator === '*' ? '×' : operator === '/' ? '÷' : operator === '-' ? '−' : operator
  expressionEl.textContent = \`\${formatNumber(previousValue)} \${opSymbol} \${formatNumber(currentValue)} =\`
  
  // Add to history
  addToHistory(previousValue, operator, currentValue, result)
  
  currentValue = result.toString()
  operator = null
  previousValue = ''
  shouldResetDisplay = true
  updateDisplay()
}

// Clear all
function clearAll() {
  currentValue = '0'
  previousValue = ''
  operator = null
  shouldResetDisplay = false
  expressionEl.textContent = ''
  updateDisplay()
}

// Toggle sign
function toggleSign() {
  if (currentValue !== '0') {
    currentValue = currentValue.startsWith('-') 
      ? currentValue.slice(1) 
      : '-' + currentValue
    updateDisplay()
  }
}

// Percentage
function percentage() {
  currentValue = (parseFloat(currentValue) / 100).toString()
  updateDisplay()
}

// History functions
function addToHistory(a, op, b, result) {
  const opSymbol = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op
  const entry = {
    expression: \`\${a} \${opSymbol} \${b}\`,
    result: result.toString()
  }
  
  history.unshift(entry)
  if (history.length > 10) history.pop()
  
  localStorage.setItem('calcHistory', JSON.stringify(history))
  renderHistory()
}

function renderHistory() {
  historyList.innerHTML = history.map(item => \`
    <li>
      <span>\${item.expression}</span>
      <span>\${formatNumber(item.result)}</span>
    </li>
  \`).join('')
}

function clearHistory() {
  history = []
  localStorage.removeItem('calcHistory')
  renderHistory()
}

// Keyboard support
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') appendNumber(e.key)
  if (e.key === '.') appendDecimal()
  if (e.key === '+') setOperator('+')
  if (e.key === '-') setOperator('-')
  if (e.key === '*') setOperator('*')
  if (e.key === '/') setOperator('/')
  if (e.key === 'Enter' || e.key === '=') calculate()
  if (e.key === 'Escape' || e.key === 'c') clearAll()
  if (e.key === 'Backspace') {
    if (currentValue.length > 1) {
      currentValue = currentValue.slice(0, -1)
    } else {
      currentValue = '0'
    }
    updateDisplay()
  }
})

// Initial render
renderHistory()
updateDisplay()`,
      },
    ],
  },
]

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find(t => t.id === id)
}

/**
 * Get all template IDs
 */
export function getTemplateIds(): string[] {
  return PROJECT_TEMPLATES.map(t => t.id)
}