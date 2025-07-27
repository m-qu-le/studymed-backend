// Quiz.js
const mongoose = require('mongoose');

// Schema cho từng lựa chọn đáp án trong một câu hỏi
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  isCorrect: { // True nếu đây là đáp án đúng (cho single-choice) hoặc một trong các đáp án đúng (cho multi-select)
    type: Boolean,
    default: false
  },
  feedback: { // Giải thích cụ thể cho lựa chọn này
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
  questionType: { // Loại câu hỏi: single-choice, multi-select, true-false
    type: String,
    enum: ['single-choice', 'multi-select', 'true-false'],
    default: 'single-choice',
    required: true
  },
  options: { // Mảng các lựa chọn, sử dụng optionSchema
    type: [optionSchema],
    required: true,
    validate: {
      validator: function(v) {
        // Đảm bảo có ít nhất 2 lựa chọn cho single-choice/multi-select
        // True/false cũng có 2 lựa chọn cố định là "Đúng"/"Sai"
        return v && v.length >= 2;
      },
      message: 'Một câu hỏi phải có ít nhất 2 lựa chọn.'
    }
  },
  generalExplanation: { // Giải thích tổng thể cho câu hỏi (nếu có)
    type: String,
    trim: true
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
  subject: { // Môn học (ví dụ: "Giải phẫu", "Dược lý")
    type: String,
    required: true,
    trim: true
  },
  topic: { // Chủ đề con (ví dụ: "Hệ tim mạch", "Thuốc kháng sinh")
    type: String,
    trim: true
  },
  questions: [questionSchema], // Mảng các câu hỏi, sử dụng questionSchema mới
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isSystemQuiz: { // Mới: Đánh dấu đây có phải là bộ đề hệ thống (do admin tạo) không
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