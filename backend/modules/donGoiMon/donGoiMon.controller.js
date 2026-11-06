const donGoiMonService = require('./donGoiMon.service');
const { phanHoiThanhCong } = require('../../tienIch/dinhDangPhanHoi');

async function layDanhSach(req, res, next) {
    try {
        const { banId, trangThai } = req.query;
        const ketQua = await donGoiMonService.layDanhSachDon({ banId, trangThai });
        return phanHoiThanhCong(res, ketQua, 'Lấy danh sách đơn đặt món thành công');
    } catch (e) {
        next(e);
    }
}

async function layDonTheoBan(req, res, next) {
    try {
        const { banId } = req.params;
        const ketQua = await donGoiMonService.layDonCuaBan(banId);
        return phanHoiThanhCong(res, ketQua, `Lấy toàn bộ các lượt gọi món của bàn thành công`);
    } catch (e) {
        next(e);
    }
}

async function taoDonMoi(req, res, next) {
    try {
        const ketQua = await donGoiMonService.taoDonGoiMon(req.body);
        return phanHoiThanhCong(res, ketQua, 'Đặt món thành công! Đơn đã chuyển xuống Bếp xử lý.', 201);
    } catch (e) {
        next(e);
    }
}

async function capNhatTrangThaiMon(req, res, next) {
    try {
        const { itemId } = req.params;
        const { trangThai } = req.body;
        const ketQua = await donGoiMonService.capNhatTrangThaiMon(itemId, trangThai);
        return phanHoiThanhCong(res, ketQua, `Cập nhật trạng thái món thành '${trangThai}' thành công`);
    } catch (e) {
        next(e);
    }
}

async function huyMon(req, res, next) {
    try {
        const { itemId } = req.params;
        const { lyDo } = req.body;
        const ketQua = await donGoiMonService.huyMon(itemId, lyDo);
        return phanHoiThanhCong(res, ketQua, 'Hủy món thành công, đã hoàn trừ tiền');
    } catch (e) {
        next(e);
    }
}

async function chuyenBan(req, res, next) {
    try {
        const ketQua = await donGoiMonService.chuyenBan(req.body);
        return phanHoiThanhCong(res, ketQua, 'Chuyển bàn thành công');
    } catch (e) {
        next(e);
    }
}

async function ghepBan(req, res, next) {
    try {
        const ketQua = await donGoiMonService.ghepBan(req.body);
        return phanHoiThanhCong(res, ketQua, 'Ghép bàn thành công');
    } catch (e) {
        next(e);
    }
}

module.exports = {
    layDanhSach,
    layDonTheoBan,
    taoDonMoi,
    capNhatTrangThaiMon,
    huyMon,
    chuyenBan,
    ghepBan
};
