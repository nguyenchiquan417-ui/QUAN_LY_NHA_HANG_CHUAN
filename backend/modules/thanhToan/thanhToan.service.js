/**
 * SERVICE THANH TOÁN (thanhToan.service.js)
 * Xử lý thanh toán Tiền mặt, VietQR động, đóng phiên bàn và giải phóng bàn ăn (US-105 -> US-110)
 */
const thanhToanModel = require('./thanhToan.model');
const hoaDonModel = require('../hoaDon/hoaDon.model');
const banAnModel = require('../banAn/banAn.model');
const banAnService = require('../banAn/banAn.service');
const donGoiMonModel = require('../donGoiMon/donGoiMon.model');
const khuyenMaiModel = require('../khuyenMai/khuyenMai.model');
const { sinhAnhQrDataUrl, sinhUrlVietQrQuickLink, CAU_HINH_VIETQR_MAC_DINH } = require('../../tienIch/vietQr');

/**
 * US-106: Tạo mã thanh toán VietQR động theo mã hóa đơn và số tiền
 */
async function taoMaVietQrChoHoaDon(hoaDonId) {
    const hoaDon = await hoaDonModel.layTheoId(hoaDonId);
    if (!hoaDon) {
        const loi = new Error('Hóa đơn không tồn tại');
        loi.status = 404;
        throw loi;
    }

    if (hoaDon.trangThai === 'DaThanhToan') {
        const loi = new Error('Hóa đơn này đã được thanh toán thành công trước đó');
        loi.status = 400;
        throw loi;
    }

    const noiDungChuyenKhoan = `THANH TOAN ${hoaDon.maHoaDon} ${hoaDon.maBan}`;
    const soTien = hoaDon.tongTienThanhToan;

    const urlQuickLink = sinhUrlVietQrQuickLink({
        soTien,
        noiDungChuyenKhoan
    });

    const qrDataUrl = await sinhAnhQrDataUrl({
        soTien,
        noiDungChuyenKhoan
    });

    // Tạo bản ghi giao dịch chờ thanh toán nếu chưa có
    let giaoDich = (await thanhToanModel.layTatCa({ hoaDonId: hoaDon.id, phuongThuc: 'CHUYEN_KHOAN_VIETQR', trangThai: 'CHO_THANH_TOAN' }))[0];
    if (!giaoDich) {
        giaoDich = await thanhToanModel.taoMoi({
            hoaDonId: hoaDon.id,
            maHoaDon: hoaDon.maHoaDon,
            banId: hoaDon.banId,
            maBan: hoaDon.maBan,
            phuongThuc: 'CHUYEN_KHOAN_VIETQR',
            soTienCanThanhToan: soTien,
            noiDungChuyenKhoan,
            trangThai: 'CHO_THANH_TOAN'
        });
    }

    return {
        giaoDichId: giaoDich.id,
        maGiaoDich: giaoDich.maGiaoDich,
        hoaDon: {
            id: hoaDon.id,
            maHoaDon: hoaDon.maHoaDon,
            maBan: hoaDon.maBan,
            tenBan: hoaDon.tenBan,
            tongTienThanhToan: soTien
        },
        taiKhoanThuHuong: {
            nganHang: CAU_HINH_VIETQR_MAC_DINH.nganHang,
            binNganHang: CAU_HINH_VIETQR_MAC_DINH.binNganHang,
            soTaiKhoan: CAU_HINH_VIETQR_MAC_DINH.soTaiKhoan,
            tenChuTaiKhoan: CAU_HINH_VIETQR_MAC_DINH.tenChuTaiKhoan
        },
        soTien,
        noiDungChuyenKhoan,
        urlQuickLink,
        qrDataUrl
    };
}

/**
 * US-105 & US-107: Xử lý thanh toán Tiền mặt (nhập tiền khách đưa, tính tiền thừa)
 */
async function thanhToanTienMat({ hoaDonId, soTienKhachDua, thuNganId, tenThuNgan }) {
    const hoaDon = await hoaDonModel.layTheoId(hoaDonId);
    if (!hoaDon) {
        const loi = new Error('Hóa đơn không tồn tại');
        loi.status = 404;
        throw loi;
    }

    if (hoaDon.trangThai === 'DaThanhToan') {
        const loi = new Error('Hóa đơn này đã được thanh toán rồi');
        loi.status = 400;
        throw loi;
    }

    const tienCanThanhToan = hoaDon.tongTienThanhToan;
    const tienDua = Number(soTienKhachDua) || 0;

    if (tienDua < tienCanThanhToan) {
        const conThieu = tienCanThanhToan - tienDua;
        const loi = new Error(`Số tiền khách đưa không đủ. Còn thiếu ${conThieu.toLocaleString('vi-VN')}đ`);
        loi.status = 400;
        throw loi;
    }

    const soTienThua = tienDua - tienCanThanhToan;

    // 1. Tạo bản ghi giao dịch thanh toán thành công
    const giaoDich = await thanhToanModel.taoMoi({
        hoaDonId: hoaDon.id,
        maHoaDon: hoaDon.maHoaDon,
        banId: hoaDon.banId,
        maBan: hoaDon.maBan,
        phuongThuc: 'TIEN_MAT',
        soTienCanThanhToan: tienCanThanhToan,
        soTienKhachDua: tienDua,
        soTienThua,
        trangThai: 'THANH_CONG',
        thuNganId: thuNganId || null,
        tenThuNgan: tenThuNgan || 'Thu ngân'
    });

    // 2. Cập nhật hóa đơn thành DaThanhToan
    await hoaDonModel.capNhat(hoaDon.id, {
        trangThai: 'DaThanhToan',
        phuongThucThanhToan: 'TIEN_MAT',
        thoiGianThanhToan: new Date(),
        thuNganId: thuNganId || hoaDon.thuNganId,
        tenThuNgan: tenThuNgan || hoaDon.tenThuNgan
    });

    // 3. Tăng lượt sử dụng voucher nếu có
    if (hoaDon.maKhuyenMai) {
        const km = await khuyenMaiModel.layTheoMa(hoaDon.maKhuyenMai);
        if (km) {
            await khuyenMaiModel.tangSoLanSuDung(km.id);
        }
    }

    // 4. US-109 & US-110: Kiểm tra đóng phiên bàn và giải phóng bàn ăn
    await dongPhienVaGiaiPhongBan(hoaDon.banId);

    return {
        thanhCong: true,
        giaoDich,
        hoaDon: await hoaDonModel.layTheoId(hoaDon.id),
        soTienCanThanhToan: tienCanThanhToan,
        soTienKhachDua: tienDua,
        soTienThua,
        thongBao: `Thanh toán tiền mặt thành công! Tiền thừa gửi lại khách: ${soTienThua.toLocaleString('vi-VN')}đ`
    };
}

/**
 * US-107: Xác nhận hoàn tất thanh toán Chuyển khoản VietQR
 */
async function xacNhanThanhToanVietQr({ hoaDonId, maGiaoDichNganHang, thuNganId, tenThuNgan }) {
    const hoaDon = await hoaDonModel.layTheoId(hoaDonId);
    if (!hoaDon) {
        const loi = new Error('Hóa đơn không tồn tại');
        loi.status = 404;
        throw loi;
    }

    if (hoaDon.trangThai === 'DaThanhToan') {
        const loi = new Error('Hóa đơn này đã được thanh toán rồi');
        loi.status = 400;
        throw loi;
    }

    // Cập nhật giao dịch VietQR
    const giaoDichCho = (await thanhToanModel.layTatCa({ hoaDonId: hoaDon.id, phuongThuc: 'CHUYEN_KHOAN_VIETQR' }))[0];
    let giaoDich = null;

    if (giaoDichCho) {
        giaoDich = await thanhToanModel.capNhatTrangThai(giaoDichCho.id, 'THANH_CONG', {
            maGiaoDichNganHang: maGiaoDichNganHang || `BANK_REF_${Date.now()}`,
            soTienKhachDua: hoaDon.tongTienThanhToan,
            soTienThua: 0
        });
    } else {
        giaoDich = await thanhToanModel.taoMoi({
            hoaDonId: hoaDon.id,
            maHoaDon: hoaDon.maHoaDon,
            banId: hoaDon.banId,
            maBan: hoaDon.maBan,
            phuongThuc: 'CHUYEN_KHOAN_VIETQR',
            soTienCanThanhToan: hoaDon.tongTienThanhToan,
            soTienKhachDua: hoaDon.tongTienThanhToan,
            soTienThua: 0,
            maGiaoDichNganHang: maGiaoDichNganHang || `BANK_REF_${Date.now()}`,
            trangThai: 'THANH_CONG',
            thuNganId: thuNganId || null,
            tenThuNgan: tenThuNgan || 'Thu ngân'
        });
    }

    // Cập nhật hóa đơn
    await hoaDonModel.capNhat(hoaDon.id, {
        trangThai: 'DaThanhToan',
        phuongThucThanhToan: 'CHUYEN_KHOAN_VIETQR',
        thoiGianThanhToan: new Date(),
        thuNganId: thuNganId || hoaDon.thuNganId,
        tenThuNgan: tenThuNgan || hoaDon.tenThuNgan
    });

    // Tăng lượt sử dụng voucher nếu có
    if (hoaDon.maKhuyenMai) {
        const km = await khuyenMaiModel.layTheoMa(hoaDon.maKhuyenMai);
        if (km) {
            await khuyenMaiModel.tangSoLanSuDung(km.id);
        }
    }

    // US-109 & US-110: Đóng phiên và giải phóng bàn
    await dongPhienVaGiaiPhongBan(hoaDon.banId);

    return {
        thanhCong: true,
        giaoDich,
        hoaDon: await hoaDonModel.layTheoId(hoaDon.id),
        thongBao: 'Xác nhận chuyển khoản VietQR thành công! Bàn đã được hoàn tất thanh toán.'
    };
}

/**
 * US-109 & US-110: Đóng toàn bộ phiên phục vụ và đưa bàn về trạng thái 'Bàn trống' (Trong)
 */
async function dongPhienVaGiaiPhongBan(banId) {
    const ban = await banAnModel.layTheoId(banId);
    if (!ban) return;

    // Đóng toàn bộ các đơn đặt món của bàn (chuyển sang HOAN_THANH)
    await donGoiMonModel.dongDonCuaBan(banId);

    // Làm mới token bảo mật QR và chuyển trạng thái về "Trong"
    try {
        if (banAnService && banAnService.lamMoiTokenQr) {
            await banAnService.lamMoiTokenQr(banId);
        }
    } catch (err) {
        console.warn('Lỗi làm mới token QR:', err.message);
    }

    await banAnModel.capNhat(banId, {
        trangThai: 'Trong',
        daPhatSinhGiaoDich: false
    });
}

async function layLichSuGiaoDich(boLoc = {}) {
    return await thanhToanModel.layTatCa(boLoc);
}

module.exports = {
    taoMaVietQrChoHoaDon,
    thanhToanTienMat,
    xacNhanThanhToanVietQr,
    layLichSuGiaoDich,
    dongPhienVaGiaiPhongBan
};
