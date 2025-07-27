// server/index.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

// Import các router
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/api/quiz');
const userRoutes = require('./routes/user'); // MỚI: Import router user

app.use(cors()); // Middleware CORS phải ở trên cùng
app.use(express.json()); // Middleware để Express có thể đọc dữ liệu JSON

// Định nghĩa một API endpoint đơn giản (route)
app.get('/', (req, res) => {
  res.send('Chào mừng bạn đến với backend StudyMed!');
});

// Sử dụng các router
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes); // MỚI: Gắn router user vào đường dẫn '/api/users'

// Hàm kết nối tới MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Kết nối MongoDB thành công!');
  } catch (err) {
    console.error('Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
  }
};

// Gọi hàm kết nối database trước khi khởi động server
connectDB();

app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
  console.log(`Truy cập: http://localhost:${PORT}`);
});