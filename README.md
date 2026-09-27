
# 📚 StudyMate

StudyMate is an AI-powered study assistant that helps students turn lecture notes into useful study material such as summaries, flashcards, and quiz questions.

## 🚀 Live Demo

**[Open StudyMate](https://6234160c.aistudymate.pages.dev)**

## ✨ Features

- 🔐 User authentication
- 📝 Paste lecture notes and generate study material
- 📄 AI-generated summaries
- 🃏 AI-generated flashcards
- ❓ AI-generated quiz questions
- 💾 Save successful generations for later
- 🕘 View previous generations
- 🗑️ Delete old generations
- 📥 Download summaries and flashcards as PDF
- ⏳ Loading states during AI generation
- ⚠️ Error handling for failed requests
- 🚫 Input validation for empty or excessively large notes
- 🔒 Private user history
- 📱 Responsive interface

## 🔄 How It Works

```text
Student enters lecture notes
          ↓
Selects generation type
          ↓
Request is sent to the AI service
          ↓
AI generates study material
          ↓
Result is displayed
          ↓
Successful result is saved
          ↓
Student can revisit or download it
```

## 🛠️ Tech Stack

- **React** — Frontend
- **JavaScript** — Application logic
- **HTML & CSS** — Interface
- **CRACO** — Build configuration
- **AI API** — AI-powered content generation
- **Database** — Persistent data storage
- **Cloudflare Pages** — Deployment

## 📂 Project Structure

```text
studymate-ai/
├── frontend/       # React frontend
├── backend/        # Backend and AI integration
├── tests/          # Testing files
├── test_reports/   # Test reports
└── README.md       # Project documentation
```

## 💻 Run Locally

```bash
git clone https://github.com/parthkumar10/studymate-ai.git
cd studymate-ai/frontend
npm install
npm start
```

The app will run at:

```text
http://localhost:3000
```

## 🔐 Security

Private API keys should be kept on the backend and never exposed in browser-visible code.

User generations are associated with their accounts so users can access only their own history.

## 🌐 Deployment

StudyMate is deployed using **Cloudflare Pages**.

**Live Demo:** https://studymate-ai.pages.dev

## 👨‍💻 Author

**Parth Kumar**

[GitHub](https://github.com/parthkumar10)
