# Mindly - AI-Powered Mock Interview Coach

![Mindly Banner](https://img.shields.io/badge/AI-Powered-purple?style=for-the-badge) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Mindly is an intelligent mock interview platform designed to help candidates prepare for real-world job interviews. It simulates Technical, HR, and Behavioral rounds, providing real-time AI feedback to improve confidence and performance.

## 🚀 Features

-   **AI-Driven Interviews:** Conversational AI that acts as your interviewer.
-   **Multiple Modes:**
    -   **Technical:** Coding questions and algorithm discussions.
    -   **HR:** Cultural fit and behavioral questions.
    -   **Behavioral:** Situational questions (STAR method).
-   **Real-time Feedback:** Instant analysis of your answers with suggestions for improvement.
-   **Resume Analysis:** AI critique of your resume to highlight strengths and weaknesses.
-   **Speech-to-Text:** Speak your answers naturally (using browser speech recognition).
-   **Dashboard:** Track your progress and past interview sessions.

## 🛠️ Tech Stack

### Frontend
-   **React (Vite):** Fast, modern UI library.
-   **TailwindCSS:** Utility-first styling for a premium, glassmorphism design.
-   **React Router:** SPA routing.
-   **Axios:** API communication.

### Backend
-   **Node.js & Express:** Robust server-side logic.
-   **MongoDB:** NoSQL database for storing user data and interview sessions.
-   **OpenAI API / Custom LLM:** Powering the interview logic.

## 📦 Installation & Local Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/mindly.git
    cd mindly
    ```

2.  **Install Dependencies:**
    *   **Frontend:**
        ```bash
        cd client
        npm install
        ```
    *   **Backend:**
        ```bash
        cd server
        npm install
        ```

3.  **Environment Configuration:**
    *   Create a `.env` file in the `server/` directory:
        ```env
        PORT=5000
        MONGO_URI=your_mongodb_connection_string
        JWT_SECRET=your_jwt_secret
        OPENAI_API_KEY=your_openai_key
        ```
    *   Create a `.env` file in the `client/` directory:
        ```env
        VITE_API_URL=http://localhost:5000
        ```

4.  **Run Locally:**
    *   Start Backend:
        ```bash
        cd server
        npm run dev
        ```
    *   Start Frontend:
        ```bash
        cd client
        npm run dev
        ```
    *   Open `http://localhost:5173` in your browser.

## 🚀 Deployment

### Frontend (Vercel)
The client is configured for Vercel deployment with the Root Directory set to `client`.
-   **Build Command:** `vite build`
-   **Output Directory:** `dist`
-   **Environment Variables:**
    -   `VITE_API_URL`: Set this to your deployed backend URL.

### Backend (Render/Railway)
Deploy the `server` directory as a Node.js web service.
-   **Build Command:** `npm install`
-   **Start Command:** `npm start`

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.
