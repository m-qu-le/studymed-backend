// server/routes/api/study.js
const express = require('express');
const router = express.Router();
const Quiz = require('../../models/Quiz');

// @route   GET api/study/filters
// @desc    Lấy tất cả các tag và độ khó từ "câu hỏi mẹ" và sắp xếp Alphabet
// @access  Public (Đã bỏ auth)
router.get('/filters', async (req, res) => {
  try {
    const tagsResult = await Quiz.aggregate([
      { $project: { questions: 1 } },
      { $unwind: '$questions' },
      // Chỉ lấy tags từ vỏ ngoài (câu hỏi đơn hoặc thân chung của câu chùm)
      { $unwind: '$questions.tags' },
      { $group: { _id: null, uniqueTags: { $addToSet: '$questions.tags' } } }
    ]);

    // Sắp xếp Alphabet theo bảng chữ cái tiếng Việt (a-b-c)
    const tags = tagsResult.length > 0 
      ? tagsResult[0].uniqueTags.sort((a, b) => a.localeCompare(b, 'vi')) 
      : [];
      
    const difficulties = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];

    res.json({ tags, difficulties });
  } catch (err) {
    console.error('Error fetching filters:', err.message);
    res.status(500).send('Lỗi Server');
  }
});

// @route   POST api/study/session
// @desc    Tạo một buổi ôn tập lấy nguyên vẹn Bệnh án nếu trùng Tag
// @access  Public (Đã bỏ auth)
router.post('/session', async (req, res) => {
  const { tags, difficulties, numberOfQuestions, tagFilterMode = 'any' } = req.body;

  try {
    const pipeline = [];

    // Giai đoạn 1: Tách các câu hỏi lớn ra (Bao gồm Single và nguyên khối Group)
    pipeline.push({ $unwind: '$questions' });

    // Giai đoạn 2: Lọc trực tiếp trên màng tế bào của câu mẹ
    const matchConditions = {};
    if (difficulties && difficulties.length > 0) {
      matchConditions['questions.difficulty'] = { $in: difficulties };
    }
    if (tags && tags.length > 0) {
      const tagOperator = tagFilterMode === 'all' ? '$all' : '$in';
      matchConditions['questions.tags'] = { [tagOperator]: tags };
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Giai đoạn 3: Bốc ngẫu nhiên (Lưu ý: 1 Case Study tính là 1 câu hỏi lớn)
    pipeline.push({ $sample: { size: Number(numberOfQuestions) } });

    // Giai đoạn 4: Trả về hình thái nguyên vẹn
    pipeline.push({ $replaceRoot: { newRoot: '$questions' } });

    const selectedQuestions = await Quiz.aggregate(pipeline);

    if (selectedQuestions.length === 0) {
      return res.status(404).json({ msg: 'Không tìm thấy câu hỏi nào phù hợp với lựa chọn của bạn.' });
    }

    const virtualQuiz = {
      title: 'Buổi ôn tập tùy chỉnh',
      description: `Gồm ${selectedQuestions.length} tình huống/câu hỏi được chọn lọc.`,
      questions: selectedQuestions
    };

    res.json(virtualQuiz);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Lỗi Server');
  }
});

module.exports = router;