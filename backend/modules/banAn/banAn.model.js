const { taoTokenBaoMatQr } = require('../../tienIch/taoMaQr');
const { docDuLieu, ghiDuLieu } = require('../../tienIch/luuTruDuLieu');

const duLieuBanMacDinh = [];

let danhSachBanAn = docDuLieu('banAn', duLieuBanMacDinh);
let tuTangId = Math.max(...danhSachBanAn.map(b => b.id || 0), 0) + 1;

function luu() {
    ghiDuLieu('banAn', danhSachBanAn);
}

async function layTatCa({ khuVucId, trangThai } = {}) {
    let ketQua = danhSachBanAn.filter(b => b.trangThai !== 'DaXoa');
    if (khuVucId) {
        ketQua = ketQua.filter(b => b.khuVucId === Number(khuVucId));
    }
    if (trangThai) {
        ketQua = ketQua.filter(b => b.trangThai === trangThai);
    }
    return ketQua;
}

async function layTheoId(id) {
    if (!id) return null;
    const str = String(id).toLowerCase().trim();
    return danhSachBanAn.find(
        b => (b.id === Number(id) || 
              (b.maBan && b.maBan.toLowerCase() === str) ||
              (b.tenBan && b.tenBan.toLowerCase() === str) ||
              (b.soBan && b.soBan.toLowerCase() === str)) && b.trangThai !== 'DaXoa'
    ) || null;
}

async function layTheoMaBan(maBan) {
    if (!maBan) return null;
    const str = maBan.toLowerCase().trim();
    return danhSachBanAn.find(
        b => (b.maBan.toLowerCase() === str || (b.tenBan && b.tenBan.toLowerCase() === str) || (b.soBan && b.soBan.toLowerCase() === str)) && b.trangThai !== 'DaXoa'
    ) || null;
}

async function taoMoi(duLieu) {
    const banGhiMoi = {
        id: tuTangId++,
        maBan: duLieu.maBan.trim().toUpperCase(),
        tenBan: duLieu.tenBan.trim(),
        soBan: duLieu.soBan ? duLieu.soBan.trim() : duLieu.tenBan.trim(),
        khuVucId: Number(duLieu.khuVucId),
        sucChua: Number(duLieu.sucChua) || 4,
        tokenBaoMat: taoTokenBaoMatQr(),
        qrToken: taoTokenBaoMatQr(),
        trangThai: duLieu.trangThai || 'Trong',
        daPhatSinhGiaoDich: false,
        ghiChu: duLieu.ghiChu || '',
        ngayTao: new Date(),
        ngayCapNhat: new Date()
    };
    danhSachBanAn.push(banGhiMoi);
    luu();
    return banGhiMoi;
}

async function capNhat(id, duLieu) {
    const viTri = danhSachBanAn.findIndex(b => (b.id === Number(id) || (b.maBan && b.maBan.toUpperCase() === String(id).toUpperCase().trim())) && b.trangThai !== 'DaXoa');
    if (viTri === -1) return null;

    danhSachBanAn[viTri] = {
        ...danhSachBanAn[viTri],
        maBan: duLieu.maBan !== undefined ? duLieu.maBan.trim().toUpperCase() : danhSachBanAn[viTri].maBan,
        tenBan: duLieu.tenBan !== undefined ? duLieu.tenBan.trim() : danhSachBanAn[viTri].tenBan,
        soBan: duLieu.soBan !== undefined ? duLieu.soBan.trim() : (duLieu.tenBan !== undefined ? duLieu.tenBan.trim() : danhSachBanAn[viTri].soBan),
        khuVucId: duLieu.khuVucId !== undefined ? Number(duLieu.khuVucId) : danhSachBanAn[viTri].khuVucId,
        sucChua: duLieu.sucChua !== undefined ? Number(duLieu.sucChua) : danhSachBanAn[viTri].sucChua,
        trangThai: duLieu.trangThai || danhSachBanAn[viTri].trangThai,
        ghiChu: duLieu.ghiChu !== undefined ? duLieu.ghiChu : danhSachBanAn[viTri].ghiChu,
        ngayCapNhat: new Date()
    };
    luu();
    return danhSachBanAn[viTri];
}

async function lamMoiToken(id, tokenMoi) {
    const ban = await layTheoId(id);
    if (!ban) return null;
    ban.tokenBaoMat = tokenMoi;
    ban.qrToken = tokenMoi;
    ban.ngayCapNhat = new Date();
    luu();
    return ban;
}

async function xoa(id) {
    const viTri = danhSachBanAn.findIndex(b => b.id === Number(id));
    if (viTri === -1) return false;
    danhSachBanAn[viTri].trangThai = 'DaXoa';
    danhSachBanAn[viTri].ngayCapNhat = new Date();
    luu();
    return true;
}

async function dongBoDanhSach(danhSachMoi) {
    if (!Array.isArray(danhSachMoi)) return danhSachBanAn;
    danhSachBanAn = danhSachMoi.map((b, idx) => ({
        id: Number(b.id) || (idx + 1),
        maBan: (b.maBan || `B${b.id || (idx + 1)}`).toUpperCase().trim(),
        tenBan: (b.tenBan || b.soBan || `Bàn ${b.id}`).trim(),
        soBan: (b.soBan || b.tenBan || `Bàn ${b.id}`).trim(),
        khuVucId: Number(b.khuVucId) || 1,
        sucChua: Number(b.sucChua) || 4,
        tokenBaoMat: b.qrToken || b.tokenBaoMat || `tok_b${b.id}`,
        qrToken: b.qrToken || b.tokenBaoMat || `tok_b${b.id}`,
        trangThai: (b.trangThai === 'DANG_DUNG' || b.trangThai === 'DangDung' || b.trangThai === 'DangPhucVu') ? 'DangPhucVu' : (b.trangThai === 'TAM_KHOA' || b.trangThai === 'TamKhoa' ? 'TamKhoa' : (b.trangThai === 'CHO_THANH_TOAN' || b.trangThai === 'ChoThanhToan' ? 'ChoThanhToan' : 'Trong')),
        daPhatSinhGiaoDich: Boolean(b.daPhatSinhGiaoDich),
        ghiChu: b.ghiChu || '',
        ngayTao: b.ngayTao ? new Date(b.ngayTao) : new Date(),
        ngayCapNhat: new Date()
    }));
    tuTangId = Math.max(...danhSachBanAn.map(b => b.id || 0), 0) + 1;
    luu();
    return danhSachBanAn;
}

module.exports = {
    layTatCa,
    layTheoId,
    layTheoMaBan,
    taoMoi,
    capNhat,
    lamMoiToken,
    xoa,
    dongBoDanhSach
};
