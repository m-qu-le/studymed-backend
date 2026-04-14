// routes/api/quiz.js
const express = require('express');
const router = express.Router();
const Quiz = require('../../models/Quiz');

// --- BẮT ĐẦU ĐOẠN CODE MỚI THÊM: CẤU HÌNH UPLOAD ẢNH ---
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config(); // Đọc các thông số bí mật từ file .env

// Cấu hình kết nối với kho lưu trữ Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình "Hộ lý" Multer: Nhận file và gửi thẳng lên thư mục 'studymed_quizzes' trên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'studymed_quizzes', // Tên thư mục sẽ được tạo trên Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'] // Các định dạng ảnh cho phép
  },
});

const upload = multer({ storage: storage });
// --- KẾT THÚC ĐOẠN CODE MỚI THÊM ---


// Đã xóa import middleware auth và model User vì không còn dùng để check quyền nữa
// const auth = require('../../middleware/authMiddleware'); 
// const User = require('../../models/User'); 

// @route   POST api/quizzes
// @desc    Tạo một bộ đề mới
// @access  Public (Đã bỏ auth)
router.post('/', async (req, res) => {
  const { title, description, subject, topic, questions, isSystemQuiz } = req.body;

  try {
    const newQuiz = new Quiz({
      title,
      description,
      subject,
      topic,
      questions,
      // Đã bỏ createdBy
      isSystemQuiz: isSystemQuiz || false 
    });

    const quiz = await newQuiz.save();
    res.json(quiz);
  } catch (err) {
    console.error(err.message);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ msg: err.message });
    }
    res.status(500).send('Lỗi Server');
  }
});

// @route   GET api/quizzes
// @desc    Lấy tất cả bộ đề
// @access  Public
router.get('/', async (req, res) => {
    const { system } = req.query; 

    try {
        let filter = {};

        // Lọc cơ bản theo query param nếu có
        if (system === 'true') {
            filter = { isSystemQuiz: true }; 
        } else if (system === 'false') {
            filter = { isSystemQuiz: false }; 
        }

        const quizzes = await Quiz.find(filter).populate('createdBy', 'username email');
        res.json(quizzes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/quizzes/:id
// @desc    Lấy một bộ đề theo ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'username email');
        if (!quiz) {
            return res.status(404).json({ msg: 'Bộ đề không tìm thấy' });
        }

        res.json(quiz);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'ID bộ đề không hợp lệ' });
        }
        res.status(500).send('Lỗi Server');
    }
});

// @route   PUT api/quizzes/:id
// @desc    Cập nhật một bộ đề
// @access  Public (Đã bỏ auth)
router.put('/:id', async (req, res) => {
    const quizId = req.params.id;
    const { title, description, subject, topic, questions, isSystemQuiz } = req.body;

    try {
        let quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ msg: 'Bộ đề không tìm thấy' });
        }

        quiz.title = title || quiz.title;
        quiz.description = description || quiz.description;
        quiz.subject = subject || quiz.subject;
        quiz.topic = topic || quiz.topic;
        quiz.questions = questions || quiz.questions;
        quiz.isSystemQuiz = isSystemQuiz !== undefined ? isSystemQuiz : quiz.isSystemQuiz; 

        await quiz.save();
        res.json(quiz);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'ID bộ đề không hợp lệ' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/quizzes/:id
// @desc    Xóa một bộ đề
// @access  Public (Đã bỏ auth)
router.delete('/:id', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ msg: 'Bộ đề không tìm thấy' });
        }

        await Quiz.deleteOne({ _id: quizId });
        res.json({ msg: 'Bộ đề đã được xóa' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'ID bộ đề không hợp lệ' });
        }
        res.status(500).send('Lỗi Server');
    }
});

// @route   POST api/quizzes/bulk-upload
// @desc    Nhập nhiều bộ đề từ một file JSON
// @access  Public (Đã bỏ auth)
router.post('/bulk-upload', async (req, res) => {
    const quizzesData = req.body; 

    try {
        if (!Array.isArray(quizzesData) || quizzesData.length === 0) {
            return res.status(400).json({ msg: 'Dữ liệu tải lên phải là một mảng JSON không rỗng của các bộ đề.' });
        }

        const insertedQuizzes = [];
        for (const quizData of quizzesData) {
            // Đã bỏ dòng gán quizData.createdBy = userId;
            quizData.isSystemQuiz = true; // Các bộ đề nhập hàng loạt mặc định là hệ thống

            const newQuiz = new Quiz(quizData);
            const savedQuiz = await newQuiz.save();
            insertedQuizzes.push(savedQuiz);
        }

        res.status(201).json({
            msg: `Đã nhập thành công ${insertedQuizzes.length} bộ đề.`,
            quizzes: insertedQuizzes
        });

    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: 'Lỗi validation khi nhập bộ đề.', errors });
        }
        res.status(500).send('Lỗi Server khi nhập bộ đề.');
    }
});

// --- BẮT ĐẦU API MỚI: NHẬN ẢNH VÀ TRẢ VỀ LINK ---
// @route   POST api/quizzes/upload-image
// @desc    Upload ảnh lên Cloudinary và lấy URL
// @access  Public
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    // Nếu Frontend không gửi file ảnh lên
    if (!req.file) {
      return res.status(400).json({ msg: 'Không tìm thấy file ảnh được gửi lên' });
    }
    
    // req.file.path chính là cái URL (đường dẫn phim X-quang) mà Cloudinary trả về
    console.log("Đã upload ảnh thành công:", req.file.path);
    res.json({ imageUrl: req.file.path });

  } catch (err) {
    console.error('Lỗi khi upload ảnh:', err);
    res.status(500).send('Lỗi Server khi xử lý ảnh');
  }
});
// --- KẾT THÚC API MỚI ---

module.exports = router;