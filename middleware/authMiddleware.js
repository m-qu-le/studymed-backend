// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Middleware để xác thực token JWT
module.exports = function (req, res, next) {
  // 1. Lấy token từ header Authorization
  // Thông thường token được gửi dưới dạng: "Bearer TOKEN_STRING"
  const authHeader = req.header('Authorization'); // Lấy toàn bộ giá trị của header Authorization
  
  // Kiểm tra xem header Authorization có tồn tại và bắt đầu bằng "Bearer " không
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Nếu không có header Authorization hoặc không đúng định dạng "Bearer ", trả về lỗi 401
    return res.status(401).json({ msg: 'Không có token hợp lệ, ủy quyền bị từ chối' });
  }

  // Lấy chuỗi token thực sự bằng cách loại bỏ "Bearer "
  const token = authHeader.split(' ')[1]; // Tách chuỗi tại khoảng trắng và lấy phần tử thứ hai

  // 2. Kiểm tra nếu không có token sau khi tách (trường hợp hiếm nhưng để đảm bảo)
  if (!token) {
    return res.status(401).json({ msg: 'Token không tìm thấy, ủy quyền bị từ chối' });
  }

  // 3. Xác minh token
  try {
    // jwt.verify() sẽ giải mã token bằng JWT_SECRET của chúng ta
    // Nếu thành công, nó sẽ trả về payload (chứa user id và role)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Gán thông tin người dùng từ token vào đối tượng request (req.user)
    // để các route handler tiếp theo có thể truy cập thông tin người dùng
    req.user = decoded.user;
    next(); // Chuyển điều khiển sang middleware hoặc route handler tiếp theo
  } catch (err) {
    // Nếu token không hợp lệ (ví dụ: hết hạn, sai secret)
    res.status(401).json({ msg: 'Token không hợp lệ' });
  }
};