const { docDuLieu, ghiDuLieu } = require('../../tienIch/luuTruDuLieu');

const duLieuThucDonMacDinh = [];

let danhSachMonAn = docDuLieu('thucDon', duLieuThucDonMacDinh);
let tuTangId = Math.max(...danhSachMonAn.map(m => m.id || 0), 0) + 1;

function luu() {
    ghiDuLieu('thucDon', danhSachMonAn);
}

async function layDanhSach({ danhMucId, trangThai, tuKhoa, giaTu, giaDen, trang = 1, soLuong = 20, chiLayDangBan = false } = {}) {
    let ketQua = danhSachMonAn.filter(m => m.trangThai !== 'DaXoa');

    if (chiLayDangBan) {
        ketQua = ketQua.filter(m => m.trangThai === 'DangBan');
    }

    if (danhMucId) {
        ketQua = ketQua.filter(m => m.danhMucId === Number(danhMucId));
    }

    if (trangThai) {
        ketQua = ketQua.filter(m => m.trangThai === trangThai);
    }

    if (tuKhoa) {
        const tuKhoaChuan = tuKhoa.toLowerCase().trim();
        ketQua = ketQua.filter(m => (m.tenMon && m.tenMon.toLowerCase().includes(tuKhoaChuan)) || (m.moTa && m.moTa.toLowerCase().includes(tuKhoaChuan)));
    }

    if (giaTu !== undefined && !isNaN(Number(giaTu))) {
        ketQua = ketQua.filter(m => m.giaBan >= Number(giaTu));
    }

    if (giaDen !== undefined && !isNaN(Number(giaDen))) {
        ketQua = ketQua.filter(m => m.giaBan <= Number(giaDen));
    }

    const tongSo = ketQua.length;
    const soLuongNum = Number(soLuong) || 20;
    const trangNum = Number(trang) || 1;
    const tongSoTrang = Math.ceil(tongSo / soLuongNum) || 1;
    const viTriBatDau = (trangNum - 1) * soLuongNum;
    const duLieuTrang = ketQua.slice(viTriBatDau, viTriBatDau + soLuongNum);

    return {
        danhSach: duLieuTrang,
        phanTrang: {
            trangHienTai: trangNum,
            soLuongMoiTrang: soLuongNum,
            tongSoBanGhi: tongSo,
            tongSoTrang
        }
    };
}

async function layTheoId(id) {
    if (!id) return null;
    return danhSachMonAn.find(m => (m.id === Number(id) || (m.maMon && m.maMon.toLowerCase() === String(id).toLowerCase().trim())) && m.trangThai !== 'DaXoa') || null;
}

async function layTheoTen(tenMon) {
    if (!tenMon) return null;
    return danhSachMonAn.find(m => m.tenMon && m.tenMon.toLowerCase() === tenMon.toLowerCase().trim() && m.trangThai !== 'DaXoa') || null;
}

async function taoMoi(duLieu) {
    const banGhiMoi = {
        id: tuTangId++,
        maMon: duLieu.maMon || `MON-${tuTangId}`,
        tenMon: duLieu.tenMon.trim(),
        danhMucId: Number(duLieu.danhMucId),
        giaBan: Number(duLieu.giaBan),
        donViTinh: duLieu.donViTinh ? duLieu.donViTinh.trim() : 'Phần',
        hinhAnh: duLieu.hinhAnh || '',
        moTa: duLieu.moTa ? duLieu.moTa.trim() : '',
        trangThai: duLieu.trangThai || 'DangBan',
        laMonBanChay: Boolean(duLieu.laMonBanChay),
        tuyChon: Array.isArray(duLieu.tuyChon) ? duLieu.tuyChon : [],
        tuyChonSize: Array.isArray(duLieu.tuyChonSize) ? duLieu.tuyChonSize : [],
        tuyChonTopping: Array.isArray(duLieu.tuyChonTopping) ? duLieu.tuyChonTopping : [],
        ngayTao: new Date(),
        ngayCapNhat: new Date()
    };
    danhSachMonAn.push(banGhiMoi);
    luu();
    return banGhiMoi;
}

async function capNhat(id, duLieu) {
    const viTri = danhSachMonAn.findIndex(m => m.id === Number(id) && m.trangThai !== 'DaXoa');
    if (viTri === -1) return null;

    danhSachMonAn[viTri] = {
        ...danhSachMonAn[viTri],
        tenMon: duLieu.tenMon !== undefined ? duLieu.tenMon.trim() : danhSachMonAn[viTri].tenMon,
        danhMucId: duLieu.danhMucId !== undefined ? Number(duLieu.danhMucId) : danhSachMonAn[viTri].danhMucId,
        giaBan: duLieu.giaBan !== undefined ? Number(duLieu.giaBan) : danhSachMonAn[viTri].giaBan,
        donViTinh: duLieu.donViTinh !== undefined ? duLieu.donViTinh.trim() : danhSachMonAn[viTri].donViTinh,
        hinhAnh: duLieu.hinhAnh !== undefined ? duLieu.hinhAnh : danhSachMonAn[viTri].hinhAnh,
        moTa: duLieu.moTa !== undefined ? duLieu.moTa.trim() : danhSachMonAn[viTri].moTa,
        trangThai: duLieu.trangThai !== undefined ? duLieu.trangThai : danhSachMonAn[viTri].trangThai,
        laMonBanChay: duLieu.laMonBanChay !== undefined ? Boolean(duLieu.laMonBanChay) : danhSachMonAn[viTri].laMonBanChay,
        tuyChon: duLieu.tuyChon !== undefined && Array.isArray(duLieu.tuyChon) ? duLieu.tuyChon : danhSachMonAn[viTri].tuyChon,
        tuyChonSize: duLieu.tuyChonSize !== undefined && Array.isArray(duLieu.tuyChonSize) ? duLieu.tuyChonSize : danhSachMonAn[viTri].tuyChonSize,
        tuyChonTopping: duLieu.tuyChonTopping !== undefined && Array.isArray(duLieu.tuyChonTopping) ? duLieu.tuyChonTopping : danhSachMonAn[viTri].tuyChonTopping,
        ngayCapNhat: new Date()
    };
    luu();
    return danhSachMonAn[viTri];
}

async function doiTrangThai(id, trangThaiMoi) {
    const mon = await layTheoId(id);
    if (!mon) return null;
    mon.trangThai = trangThaiMoi;
    mon.ngayCapNhat = new Date();
    luu();
    return mon;
}

async function danhDauBanChay(id, laBanChay) {
    const mon = await layTheoId(id);
    if (!mon) return null;
    mon.laMonBanChay = Boolean(laBanChay);
    mon.ngayCapNhat = new Date();
    luu();
    return mon;
}

async function xoaMem(id) {
    const mon = await layTheoId(id);
    if (!mon) return false;
    mon.trangThai = 'DaXoa';
    mon.ngayCapNhat = new Date();
    luu();
    return true;
}

async function dongBoDanhSach(danhSachMoi) {
    if (!Array.isArray(danhSachMoi)) return danhSachMonAn;
    danhSachMonAn = danhSachMoi.map((m, idx) => ({
        id: Number(m.id) || (idx + 1),
        maMon: (m.maMon || `MON-${m.id || (idx + 1)}`).trim(),
        tenMon: (m.tenMon || m.ten || `Món ${m.id}`).trim(),
        danhMucId: m.danhMucId ? Number(m.danhMucId) : 1,
        giaBan: m.giaBan !== undefined ? Number(m.giaBan) : 0,
        donViTinh: (m.donViTinh || 'Phần').trim(),
        hinhAnh: m.hinhAnh || '',
        moTa: (m.moTa || '').trim(),
        trangThai: (m.trangThai === -1 || m.trangThai === 'DaXoa' || m.trangThai === 'da_xoa') ? 'DaXoa' : ((m.trangThai === 1 || m.trangThai === 'DangBan' || m.trangThai === 'HoatDong') ? 'DangBan' : 'TamHet'),
        laMonBanChay: Boolean(m.laMonBanChay || m.noiBat),
        tuyChon: Array.isArray(m.tuyChon) ? m.tuyChon : [],
        tuyChonSize: Array.isArray(m.tuyChonSize) ? m.tuyChonSize : [],
        tuyChonTopping: Array.isArray(m.tuyChonTopping) ? m.tuyChonTopping : [],
        ngayTao: m.ngayTao ? new Date(m.ngayTao) : new Date(),
        ngayCapNhat: new Date()
    }));
    tuTangId = Math.max(...danhSachMonAn.map(m => m.id || 0), 0) + 1;
    luu();
    return danhSachMonAn;
}

module.exports = {
    layDanhSach,
    layTheoId,
    layTheoTen,
    taoMoi,
    capNhat,
    doiTrangThai,
    danhDauBanChay,
    xoaMem,
    dongBoDanhSach
};
