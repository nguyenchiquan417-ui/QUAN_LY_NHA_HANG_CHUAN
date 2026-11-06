/**
 * MODEL ĐƠN GỌI MÓN (donGoiMon.model.js)
 * Quản lý các lượt gọi món (Orders/Rounds) của từng bàn ăn trong phiên phục vụ
 */

const { docDuLieu, ghiDuLieu } = require('../../tienIch/luuTruDuLieu');

const duLieuDonGoiMacDinh = [
    {
        id: 1,
        maDon: 'ORD-20261028-001',
        banId: 1,
        maBan: 'B101',
        tenBan: 'Bàn 01',
        khuVucId: 1,
        tenKhuVuc: 'Tầng 1 (Máy lạnh)',
        luotGoi: 1,
        thoiGianTao: new Date(Date.now() - 35 * 60 * 1000),
        trangThai: 'DANG_XU_LY',
        ghiChuDon: 'Khách ăn ít cay',
        danhSachMon: [
            {
                id: 101,
                monId: 1,
                tenMon: 'Bò nướng tảng sốt tiêu đen',
                size: 'Tiêu chuẩn',
                topping: 'Thêm khoai tây chiên (+20.000đ)',
                donGia: 189000,
                soLuong: 1,
                thanhTien: 209000,
                ghiChu: 'Chín vừa',
                trangThai: 'DA_LEN_MON'
            },
            {
                id: 102,
                monId: 4,
                tenMon: 'Trà đào cam sả',
                size: 'Size L (+10.000đ)',
                topping: '',
                donGia: 39000,
                soLuong: 2,
                thanhTien: 98000,
                ghiChu: 'Ít đường nhiều đá',
                trangThai: 'DA_LEN_MON'
            }
        ],
        tongTienDon: 307000,
        tongTien: 307000
    },
    {
        id: 2,
        maDon: 'ORD-20261028-002',
        banId: 1,
        maBan: 'B101',
        tenBan: 'Bàn 01',
        khuVucId: 1,
        tenKhuVuc: 'Tầng 1 (Máy lạnh)',
        luotGoi: 2,
        thoiGianTao: new Date(Date.now() - 15 * 60 * 1000),
        trangThai: 'DANG_XU_LY',
        ghiChuDon: 'Gọi thêm',
        danhSachMon: [
            {
                id: 103,
                monId: 5,
                tenMon: 'Khoai tây chiên lắc phô mai',
                size: 'Tiêu chuẩn',
                topping: '',
                donGia: 45000,
                soLuong: 1,
                thanhTien: 45000,
                ghiChu: 'Chiên giòn',
                trangThai: 'DA_NAU_XONG'
            }
        ],
        tongTienDon: 45000,
        tongTien: 45000
    },
    {
        id: 3,
        maDon: 'ORD-20261105-008',
        banId: 6,
        maBan: 'Q123',
        tenBan: 'Bàn 06',
        khuVucId: 1,
        tenKhuVuc: 'Tầng 1 (Máy lạnh)',
        luotGoi: 1,
        thoiGianTao: new Date(Date.now() - 10 * 60 * 1000),
        trangThai: 'CHO_XU_LY',
        ghiChuDon: '',
        danhSachMon: [
            {
                id: 104,
                monId: 1,
                tenMon: 'Bò nướng tảng sốt tiêu đen',
                size: 'Tiêu chuẩn',
                topping: '',
                donGia: 120000,
                soLuong: 1,
                thanhTien: 120000,
                ghiChu: '',
                trangThai: 'CHO_XAC_NHAN'
            }
        ],
        tongTienDon: 120000,
        tongTien: 120000
    }
];

let danhSachDonGoi = docDuLieu('donGoiMon', duLieuDonGoiMacDinh);

function tinhTuTangId() {
    return Math.max(...danhSachDonGoi.map(d => d.id || 0), 0) + 1;
}

function tinhTuTangItemId() {
    let maxItemId = 100;
    danhSachDonGoi.forEach(d => {
        (d.danhSachMon || []).forEach(m => {
            if (m.id && m.id > maxItemId) maxItemId = m.id;
        });
    });
    return maxItemId + 1;
}

let tuTangId = tinhTuTangId();
let tuTangItemId = tinhTuTangItemId();

function luu() {
    ghiDuLieu('donGoiMon', danhSachDonGoi);
}

async function layTatCa({ banId, trangThai } = {}) {
    let ketQua = [...danhSachDonGoi];
    if (banId) {
        ketQua = ketQua.filter(d => Number(d.banId) === Number(banId));
    }
    if (trangThai) {
        ketQua = ketQua.filter(d => d.trangThai === trangThai);
    }
    return ketQua.sort((a, b) => b.id - a.id);
}

async function layTheoId(id) {
    return danhSachDonGoi.find(d => d.id === Number(id)) || null;
}

async function layDonCuaBan(banId) {
    return danhSachDonGoi.filter(d => Number(d.banId) === Number(banId) && d.trangThai !== 'DA_HUY');
}

async function taoDon(duLieu) {
    const banId = Number(duLieu.banId);
    const donHienCo = await layDonCuaBan(banId);
    const luotGoi = donHienCo.length + 1;

    tuTangId = Math.max(tuTangId, tinhTuTangId());
    tuTangItemId = Math.max(tuTangItemId, tinhTuTangItemId());

    const ngayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const maDon = `ORD-${ngayStr}-${String(tuTangId).padStart(3, '0')}`;

    let tongTienDon = 0;
    const danhSachMon = (duLieu.danhSachMon || []).map(m => {
        const donGia = Number(m.donGia) || 0;
        const soLuong = Number(m.soLuong) || 1;
        const thanhTien = Number(m.thanhTien) || (donGia * soLuong);
        tongTienDon += thanhTien;

        let size = m.size || 'Tiêu chuẩn';
        let topping = m.topping || '';
        if (Array.isArray(m.tuyChonChon)) {
            const sizeOpt = m.tuyChonChon.find(tc => tc.tenNhom?.toLowerCase().includes('size') || tc.tenNhom?.toLowerCase().includes('kích cỡ'));
            if (sizeOpt) size = sizeOpt.ten;
            const toppingOpts = m.tuyChonChon.filter(tc => !tc.tenNhom?.toLowerCase().includes('size') && !tc.tenNhom?.toLowerCase().includes('kích cỡ'));
            if (toppingOpts.length > 0) topping = toppingOpts.map(t => t.ten).join(', ');
        }

        return {
            id: tuTangItemId++,
            monId: Number(m.monId || m.monAnId || m.id || 0),
            tenMon: m.tenMon,
            size,
            topping,
            donGia,
            soLuong,
            thanhTien,
            ghiChu: m.ghiChu || '',
            trangThai: m.trangThai || 'CHO_XAC_NHAN'
        };
    });

    const donMoi = {
        id: tuTangId++,
        maDon,
        banId,
        maBan: duLieu.maBan || `Bàn ${banId}`,
        tenBan: duLieu.tenBan || `Bàn ${banId}`,
        khuVucId: duLieu.khuVucId || 1,
        tenKhuVuc: duLieu.tenKhuVuc || '',
        luotGoi,
        thoiGianTao: new Date(),
        trangThai: 'CHO_XU_LY',
        ghiChuDon: duLieu.ghiChuDon || duLieu.ghiChuChung || '',
        danhSachMon,
        tongTien: tongTienDon,
        tongTienDon
    };

    danhSachDonGoi.push(donMoi);
    luu();
    return donMoi;
}

async function capNhatTrangThaiMon(itemId, trangThaiMoi) {
    for (const don of danhSachDonGoi) {
        const mon = (don.danhSachMon || []).find(m => m.id === Number(itemId));
        if (mon) {
            mon.trangThai = trangThaiMoi;
            luu();
            return { don, mon };
        }
    }
    return null;
}

async function huyMon(itemId, lyDo = '') {
    for (const don of danhSachDonGoi) {
        const mon = (don.danhSachMon || []).find(m => m.id === Number(itemId));
        if (mon) {
            if (mon.trangThai !== 'CHO_XAC_NHAN') {
                const loi = new Error('Không thể hủy món vì bếp đã bắt đầu chế biến hoặc đã lên món');
                loi.status = 400;
                throw loi;
            }
            mon.trangThai = 'DA_HUY';
            mon.lyDoHuy = lyDo;
            // Tính lại tổng tiền của đơn
            don.tongTienDon = don.danhSachMon
                .filter(m => m.trangThai !== 'DA_HUY')
                .reduce((tong, m) => tong + m.thanhTien, 0);

            luu();
            return { don, mon };
        }
    }
    return null;
}

async function dongDonCuaBan(banId) {
    const cacDon = danhSachDonGoi.filter(d => Number(d.banId) === Number(banId) && d.trangThai !== 'HOAN_THANH' && d.trangThai !== 'DA_HUY');
    cacDon.forEach(d => {
        d.trangThai = 'HOAN_THANH';
        d.thoiGianHoanThanh = new Date();
        if (Array.isArray(d.danhSachMon)) {
            d.danhSachMon.forEach(m => {
                if (m.trangThai !== 'DA_HUY') {
                    m.trangThai = 'DA_LEN_MON';
                }
            });
        }
    });
    if (cacDon.length > 0) {
        luu();
    }
    return cacDon.length;
}

async function chuyenBan(banNguonId, banDichId, thongTinBanDich = {}) {
    const cacDon = danhSachDonGoi.filter(d => 
        Number(d.banId) === Number(banNguonId) && d.trangThai !== 'HOAN_THANH' && d.trangThai !== 'DA_HUY'
    );
    cacDon.forEach(d => {
        d.banId = Number(banDichId);
        if (thongTinBanDich.soBan || thongTinBanDich.tenBan) {
            d.tenBan = thongTinBanDich.soBan || thongTinBanDich.tenBan;
            d.soBan = d.tenBan;
        }
        if (thongTinBanDich.khuVucTen || thongTinBanDich.tenKhuVuc) {
            d.tenKhuVuc = thongTinBanDich.khuVucTen || thongTinBanDich.tenKhuVuc;
            d.khuVucTen = d.tenKhuVuc;
        }
        if (thongTinBanDich.khuVucId) {
            d.khuVucId = thongTinBanDich.khuVucId;
        }
        d.ghiChuDon = `${d.ghiChuDon ? d.ghiChuDon + ' ' : ''}[Chuyển từ Bàn ${banNguonId}]`.trim();
    });
    if (cacDon.length > 0) {
        luu();
    }
    return cacDon;
}

async function ghepBan(cacBanPhuIds, banChinhId, thongTinBanChinh = {}) {
    const ids = Array.isArray(cacBanPhuIds) ? cacBanPhuIds.map(Number) : [Number(cacBanPhuIds)];
    const cacDon = danhSachDonGoi.filter(d => 
        ids.includes(Number(d.banId)) && d.trangThai !== 'HOAN_THANH' && d.trangThai !== 'DA_HUY'
    );
    cacDon.forEach(d => {
        const banCu = d.banId;
        d.banId = Number(banChinhId);
        if (thongTinBanChinh.soBan || thongTinBanChinh.tenBan) {
            d.tenBan = thongTinBanChinh.soBan || thongTinBanChinh.tenBan;
            d.soBan = d.tenBan;
        }
        if (thongTinBanChinh.khuVucTen || thongTinBanChinh.tenKhuVuc) {
            d.tenKhuVuc = thongTinBanChinh.khuVucTen || thongTinBanChinh.tenKhuVuc;
            d.khuVucTen = d.tenKhuVuc;
        }
        if (thongTinBanChinh.khuVucId) {
            d.khuVucId = thongTinBanChinh.khuVucId;
        }
        d.ghiChuDon = `${d.ghiChuDon ? d.ghiChuDon + ' ' : ''}[Ghép từ Bàn ${banCu}]`.trim();
    });
    if (cacDon.length > 0) {
        luu();
    }
    return cacDon;
}

module.exports = {
    layTatCa,
    layTheoId,
    layDonCuaBan,
    taoDon,
    capNhatTrangThaiMon,
    huyMon,
    dongDonCuaBan,
    chuyenBan,
    ghepBan
};
