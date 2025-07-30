// server/routes/api/study.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/authMiddleware');
const Quiz = require('../../models/Quiz');

// @route   GET api/study/filters
// @desc    Lấy tất cả các tag và độ khó duy nhất để làm bộ lọc
// @access  Private
// @route   POST api/study/session
// @desc    Tạo một buổi ôn tập (bộ đề ảo) dựa trên các bộ lọc
// @access  Private
router.post('/session', auth, async (req, res) => {
  // MỚI: Thêm `tagFilterMode` vào, mặc định là 'any' (bất kỳ)
  const { tags, difficulties, numberOfQuestions, tagFilterMode = 'any' } = req.body;

  try {
    const matchConditions = {};

    if (tags && tags.length > 0) {
      // MỚI: Logic để chọn toán tử $in (bất kỳ) hoặc $all (tất cả)
      if (tagFilterMode === 'all') {
        matchConditions['questions.tags'] = { $all: tags }; // Lọc câu hỏi phải chứa TẤT CẢ các tag
      } else {
        matchConditions['questions.tags'] = { $in: tags }; // Lọc câu hỏi chỉ cần chứa BẤT KỲ tag nào
      }
    }

    if (difficulties && difficulties.length > 0) {
      matchConditions['questions.difficulty'] = { $in: difficulties };
    }

    const questions = await Quiz.aggregate([
      { $unwind: '$questions' },
      { $match: matchConditions },
      { $sample: { size: Number(numberOfQuestions) } },
      { $project: { _id: 0, question: '$questions' } }
    ]);

    const virtualQuiz = {
      title: 'Buổi ôn tập tùy chỉnh',
      description: `Gồm ${questions.length} câu hỏi được chọn lọc.`,
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