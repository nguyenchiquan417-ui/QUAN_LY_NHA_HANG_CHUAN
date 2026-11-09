const { docDuLieu, ghiDuLieu } = require('../../tienIch/luuTruDuLieu');

const duLieuKhuVucMacDinh = [
    { id: 1, ma: 'KV_1', ten: 'Tầng 1', tenKhuVuc: 'Tầng 1', ghiChu: 'Khu vực tầng 1 trong nhà', thuTu: 1, trangThai: 'HoatDong' },
    { id: 2, ma: 'KV_2', ten: 'Tầng 2', tenKhuVuc: 'Tầng 2', ghiChu: 'Khu vực tầng 2 lầu cao', thuTu: 2, trangThai: 'HoatDong' },
    { id: 3, ma: 'KV_3', ten: 'Ngoài trời', tenKhuVuc: 'Ngoài trời', ghiChu: 'Khu vực sân vườn ngoài trời thoáng mát', thuTu: 3, trangThai: 'HoatDong' },
    { id: 4, ma: 'KV_4', ten: 'Phòng VIP', tenKhuVuc: 'Phòng VIP', ghiChu: 'Khu vực phòng VIP máy lạnh riêng tư', thuTu: 4, trangThai: 'HoatDong' }
];

let danhSachKhuVuc = docDuLieu('khuVuc', duLieuKhuVucMacDinh);
if (!Array.isArray(danhSachKhuVuc) || danhSachKhuVuc.length === 0) {
    danhSachKhuVuc = [...duLieuKhuVucMacDinh];
    ghiDuLieu('khuVuc', danhSachKhuVuc);
}
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
