const express = require('express');
const router = express.Router();
const thanhToanController = require('./thanhToan.controller');
const thanhToanValidation = require('./thanhToan.validation');

// Lấy lịch sử giao dịch
router.get('/lich-su', thanhToanController.layLichSu);

// US-106: Sinh mã VietQR động cho hóa đơn
router.get('/viet-qr/:hoaDonId', thanhToanValidation.kiemTraTaoVietQr, thanhToanController.taoVietQr);

// US-105: Xử lý thanh toán Tiền mặt
router.post('/tien-mat', thanhToanValidation.kiemTraThanhToanTienMat, thanhToanController.thanhToanTienMat);

// US-107: Xác nhận thanh toán VietQR
router.post('/xac-nhan-viet-qr', thanhToanValidation.kiemTraXacNhanVietQr, thanhToanController.xacNhanVietQr);

// US-110: Giải phóng bàn ăn và đóng toàn bộ đơn sau thanh toán
router.post('/giai-phong-ban/:banId', thanhToanController.giaiPhongBan);

module.exports = router;
