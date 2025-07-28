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

module.exports = router;