// server/routes/api/study.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/authMiddleware');
const Quiz = require('../../models/Quiz');

// @route   GET api/study/filters
// @desc    Lấy tất cả các tag và độ khó duy nhất để làm bộ lọc
// @access  Private
router.get('/filters', auth, async (req, res) => {
  try {
    // Lấy tất cả các tag duy nhất từ tất cả các câu hỏi
    const tags = await Quiz.distinct('questions.tags');

    // Lấy các mức độ khó từ Schema
    const difficulties = Quiz.schema.path('questions.difficulty').caster.enumValues;

    res.json({
      tags: tags.sort(), // Sắp xếp lại tag theo alphabet
      difficulties
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Lỗi Server');
  }
});
// @route   POST api/study/session
// @desc    Tạo một buổi ôn tập (bộ đề ảo) dựa trên các bộ lọc
// @access  Private
router.post('/session', auth, async (req, res) => {
  const { tags, difficulties, numberOfQuestions } = req.body;

  try {
    // 1. Xây dựng điều kiện lọc ($match)
    const matchConditions = {};
    if (tags && tags.length > 0) {
      matchConditions['questions.tags'] = { $in: tags }; // Tìm câu hỏi có tag nằm trong danh sách tags người dùng chọn
    }
    if (difficulties && difficulties.length > 0) {
      matchConditions['questions.difficulty'] = { $in: difficulties }; // Tìm câu hỏi có độ khó nằm trong danh sách người dùng chọn
    }

    // 2. Sử dụng Aggregation Pipeline
    const questions = await Quiz.aggregate([
      // Giai đoạn 1: Mở (unwind) mảng câu hỏi, coi mỗi câu hỏi là một document riêng
      { $unwind: '$questions' },
      // Giai đoạn 2: Lọc các câu hỏi dựa trên điều kiện
      { $match: matchConditions },
      // Giai đoạn 3: Chọn ngẫu nhiên N câu hỏi từ kết quả đã lọc
      { $sample: { size: Number(numberOfQuestions) } },
      // Giai đoạn 4: Chỉ lấy ra các trường cần thiết của câu hỏi
      { $project: { _id: 0, question: '$questions' } }
    ]);
    
    // 3. Tạo một bộ đề ảo để gửi về frontend
    const virtualQuiz = {
      title: 'Buổi ôn tập tùy chỉnh',
      description: `Gồm ${questions.length} câu hỏi được chọn ngẫu nhiên.`,
      // Lấy ra danh sách câu hỏi từ kết quả aggregation
      questions: questions.map(q => q.question) 
    };

    if (questions.length === 0) {
      return res.status(404).json({ msg: 'Không tìm thấy câu hỏi nào phù hợp với lựa chọn của bạn.' });
    }

    res.json(virtualQuiz);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Lỗi Server');
  }
});
module.exports = router;