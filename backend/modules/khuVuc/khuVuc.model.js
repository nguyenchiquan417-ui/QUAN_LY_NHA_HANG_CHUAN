const { docDuLieu, ghiDuLieu } = require('../../tienIch/luuTruDuLieu');

const duLieuKhuVucMacDinh = [];

let danhSachKhuVuc = docDuLieu('khuVuc', duLieuKhuVucMacDinh);
let tuTangId = Math.max(...danhSachKhuVuc.map(kv => kv.id || 0), 0) + 1;

function luu() {
    ghiDuLieu('khuVuc', danhSachKhuVuc);
}

async function layTatCa() {
    return danhSachKhuVuc.filter(kv => kv.trangThai !== 'DaXoa');
}

async function layTheoId(id) {
    return danhSachKhuVuc.find(kv => kv.id === Number(id) && kv.trangThai !== 'DaXoa') || null;
}

async function layTheoTen(tenKhuVuc) {
    return danhSachKhuVuc.find(
        kv => kv.tenKhuVuc.toLowerCase() === tenKhuVuc.toLowerCase().trim() && kv.trangThai !== 'DaXoa'
    ) || null;
}

async function taoMoi(duLieu) {
    const banGhiMoi = {
        id: tuTangId++,
        tenKhuVuc: duLieu.tenKhuVuc.trim(),
        ghiChu: duLieu.ghiChu ? duLieu.ghiChu.trim() : '',
        trangThai: 'HoatDong',
        ngayTao: new Date(),
        ngayCapNhat: new Date()
    };
    danhSachKhuVuc.push(banGhiMoi);
    luu();
    return banGhiMoi;
}

async function capNhat(id, duLieu) {
    const viTri = danhSachKhuVuc.findIndex(kv => kv.id === Number(id) && kv.trangThai !== 'DaXoa');
    if (viTri === -1) return null;

    danhSachKhuVuc[viTri] = {
        ...danhSachKhuVuc[viTri],
        tenKhuVuc: duLieu.tenKhuVuc !== undefined ? duLieu.tenKhuVuc.trim() : danhSachKhuVuc[viTri].tenKhuVuc,
        ghiChu: duLieu.ghiChu !== undefined ? duLieu.ghiChu.trim() : danhSachKhuVuc[viTri].ghiChu,
        trangThai: duLieu.trangThai || danhSachKhuVuc[viTri].trangThai,
        ngayCapNhat: new Date()
    };
    luu();
    return danhSachKhuVuc[viTri];
}

async function xoa(id) {
    const viTri = danhSachKhuVuc.findIndex(kv => kv.id === Number(id));
    if (viTri === -1) return false;
    danhSachKhuVuc[viTri].trangThai = 'DaXoa';
    danhSachKhuVuc[viTri].ngayCapNhat = new Date();
    luu();
    return true;
}

async function dongBoDanhSach(danhSachMoi) {
    if (!Array.isArray(danhSachMoi)) return danhSachKhuVuc;
    danhSachKhuVuc = danhSachMoi.map((kv, idx) => ({
        id: Number(kv.id) || (idx + 1),
        tenKhuVuc: (kv.tenKhuVuc || kv.ten || `Khu vực ${kv.id}`).trim(),
        ghiChu: (kv.ghiChu || '').trim(),
        trangThai: kv.trangThai || 'HoatDong',
        ngayTao: kv.ngayTao ? new Date(kv.ngayTao) : new Date(),
        ngayCapNhat: new Date()
    }));
    tuTangId = Math.max(...danhSachKhuVuc.map(kv => kv.id || 0), 0) + 1;
    luu();
    return danhSachKhuVuc;
}

module.exports = {
    layTatCa,
    layTheoId,
    layTheoTen,
    taoMoi,
    capNhat,
    xoa,
    dongBoDanhSach
};
