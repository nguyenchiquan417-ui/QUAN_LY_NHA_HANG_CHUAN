/**
 * SERVICE ĐƠN GỌI MÓN (donGoiMon.service.js)
 */
const donGoiMonModel = require('./donGoiMon.model');
const banAnModel = require('../banAn/banAn.model');
const khuVucModel = require('../khuVuc/khuVuc.model');

async function layDanhSachDon(boLoc = {}) {
    return await donGoiMonModel.layTatCa(boLoc);
}

async function layDonCuaBan(banId) {
    const ban = await banAnModel.layTheoId(banId);
    if (!ban) {
        const loi = new Error('Bàn ăn không tồn tại');
        loi.status = 404;
        throw loi;
    }
    const danhSachDon = await donGoiMonModel.layDonCuaBan(ban.id);

    let khuVucTen = 'Tầng 1 - Sảnh chính';
    if (ban.khuVucId) {
        const kv = await khuVucModel.layTheoId(ban.khuVucId);
        if (kv) khuVucTen = kv.tenKhuVuc || kv.ten || khuVucTen;
    }

    // Tính tổng tiền lũy kế của bàn (US-070)
    let tongTienLuyKe = 0;
    let tongSoMon = 0;
    const thongKe = {
        tongSoMon: 0,
        choXacNhan: 0,
        dangCheBien: 0,
        daXong: 0,
        daLenMon: 0,
        daHuy: 0,
        tuChoi: 0
    };

    danhSachDon.forEach(don => {
        if (don.tongTien === undefined && don.tongTienDon !== undefined) {
            don.tongTien = don.tongTienDon;
        } else if (don.tongTienDon === undefined && don.tongTien !== undefined) {
            don.tongTienDon = don.tongTien;
        }

        (don.danhSachMon || []).forEach(m => {
            const sl = Number(m.soLuong) || 1;
            const tt = Number(m.thanhTien) || (Number(m.donGia || m.gia || 0) * sl);

            if (m.trangThai !== 'DA_HUY' && m.trangThai !== 'TU_CHOI') {
                tongTienLuyKe += tt;
                tongSoMon += sl;
            }

            if (m.trangThai === 'CHO_XAC_NHAN') {
                thongKe.choXacNhan += sl;
            } else if (m.trangThai === 'DANG_CHE_BIEN') {
                thongKe.dangCheBien += sl;
            } else if (m.trangThai === 'DA_XONG' || m.trangThai === 'DA_NAU_XONG') {
                thongKe.daXong += sl;
            } else if (m.trangThai === 'DA_LEN_MON') {
                thongKe.daLenMon += sl;
            } else if (m.trangThai === 'DA_HUY') {
                thongKe.daHuy += sl;
            } else if (m.trangThai === 'TU_CHOI') {
                thongKe.tuChoi += sl;
            }
        });
    });

    thongKe.tongSoMon = tongSoMon;

    return {
        ban: {
            id: ban.id,
            maBan: ban.maBan,
            tenBan: ban.tenBan,
            khuVucId: ban.khuVucId,
            trangThai: ban.trangThai
        },
        soBan: ban.tenBan || ban.maBan,
        khuVucTen,
        tongSoDon: danhSachDon.length,
        tongSoMon,
        tongTienLuyKe,
        thongKe,
        danhSachDon
    };
}

async function taoDonGoiMon(duLieu) {
    const ban = await banAnModel.layTheoId(duLieu.banId);
    if (!ban) {
        const loi = new Error('Bàn ăn không tồn tại');
        loi.status = 404;
        throw loi;
    }

    if (ban.trangThai === 'TamKhoa') {
        const loi = new Error('Bàn này đang tạm khóa phục vụ');
        loi.status = 403;
        throw loi;
    }

    // Đổi trạng thái bàn thành Đang phục vụ nếu bàn đang trống
    if (ban.trangThai === 'Trong') {
        await banAnModel.capNhat(ban.id, {
            trangThai: 'DangPhucVu',
            daPhatSinhGiaoDich: true
        });
    }

    let khuVucTen = '';
    if (ban.khuVucId) {
        const kv = await khuVucModel.layTheoId(ban.khuVucId);
        if (kv) khuVucTen = kv.tenKhuVuc || kv.ten || '';
    }

    const duLieuDayDu = {
        ...duLieu,
        banId: ban.id,
        maBan: ban.maBan,
        tenBan: ban.tenBan,
        khuVucId: ban.khuVucId,
        tenKhuVuc: khuVucTen
    };

    return await donGoiMonModel.taoDon(duLieuDayDu);
}

async function capNhatTrangThaiMon(itemId, trangThaiMoi) {
    if (trangThaiMoi === 'DA_XONG') trangThaiMoi = 'DA_NAU_XONG';
    const cacTrangThaiHopLe = ['CHO_XAC_NHAN', 'DANG_CHE_BIEN', 'DA_NAU_XONG', 'DA_LEN_MON', 'DA_HUY'];
    if (!cacTrangThaiHopLe.includes(trangThaiMoi)) {
        const loi = new Error(`Trạng thái không hợp lệ. Phải là một trong: ${cacTrangThaiHopLe.join(', ')}`);
        loi.status = 400;
        throw loi;
    }

    const kq = await donGoiMonModel.capNhatTrangThaiMon(itemId, trangThaiMoi);
    if (!kq) {
        const loi = new Error('Không tìm thấy món ăn trong các đơn đặt hàng');
        loi.status = 404;
        throw loi;
    }
    return kq;
}

async function huyMon(itemId, lyDo) {
    return await donGoiMonModel.huyMon(itemId, lyDo);
}

async function chuyenBan(duLieu) {
    const { banNguonId, banDichId, lyDo } = duLieu;
    const banNguon = await banAnModel.layTheoId(banNguonId);
    const banDich = await banAnModel.layTheoId(banDichId);
    if (!banNguon || !banDich) {
        const err = new Error('Bàn nguồn hoặc bàn đích không tồn tại');
        err.status = 404;
        throw err;
    }

    let khuVucTen = '';
    if (banDich.khuVucId) {
        const kv = await khuVucModel.layTheoId(banDich.khuVucId);
        if (kv) khuVucTen = kv.tenKhuVuc || kv.ten || '';
    }

    // Chuyển toàn bộ đơn hàng sang bàn đích
    const cacDonChuyen = await donGoiMonModel.chuyenBan(banNguonId, banDichId, {
        soBan: banDich.tenBan || banDich.maBan,
        khuVucId: banDich.khuVucId,
        khuVucTen
    });

    // Cập nhật trạng thái bàn ăn trong DB: Bàn nguồn về Trong, bàn đích sang DangPhucVu
    await banAnModel.capNhat(banNguonId, { trangThai: 'Trong', daPhatSinhGiaoDich: false });
    await banAnModel.capNhat(banDichId, { trangThai: 'DangPhucVu', daPhatSinhGiaoDich: true });

    return {
        thanhCong: true,
        soDonChuyen: cacDonChuyen.length,
        banNguonId,
        banDichId
    };
}

async function ghepBan(duLieu) {
    const { cacBanPhuIds, banChinhId } = duLieu;
    const banChinh = await banAnModel.layTheoId(banChinhId);
    if (!banChinh) {
        const err = new Error('Bàn chính không tồn tại');
        err.status = 404;
        throw err;
    }

    let khuVucTen = '';
    if (banChinh.khuVucId) {
        const kv = await khuVucModel.layTheoId(banChinh.khuVucId);
        if (kv) khuVucTen = kv.tenKhuVuc || kv.ten || '';
    }

    const cacDonGhep = await donGoiMonModel.ghepBan(cacBanPhuIds, banChinhId, {
        soBan: banChinh.tenBan || banChinh.maBan,
        khuVucId: banChinh.khuVucId,
        khuVucTen
    });

    // Trả tất cả bàn phụ về Trống
    for (const bId of (cacBanPhuIds || [])) {
        await banAnModel.capNhat(bId, { trangThai: 'Trong', daPhatSinhGiaoDich: false });
    }
    await banAnModel.capNhat(banChinhId, { trangThai: 'DangPhucVu', daPhatSinhGiaoDich: true });

    return {
        thanhCong: true,
        soDonGhep: cacDonGhep.length,
        cacBanPhuIds,
        banChinhId
    };
}

module.exports = {
    layDanhSachDon,
    layDonCuaBan,
    taoDonGoiMon,
    capNhatTrangThaiMon,
    huyMon,
    chuyenBan,
    ghepBan
};
