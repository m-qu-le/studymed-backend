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
const userRoutes = require('./routes/user');

// MỚI: Định nghĩa các OPTIONS cho CORS một cách tường minh và đầy đủ hơn
const corsOptions = {
  origin: 'https://studymed-frontend.vercel.app', // URL frontend chính xác của bạn
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Các phương thức HTTP được phép
  credentials: true, // Cho phép gửi cookies và header xác thực
  allowedHeaders: 'Content-Type,Authorization', // Các header được phép
  optionsSuccessStatus: 204 // Mã trạng thái thành công cho các yêu cầu OPTIONS preflight (không có nội dung)
};

app.use(cors(corsOptions)); // MỚI: Sử dụng CORS với các tùy chọn đã định nghĩa

app.use(express.json());

// Định nghĩa một API endpoint đơn giản (route)
app.get('/', (req, res) => {
  res.send('Chào mừng bạn đến với backend StudyMed!');
});

// Sử dụng các router
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes);

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