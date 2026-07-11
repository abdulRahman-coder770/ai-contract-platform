AI Contract Compliance Platform
An event-driven, hybrid AI application designed to automate legal contract parsing and risk assessment. Built with Laravel 11, React, and Inertia.js.

🏗️ Architecture Overview
Architecture Diagram:(./diagrams/Architecture-diagram.png)

This platform utilizes a hybrid AI architecture to balance hardware efficiency with deep-reasoning capabilities. By offloading tasks to background queues, the application maintains a non-blocking, highly responsive user experience.

🚀 Key Engineering Features
Hybrid AI Strategy: Integrates local Llama 3.2 (Ollama) for low-latency, private parsing, with a Gemini API fallback for high-complexity legal reasoning.

Event-Driven Architecture: Leverages Laravel Reverb (WebSockets) to broadcast real-time analysis status updates to the dashboard without page refreshes.

Resilient Task Queues: Implements a robust background job pipeline with automated exponential backoff strategies to handle API rate limits and high-demand scenarios.

Modern Full-Stack: Built using Laravel 11, React, and Inertia.js for a seamless, single-page application experience.

🛠️ Tech Stack
Backend: Laravel 11

Frontend: React, Inertia.js

AI: Ollama (Llama 3.2) & Google Gemini API

Queues: Redis

Real-time: Laravel Reverb (WebSockets)

📋 Installation
Clone the repository:

Bash
git clone https://github.com/abdulRahman-coder770/ai-contract-platform

Install dependencies:

Bash
composer install
npm install


Configure your environment:

Bash
cp .env.example .env
php artisan key:generate


Start the services:

Bash
# Run the local AI engine (Ollama)
ollama serve

# Run the Laravel queue worker
php artisan queue:work

# Run the development server
npm run dev
php artisan serve
🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

📄 License
This project is open-sourced software licensed under the MIT license.

