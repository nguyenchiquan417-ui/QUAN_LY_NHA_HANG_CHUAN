const { docDuLieu, ghiDuLieu } = require('../../tienIch/luuTruDuLieu');

const duLieuDanhMucMacDinh = [];

let danhSachDanhMuc = docDuLieu('danhMucMon', duLieuDanhMucMacDinh);
let tuTangId = Math.max(...danhSachDanhMuc.map(dm => dm.id || 0), 0) + 1;

function luu() {
    ghiDuLieu('danhMucMon', danhSachDanhMuc);
}

async function layTatCa() {
    return danhSachDanhMuc
        .filter(dm => dm.trangThai !== 'DaXoa')
        .sort((a, b) => (a.thuTuHienThi || a.thuTu || 0) - (b.thuTuHienThi || b.thuTu || 0));
}

async function layTheoId(id) {
    return danhSachDanhMuc.find(dm => dm.id === Number(id) && dm.trangThai !== 'DaXoa') || null;
}

async function layTheoTen(tenDanhMuc) {
    return danhSachDanhMuc.find(
        dm => (dm.tenDanhMuc || dm.ten || '').toLowerCase() === tenDanhMuc.toLowerCase().trim() && dm.trangThai !== 'DaXoa'
    ) || null;
}

async function taoMoi(duLieu) {
    const banGhiMoi = {
        id: tuTangId++,
        tenDanhMuc: duLieu.tenDanhMuc ? duLieu.tenDanhMuc.trim() : (duLieu.ten ? duLieu.ten.trim() : 'Danh mục mới'),
        bieuTuong: duLieu.bieuTuong || '🍽️',
        thuTuHienThi: duLieu.thuTuHienThi || duLieu.thuTu || danhSachDanhMuc.length + 1,
        trangThai: 'HoatDong',
        ngayTao: new Date(),
        ngayCapNhat: new Date()
    };
    danhSachDanhMuc.push(banGhiMoi);
    luu();
    return banGhiMoi;
}

async function capNhat(id, duLieu) {
    const viTri = danhSachDanhMuc.findIndex(dm => dm.id === Number(id) && dm.trangThai !== 'DaXoa');
    if (viTri === -1) return null;

    danhSachDanhMuc[viTri] = {
        ...danhSachDanhMuc[viTri],
        tenDanhMuc: duLieu.tenDanhMuc !== undefined ? duLieu.tenDanhMuc.trim() : (duLieu.ten !== undefined ? duLieu.ten.trim() : danhSachDanhMuc[viTri].tenDanhMuc),
        bieuTuong: duLieu.bieuTuong !== undefined ? duLieu.bieuTuong : danhSachDanhMuc[viTri].bieuTuong,
        thuTuHienThi: duLieu.thuTuHienThi !== undefined ? Number(duLieu.thuTuHienThi) : (duLieu.thuTu !== undefined ? Number(duLieu.thuTu) : danhSachDanhMuc[viTri].thuTuHienThi),
        trangThai: duLieu.trangThai || danhSachDanhMuc[viTri].trangThai,
        ngayCapNhat: new Date()
    };
    luu();
    return danhSachDanhMuc[viTri];
}

async function xoa(id) {
    const viTri = danhSachDanhMuc.findIndex(dm => dm.id === Number(id));
    if (viTri === -1) return false;
    danhSachDanhMuc[viTri].trangThai = 'DaXoa';
    danhSachDanhMuc[viTri].ngayCapNhat = new Date();
    luu();
    return true;
}

async function dongBoDanhSach(danhSachMoi) {
    if (!Array.isArray(danhSachMoi)) return danhSachDanhMuc;
    danhSachDanhMuc = danhSachMoi.map((dm, idx) => ({
        id: Number(dm.id) || (idx + 1),
        tenDanhMuc: (dm.tenDanhMuc || dm.ten || `Danh mục ${dm.id}`).trim(),
        bieuTuong: dm.bieuTuong || '🍽️',
        thuTuHienThi: Number(dm.thuTuHienThi || dm.thuTu) || (idx + 1),
        trangThai: dm.trangThai || 'HoatDong',
        ngayTao: dm.ngayTao ? new Date(dm.ngayTao) : new Date(),
        ngayCapNhat: new Date()
    }));
    tuTangId = Math.max(...danhSachDanhMuc.map(dm => dm.id || 0), 0) + 1;
    luu();
    return danhSachDanhMuc;
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
