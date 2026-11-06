const thanhToanService = require('./thanhToan.service');
const { phanHoiThanhCong } = require('../../tienIch/dinhDangPhanHoi');

async function taoVietQr(req, res, next) {
    try {
        const { hoaDonId } = req.params;
        const ketQua = await thanhToanService.taoMaVietQrChoHoaDon(hoaDonId);
        return phanHoiThanhCong(res, ketQua, 'Tạo mã thanh toán VietQR động thành công');
    } catch (e) {
        next(e);
    }
}

async function thanhToanTienMat(req, res, next) {
    try {
        const ketQua = await thanhToanService.thanhToanTienMat(req.body);
        return phanHoiThanhCong(res, ketQua, ketQua.thongBao);
    } catch (e) {
        next(e);
    }
}

async function xacNhanVietQr(req, res, next) {
    try {
        const ketQua = await thanhToanService.xacNhanThanhToanVietQr(req.body);
        return phanHoiThanhCong(res, ketQua, ketQua.thongBao);
    } catch (e) {
        next(e);
    }
}

async function layLichSu(req, res, next) {
    try {
        const { hoaDonId, banId, phuongThuc, trangThai } = req.query;
        const ketQua = await thanhToanService.layLichSuGiaoDich({ hoaDonId, banId, phuongThuc, trangThai });
        return phanHoiThanhCong(res, ketQua, 'Lấy lịch sử giao dịch thanh toán thành công');
    } catch (e) {
        next(e);
    }
}

async function giaiPhongBan(req, res, next) {
    try {
        const { banId } = req.params;
        await thanhToanService.dongPhienVaGiaiPhongBan(banId);
        return phanHoiThanhCong(res, { banId: Number(banId), trangThai: 'Trong' }, 'Giải phóng bàn ăn và đóng toàn bộ đơn thành công');
    } catch (e) {
        next(e);
    }
}

module.exports = {
    taoVietQr,
    thanhToanTienMat,
    xacNhanVietQr,
    layLichSu,
    giaiPhongBan
};
