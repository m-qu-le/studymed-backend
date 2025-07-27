// server/index.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import thư viện CORS
const app = express();
const PORT = process.env.PORT || 5001; // Cổng dự phòng khi chạy cục bộ
const MONGODB_URI = process.env.MONGODB_URI;

// Import các router
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/api/quiz');
const userRoutes = require('./routes/user');

// MỚI: Định nghĩa các OPTIONS cho CORS để chỉ cho phép frontend của bạn truy cập
const corsOptions = {
  origin: 'https://studymed-frontend.vercel.app', // ĐÃ ĐẶT URL CHÍNH XÁC CỦA FRONTEND CỦA BẠN
  credentials: true, // Cho phép gửi cookies và header xác thực
  optionsSuccessStatus: 200 // Mã trạng thái thành công cho các yêu cầu preflight
};

app.use(cors(corsOptions)); // MỚI: Sử dụng CORS với các tùy chọn đã định nghĩa

app.use(express.json()); // Middleware để Express có thể đọc dữ liệu JSON từ request body

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