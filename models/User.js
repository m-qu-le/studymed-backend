// server/models/User.js
const mongoose = require('mongoose');

// Định nghĩa Schema cho User
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/.+@.+\..+/, 'Vui lòng nhập một địa chỉ email hợp lệ']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  bookmarkedQuestions: [ // MỚI: Mảng các ID câu hỏi đã đánh dấu sao
    {
      type: mongoose.Schema.Types.ObjectId,
      // Ref này không trực tiếp đến subdocument mà là cách để mongoose biết ID này từ đâu ra
      // Logic thực tế để populate sẽ cần tìm Quiz và sau đó tìm câu hỏi trong Quiz đó.
      // Để đơn giản, đây chỉ là ObjectId
    }
  ]
}, {
  timestamps: true
});

// Tạo Model từ Schema
const User = mongoose.model('User', userSchema);

// Xuất Model để có thể sử dụng ở các file khác
module.exports = User;