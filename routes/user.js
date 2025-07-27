// server/routes/user.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // Middleware xác thực
const User = require('../models/User'); // User Model
const Quiz = require('../models/Quiz'); // Quiz Model để kiểm tra câu hỏi tồn tại

// @route   PUT api/users/bookmark/:question_id
// @desc    Thêm/Xóa một câu hỏi khỏi danh sách bookmark của người dùng
// @access  Private
router.put('/bookmark/:question_id', auth, async (req, res) => {
    const userId = req.user.id; // ID người dùng từ token
    const questionId = req.params.question_id; // ID câu hỏi từ URL

    try {
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'Người dùng không tìm thấy' });
        }

        // Tùy chọn: Kiểm tra xem questionId có tồn tại trong bất kỳ quiz nào không
        // (Thực tế, câu hỏi là sub-document, nên cần tìm Quiz chứa nó)
        const questionExistsInQuiz = await Quiz.exists({ 'questions._id': questionId });
        if (!questionExistsInQuiz) {
            return res.status(404).json({ msg: 'Câu hỏi không tồn tại.' });
        }

        // Kiểm tra xem câu hỏi đã được bookmark chưa
        const isBookmarked = user.bookmarkedQuestions.includes(questionId);

        if (isBookmarked) {
            // Nếu đã bookmark, thì xóa đi
            user.bookmarkedQuestions = user.bookmarkedQuestions.filter(
                (id) => id.toString() !== questionId
            );
            await user.save();
            return res.json({ msg: 'Đã xóa bookmark câu hỏi', bookmarked: false });
        } else {
            // Nếu chưa bookmark, thì thêm vào
            user.bookmarkedQuestions.push(questionId);
            await user.save();
            return res.json({ msg: 'Đã thêm bookmark câu hỏi', bookmarked: true });
        }

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'ID câu hỏi không hợp lệ.' });
        }
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/users/bookmarks
// @desc    Lấy tất cả các câu hỏi đã được bookmark bởi người dùng hiện tại
// @access  Private
router.get('/bookmarks', auth, async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await User.findById(userId); // Không populate trực tiếp vì phức tạp với sub-document
        if (!user) {
            return res.status(404).json({ msg: 'Người dùng không tìm thấy' });
        }
        const bookmarkedQuestionIds = user.bookmarkedQuestions;

        // MỚI: Tìm các Quiz chứa các câu hỏi đã bookmark và trích xuất câu hỏi
        const bookmarkedQuestions = [];
        const quizzesContainingBookmarks = await Quiz.find({ 'questions._id': { $in: bookmarkedQuestionIds } });

        quizzesContainingBookmarks.forEach(quiz => {
            quiz.questions.forEach(question => {
                if (bookmarkedQuestionIds.includes(question._id.toString())) {
                    bookmarkedQuestions.push({
                        quizId: quiz._id,
                        quizTitle: quiz.title,
                        question: question // Toàn bộ thông tin câu hỏi
                    });
                }
            });
        });

        res.json(bookmarkedQuestions);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;