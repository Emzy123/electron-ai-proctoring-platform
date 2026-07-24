require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Exam = require('../models/Exam');

// Placeholder 128-float descriptor for seeded student (re-register for real face)
const placeholderDescriptor = Array.from({ length: 128 }, (_, i) => Math.sin(i) * 0.01);

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Exam.deleteMany({});
    console.log('Cleared existing users and exams');

    const facultyHash = await bcrypt.hash('Faculty@123', 10);
    const studentHash = await bcrypt.hash('Student@123', 10);

    const faculty = await User.create({
      name: 'Dr. Ahmed Faculty',
      email: 'faculty@custech.edu',
      matricNo: 'FAC001',
      passwordHash: facultyHash,
      role: 'faculty',
      faceDescriptor: [],
    });

    await User.create({
      name: 'Miqdad Student',
      email: 'student@custech.edu',
      matricNo: 'CUST2024001',
      passwordHash: studentHash,
      faceDescriptor: placeholderDescriptor,
      role: 'student',
    });

    const sampleQuestions = [
      {
        text: 'What does CPU stand for?',
        options: [
          'Central Processing Unit',
          'Computer Personal Unit',
          'Central Program Utility',
          'Control Processing Unit',
        ],
        correctAnswer: 0,
      },
      {
        text: 'Which data structure uses LIFO?',
        options: ['Queue', 'Stack', 'Tree', 'Graph'],
        correctAnswer: 1,
      },
      {
        text: 'What is the time complexity of binary search?',
        options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
        correctAnswer: 1,
      },
      {
        text: 'Which protocol is used for secure web communication?',
        options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'],
        correctAnswer: 2,
      },
      {
        text: 'What does HTML stand for?',
        options: [
          'Hyper Text Markup Language',
          'High Tech Modern Language',
          'Hyper Transfer Markup Language',
          'Home Tool Markup Language',
        ],
        correctAnswer: 0,
      },
    ];

    await Exam.create({
      title: 'Introduction to Computer Science',
      courseCode: 'CSC101',
      duration: 30,
      scheduledDate: new Date(Date.now() - 60000), // available now
      questions: sampleQuestions,
      createdBy: faculty._id,
      isPublished: true,
    });

    console.log('\n=== Seed completed ===');
    console.log('Faculty: faculty@custech.edu / Faculty@123');
    console.log('Student: student@custech.edu / Student@123');
    console.log('(Student should re-register with webcam for face verification)');
    console.log('Sample exam "CSC101" created and published.\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
