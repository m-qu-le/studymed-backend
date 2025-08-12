// server/routes/api/study.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/authMiddleware');
const Quiz = require('../../models/Quiz');

// @route   GET api/study/filters
// @desc    Lấy tất cả các tag và độ khó duy nhất để làm bộ lọc
// @access  Private
// GIỮ NGUYÊN: Route này đã được tối ưu bằng aggregation, hoạt động rất hiệu quả.
router.get('/filters', auth, async (req, res) => {
  try {
    // Sử dụng aggregation để lấy tag từ cả câu hỏi đơn và câu hỏi con
    const tagsResult = await Quiz.aggregate([
      { $project: { questions: 1 } },
      { $unwind: '$questions' },
      {
        $project: {
          itemTags: {
            $cond: {
              if: { $eq: ['$questions.type', 'single'] },
              then: '$questions.tags',
              else: '$questions.childQuestions.tags'
            }
          }
        }
      },
      { $unwind: '$itemTags' },
      { $unwind: '$itemTags' },
      { $group: { _id: null, uniqueTags: { $addToSet: '$itemTags' } } }
    ]);

    const tags = tagsResult.length > 0 ? tagsResult[0].uniqueTags.sort() : [];
    const difficulties = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];

    res.json({ tags, difficulties });
  } catch (err) {
    console.error('Error fetching filters:', err.message);
    res.status(500).send('Lỗi Server');
  }
});


// @route   POST api/study/session
// @desc    Tạo một buổi ôn tập (bộ đề ảo) dựa trên các bộ lọc
// @access  Private
// ĐÃ SỬA: Thay thế hoàn toàn logic cũ bằng Aggregation Pipeline để tối ưu hiệu năng.
router.post('/session', auth, async (req, res) => {
  const { tags, difficulties, numberOfQuestions, tagFilterMode = 'any' } = req.body;

  try {
    const pipeline = [];

    // Giai đoạn 1: Tách mảng questions ra
    pipeline.push({ $unwind: '$questions' });

    // Giai đoạn 2: Hợp nhất câu hỏi đơn và câu hỏi con vào một trường duy nhất
    pipeline.push({
      $project: {
        unifiedQuestion: {
          $cond: {
            if: { $eq: ['$questions.type', 'group'] },
            then: '$questions.childQuestions', // Nếu là group, lấy mảng câu hỏi con
            else: ['$questions'] // Nếu là single, tạo mảng chứa chính nó
          }
        }
      }
    });
    
    // Giai đoạn 3: Tách mảng hợp nhất để có danh sách phẳng cuối cùng
    pipeline.push({ $unwind: '$unifiedQuestion' });

    // Giai đoạn 4: Xây dựng và áp dụng điều kiện lọc
    const matchConditions = {};
    if (difficulties && difficulties.length > 0) {
      matchConditions['unifiedQuestion.difficulty'] = { $in: difficulties };
    }
    if (tags && tags.length > 0) {
      const tagOperator = tagFilterMode === 'all' ? '$all' : '$in';
      matchConditions['unifiedQuestion.tags'] = { [tagOperator]: tags };
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Giai đoạn 5: Lấy số lượng câu hỏi ngẫu nhiên
    pipeline.push({ $sample: { size: Number(numberOfQuestions) } });

    // Giai đoạn 6: Làm sạch cấu trúc kết quả trả về
    pipeline.push({ $replaceRoot: { newRoot: '$unifiedQuestion' } });

    // Thực thi pipeline
    const selectedQuestions = await Quiz.aggregate(pipeline);

    if (selectedQuestions.length === 0) {
      return res.status(404).json({ msg: 'Không tìm thấy câu hỏi nào phù hợp với lựa chọn của bạn.' });
    }

    // Tạo bộ đề ảo để gửi về frontend
    const virtualQuiz = {
      title: 'Buổi ôn tập tùy chỉnh',
      description: `Gồm ${selectedQuestions.length} câu hỏi được chọn lọc.`,
      questions: selectedQuestions
    };

    res.json(virtualQuiz);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Lỗi Server');
  }
});

module.exports = router;