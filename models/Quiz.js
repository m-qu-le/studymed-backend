// server/models/Quiz.js
const mongoose = require('mongoose');

// Schema cho từng lựa chọn đáp án trong một câu hỏi
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  feedback: {
    type: String,
    trim: true
  }
});

// Định nghĩa Schema cho một Câu hỏi (QuestionSchema)
const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  questionType: {
    type: String,
    enum: ['single-choice', 'multi-select', 'true-false'],
    default: 'single-choice',
    required: true
  },
  options: {
    type: [optionSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length >= 2;
      },
      message: 'Một câu hỏi phải có ít nhất 2 lựa chọn.'
    }
  },
  generalExplanation: {
    type: String,
    trim: true
  },
  // MỚI: Thêm trường tags và độ khó
  tags: {
    type: [String], // Kiểu dữ liệu là một mảng các chuỗi
    default: [] // Mặc định là một mảng rỗng nếu không được cung cấp
  },
difficulty: {
  type: String,
  enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'], 
  default: 'Thông hiểu'
}
});

// Định nghĩa Schema cho một Bộ đề (QuizSchema)
const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    trim: true
  },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isSystemQuiz: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Tạo Model từ Schema
const Quiz = mongoose.model('Quiz', quizSchema);

// Xuất Model
module.exports = Quiz;