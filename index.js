// server/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

// Import các router (Đã xóa authRoutes)
const quizRoutes = require('./routes/api/quiz');
const userRoutes = require('./routes/user');
const studyRoutes = require('./routes/api/study');

// Cấu hình CORS
// Đã sửa lại thành hàm trống để cho phép mọi origin (bao gồm cả localhost) gọi dữ liệu
app.use(cors());

// Middlewares
app.use(express.json());

// API Routes
app.get('/', (req, res) => {
  res.send('Chào mừng bạn đến với backend StudyMed!');
});

// Đã xóa app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes);
app.use('/api/study', studyRoutes); // Đảm bảo dòng này được đăng ký

// Kết nối Database
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Kết nối MongoDB thành công!');
  } catch (err) {
    console.error('Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
  }
};

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server đang chạy trên cổng ${PORT}`);
    });
});
// Forcing a new deploy at 2025-07-30 21:38