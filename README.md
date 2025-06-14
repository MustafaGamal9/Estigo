

# Estigo E-Learning Platform

  

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)    ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Bootstrap](https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)

  

Estigo is a modern e-learning platform built with Angular and a .NET Core [backend](https://github.com/MustafaGamal9/Estigo-dotNet). It provides a comprehensive ecosystem for students, teachers, parents, and administrators to manage and engage with educational content seamlessly. The platform features role-based dashboards, AI-powered assistance, course management, and robust administrative controls.

[View Live Demo](https://estigo.vercel.app)

  
![Estigo Homepage Screenshot](https://i.postimg.cc/jSd8zPBY/Screenshot-1.jpg)




  

## ✨ Key Features

  

Estigo is more than just a course catalog. It's a full-fledged learning management system with distinct features for each user type.

  

### General & Student Features

-  **Interactive Course Catalog:** Browse courses by subject categories like Mathematics, Physics, Biology, Chemistry, and English.

-  **Dynamic Course Search:** A powerful header search bar allows users to quickly find courses by keywords.

-  **Student Dashboard:** A personalized hub for students to view their enrolled courses, recent quiz scores, payment history, and a list of their instructors.

-  **Integrated Video Player:** An in-app video player to watch course lessons, with a collapsible sidebar for easy navigation through the course curriculum.

-  **Interactive Quizzes:** Students can take quizzes associated with lessons, receive a final score, and review their answers.


-  **AI-Powered Performance Prediction:** Students can view a prediction of their final grade in a subject based on their performance metrics (attendance, quiz scores, etc.), visualized with dynamic charts.

-  **Educational Roadmaps:** Visual roadmaps guide students through the necessary steps for academic systems like IGCSE and EST.

-  **AI Chatbot Assistant:** A friendly chatbot powered by the Groq API (LLaMA 3) to answer user questions about courses, teachers, and platform features based on a detailed knowledge base.

  

### Role-Based Dashboards & Capabilities

  
The platform's core strength lies in its distinct, role-based dashboards, providing tailored experiences for every user.

  

#### 👨‍🎓 Student Dashboard

- View enrolled courses and access lesson content.

- Track quiz history and performance.

- Access AI-powered predictions for subject mastery.

- View payment history.

  

#### 👩‍🏫 Teacher Dashboard

- View a list of all enrolled students.

-  **Upload Content:** Teachers can create and upload their own courses, lessons, and quizzes for their students.

-  **Monitor Students:** Access individual student's quiz grades and performance predictions to provide targeted support.

  

#### 👨‍👩‍👧 Parent Dashboard

- A secure and straightforward interface for parents to monitor their child's progress.

- By entering a unique **Student Code**, parents can view their child's exam history and performance predictions.

  

#### 👑 Admin Dashboard

-  **User Management:** View all registered users (Students, Teachers, Parents) and add new users for any role.

-  **Course Management:** A complete overview of all courses on the platform with the ability to **edit details** and **delete courses**.

-  **Course Approval Workflow:** Review and approve/reject new courses submitted by teachers, ensuring content quality and consistency.

-  **Content Upload:** Admins have super-user privileges to upload new courses, lessons, and quizzes on behalf of any teacher.

  

## 🚀 Technology Stack

  

-  **Frontend:** [Angular](https://angular.io/) v19

-  **Language:** [TypeScript](https://www.typescriptlang.org/)

-  **Styling:** Custom CSS with [Bootstrap 5](https://getbootstrap.com/) for grid and utilities, and [Font Awesome](https://fontawesome.com/) for icons.

-  **Server-Side Rendering (SSR):** Implemented with `@angular/ssr` and [Express.js](https://expressjs.com/) for improved performance and SEO.

-  **AI Chatbot:** [Groq API](https://groq.com/) (LLaMA 3-70b model).

-  **Charting:** [CanvasJS](https://canvasjs.com/) for data visualization in the prediction module.

-  **State Management:** Component-level state and Angular Services with RxJS.

  



  

## ⚙️ Getting Started

 
  

### Installation & Setup

  

1.  **Clone the repository:**

```sh

git clone https://github.com/mustafagamal9/estigo-angular.git

cd estigo-angular

```

  

2.  **Install NPM packages:**

```sh

npm install

```

  

3.  **Run the development server:**

The application will be available at `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

```sh

ng serve

```

  


