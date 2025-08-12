// server/routes/user.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const Quiz = require('../models/Quiz');

// @route   PUT api/users/bookmark/:question_id
// @desc    Thêm/Xóa một câu hỏi khỏi danh sách bookmark của người dùng
// @access  Private
router.put('/bookmark/:question_id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Người dùng không tìm thấy' });
        }

        const questionId = req.params.question_id;
        
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
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/users/bookmarks
// @desc    Lấy tất cả các câu hỏi đã được bookmark bởi người dùng hiện tại
// @access  Private
router.get('/bookmarks', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Người dùng không tìm thấy' });
        }
        const bookmarkedQuestionIds = user.bookmarkedQuestions;

        // ĐÃ SỬA: Dùng toán tử $or để tìm ID trong cả câu hỏi đơn và câu hỏi con
        const quizzesContainingBookmarks = await Quiz.find({
          $or: [
            { 'questions._id': { $in: bookmarkedQuestionIds } },
            { 'questions.childQuestions._id': { $in: bookmarkedQuestionIds } }
          ]
        });

        const bookmarkedQuestionsDetails = [];
        
        // ĐÃ SỬA: Lặp qua và xử lý cả hai loại câu hỏi
        quizzesContainingBookmarks.forEach(quiz => {
            quiz.questions.forEach(item => {
                if (item.type === 'single') {
                    if (bookmarkedQuestionIds.some(bqId => bqId.equals(item._id))) {
                        bookmarkedQuestionsDetails.push({
                            quizId: quiz._id,
                            quizTitle: quiz.title,
                            question: item
                        });
                    }
                } else if (item.type === 'group') {
                    item.childQuestions.forEach(childQuestion => {
                        if (bookmarkedQuestionIds.some(bqId => bqId.equals(childQuestion._id))) {
                            // Khi trả về câu hỏi con, gắn thêm caseStem để có đầy đủ ngữ cảnh
                            const questionWithStem = { 
                                ...childQuestion.toObject(), 
                                caseStem: item.caseStem 
                            };
                            bookmarkedQuestionsDetails.push({
                                quizId: quiz._id,
                                quizTitle: quiz.title,
                                question: questionWithStem
                            });
                        }
                    });
                }
            });
        });

        res.json(bookmarkedQuestionsDetails);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;