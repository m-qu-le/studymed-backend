// routes/api/quiz.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/authMiddleware');
const Quiz = require('../../models/Quiz');
const User = require('../../models/User'); // Cần User model để kiểm tra vai trò admin

// Helper function to check if user is admin
const isAdmin = async (userId) => {
    const user = await User.findById(userId);
    return user && user.role === 'admin';
};

// @route   POST api/quizzes
// @desc    Tạo một bộ đề mới (có thể là bộ đề cá nhân hoặc hệ thống)
// @access  Private (Chỉ người dùng đã đăng nhập)
router.post('/', auth, async (req, res) => {
  const { id: userId } = req.user; // Lấy user ID từ token
  const { title, description, subject, topic, questions, isSystemQuiz } = req.body;

  try {
    // Chỉ admin mới có thể tạo isSystemQuiz = true
    if (isSystemQuiz && !(await isAdmin(userId))) {
        return res.status(403).json({ msg: 'Bạn không có quyền tạo bộ đề hệ thống.' });
    }

    const newQuiz = new Quiz({
      title,
      description,
      subject,
      topic,
      questions,
      createdBy: userId,
      isSystemQuiz: isSystemQuiz || false // Gán giá trị isSystemQuiz, mặc định là false
    });

    const quiz = await newQuiz.save();
    res.json(quiz);
  } catch (err) {
    console.error(err.message);
    // Xử lý lỗi validation nếu có
    if (err.name === 'ValidationError') {
        return res.status(400).json({ msg: err.message });
    }
    res.status(500).send('Lỗi Server');
  }
});

// @route   GET api/quizzes
// @desc    Lấy tất cả bộ đề (cá nhân và hệ thống nếu là admin, hoặc chỉ hệ thống nếu không xác thực)
//          Có thể thêm query param để lọc theo isSystemQuiz
// @access  Public (Ai cũng có thể xem system quizzes)
router.get('/', async (req, res) => {
    const { system } = req.query; // Lấy query param 'system'
    const token = req.header('Authorization')?.split(' ')[1]; // Lấy token thủ công để kiểm tra xác thực

    try {
        let filter = {};
        let populateUser = 'username email'; // Mặc định populate username, email

        if (token) { // Nếu có token, kiểm tra xác thực và quyền
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded.user; // Gán user vào request nếu token hợp lệ

                // Nếu là admin và yêu cầu tất cả (không có system=true/false)
                if (await isAdmin(req.user.id) && system === undefined) {
                    // Admin có thể thấy cả quiz cá nhân và hệ thống
                    // Không cần thêm filter
                } else if (system === 'true') {
                    filter = { isSystemQuiz: true }; // Admin hoặc user thường chỉ xem hệ thống nếu có param
                } else if (system === 'false') {
                    filter = { createdBy: req.user.id, isSystemQuiz: false }; // User thường chỉ xem quiz của mình
                } else { // User thường mặc định chỉ xem quiz của mình
                    filter = { createdBy: req.user.id };
                }
            } catch (jwtErr) {
                // Token không hợp lệ, coi như không xác thực
                filter = { isSystemQuiz: true }; // Chỉ cho phép xem bộ đề hệ thống
                populateUser = ''; // Không populate người tạo nếu không xác thực
            }
        } else { // Không có token, chỉ cho phép xem bộ đề hệ thống
            filter = { isSystemQuiz: true };
            populateUser = ''; // Không populate người tạo nếu không xác thực
        }

        const quizzes = await Quiz.find(filter).populate('createdBy', populateUser);
        res.json(quizzes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});


// @route   GET api/quizzes/:id
// @desc    Lấy một bộ đề theo ID
// @access  Public (nhưng nếu là cá nhân thì chỉ chủ sở hữu xem được)
router.get('/:id', async (req, res) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Lấy token để kiểm tra xác thực
    let currentUserId = null;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            currentUserId = decoded.user.id;
        } catch (jwtErr) {
            // Token không hợp lệ, không có currentUserId
        }
    }

    try {
        const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'username email');
        if (!quiz) {
            return res.status(404).json({ msg: 'Bộ đề không tìm thấy' });
        }

        // Nếu đây là bộ đề cá nhân và người xem không phải chủ sở hữu, từ chối truy cập
        if (!quiz.isSystemQuiz && quiz.createdBy.toString() !== currentUserId && !(await isAdmin(currentUserId))) {
            return res.status(403).json({ msg: 'Bạn không có quyền truy cập bộ đề này.' });
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
// @access  Private (Chỉ người dùng đã đăng nhập và là chủ sở hữu quiz đó, hoặc admin)
router.put('/:id', auth, async (req, res) => {
    const { id: userId } = req.user;
    const quizId = req.params.id;
    const { title, description, subject, topic, questions, isSystemQuiz } = req.body;

    try {
        let quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ msg: 'Bộ đề không tìm thấy' });
        }

        // Chỉ chủ sở hữu hoặc admin mới có quyền cập nhật
        if (quiz.createdBy.toString() !== userId && !(await isAdmin(userId))) {
            return res.status(403).json({ msg: 'Bạn không có quyền cập nhật bộ đề này.' });
        }

        // Chỉ admin mới có thể thay đổi isSystemQuiz hoặc cập nhật bộ đề hệ thống
        if (quiz.isSystemQuiz || (isSystemQuiz !== undefined && isSystemQuiz !== quiz.isSystemQuiz)) {
            if (!(await isAdmin(userId))) {
                return res.status(403).json({ msg: 'Bạn không có quyền thay đổi bộ đề hệ thống.' });
            }
        }

        quiz.title = title || quiz.title;
        quiz.description = description || quiz.description;
        quiz.subject = subject || quiz.subject;
        quiz.topic = topic || quiz.topic;
        quiz.questions = questions || quiz.questions;
        quiz.isSystemQuiz = isSystemQuiz !== undefined ? isSystemQuiz : quiz.isSystemQuiz; // Cập nhật isSystemQuiz

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
// @access  Private (Chỉ người dùng đã đăng nhập và là chủ sở hữu quiz đó, hoặc admin)
router.delete('/:id', auth, async (req, res) => {
    const { id: userId } = req.user;
    const quizId = req.params.id;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ msg: 'Bộ đề không tìm thấy' });
        }

        // Chỉ chủ sở hữu hoặc admin mới có quyền xóa
        if (quiz.createdBy.toString() !== userId && !(await isAdmin(userId))) {
            return res.status(403).json({ msg: 'Bạn không có quyền xóa bộ đề này.' });
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
// routes/api/quiz.js (thêm vào cuối file, trước module.exports)

// @route   POST api/quizzes/bulk-upload
// @desc    Nhập nhiều bộ đề từ một file JSON
// @access  Private (Chỉ Admin)
router.post('/bulk-upload', auth, async (req, res) => {
    const { id: userId } = req.user;
    const quizzesData = req.body; // body sẽ là một mảng các quiz từ file JSON

    try {
        // Kiểm tra xem người dùng có phải là admin không
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ msg: 'Bạn không có quyền thực hiện thao tác này.' });
        }

        if (!Array.isArray(quizzesData) || quizzesData.length === 0) {
            return res.status(400).json({ msg: 'Dữ liệu tải lên phải là một mảng JSON không rỗng của các bộ đề.' });
        }

        const insertedQuizzes = [];
        for (const quizData of quizzesData) {
            // Thêm createdBy và isSystemQuiz vào mỗi bộ đề
            quizData.createdBy = userId;
            quizData.isSystemQuiz = true; // Các bộ đề nhập hàng loạt mặc định là hệ thống

            const newQuiz = new Quiz(quizData);
            // Lỗi validation sẽ được bắt bởi try-catch tổng thể
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
            // Trả về lỗi validation chi tiết hơn
            const errors = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: 'Lỗi validation khi nhập bộ đề.', errors });
        }
        res.status(500).send('Lỗi Server khi nhập bộ đề.');
    }
});
module.exports = router;