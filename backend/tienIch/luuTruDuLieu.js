const fs = require('fs');
const path = require('path');

/**
 * BỘ QUẢN LÝ LƯU TRỮ DỮ LIỆU BỀN VỮNG (luuTruDuLieu.js)
 * Phụ trách: Minh (Backend API Dev) & Phát (DBA) & Nhật (PM)
 * Đảm bảo dữ liệu lưu trữ bền vững hai chiều (SQLite 3 CSDL & JSON File),
 * mọi thao tác thêm/sửa/xóa trực tiếp từ Web lập tức được phản ánh vào CSDL.
 */

const THU_MUC_DU_LIEU = path.join(__dirname, '../duLieu');
const DUONG_DAN_SQLITE = path.join(__dirname, '../../database/quan_ly_nha_hang.sqlite');

let dbInstance = null;
function layDb() {
    if (!dbInstance) {
        try {
            const { DatabaseSync } = require('node:sqlite');
            if (fs.existsSync(DUONG_DAN_SQLITE)) {
                dbInstance = new DatabaseSync(DUONG_DAN_SQLITE);
            }
        } catch (e) {
            console.warn('[LuuTruDuLieu] Không thể mở kết nối SQLite:', e.message);
        }
    }
    return dbInstance;
}

function dongBoVaoSqlite(tenTep, duLieu) {
    const db = layDb();
    if (!db || !duLieu) return;

    try {
        if (tenTep === 'thucDon' && Array.isArray(duLieu)) {
            db.exec('PRAGMA foreign_keys = OFF;');
            db.exec('DELETE FROM hinh_anh_mon_an; DELETE FROM mon_an;');
            const stmtMon = db.prepare('INSERT INTO mon_an (id, danh_muc_id, ten_mon, gia_ban, don_vi_tinh, mo_ta, trang_thai, la_mon_ban_chay) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            const stmtAnh = db.prepare('INSERT OR REPLACE INTO hinh_anh_mon_an (mon_an_id, duong_dan, la_anh_dai_dien) VALUES (?, ?, 1)');
            for (const m of duLieu) {
                stmtMon.run(m.id, m.danhMucId || 1, m.tenMon, m.giaBan || 0, m.donViTinh || 'Phần', m.moTa || '', m.trangThai || 'DangBan', m.laMonBanChay ? 1 : 0);
                if (m.hinhAnh) {
                    stmtAnh.run(m.id, m.hinhAnh);
                }
            }
            db.exec('PRAGMA foreign_keys = ON;');
        } else if (tenTep === 'banAn' && Array.isArray(duLieu)) {
            db.exec('PRAGMA foreign_keys = OFF;');
            db.exec('DELETE FROM ban_an;');
            const stmtBan = db.prepare('INSERT INTO ban_an (id, khu_vuc_id, ma_ban, ten_ban, suc_chua, trang_thai) VALUES (?, ?, ?, ?, ?, ?)');
            const stmtQr = db.prepare('INSERT OR REPLACE INTO ma_qr_ban (ban_an_id, token_bao_mat, duong_dan_qr) VALUES (?, ?, ?)');
            for (const b of duLieu) {
                stmtBan.run(b.id, b.khuVucId || 1, b.maBan || ('B' + b.id), b.soBan || b.tenBan || ('Bàn ' + b.id), b.sucChua || 4, b.trangThai || 'Trong');
                if (b.tokenQr || b.qrToken) {
                    stmtQr.run(b.id, b.tokenQr || b.qrToken, '/e-menu?ban=' + (b.maBan || b.id));
                }
            }
            db.exec('PRAGMA foreign_keys = ON;');
        } else if (tenTep === 'danhMucMon' && Array.isArray(duLieu)) {
            db.exec('PRAGMA foreign_keys = OFF;');
            db.exec('DELETE FROM danh_muc_mon;');
            const stmt = db.prepare('INSERT INTO danh_muc_mon (id, ten_danh_muc, thu_tu_hien_thi, trang_thai) VALUES (?, ?, ?, ?)');
            for (const dm of duLieu) {
                stmt.run(dm.id, dm.tenDanhMuc || dm.ten, dm.thuTuHienThi || dm.thuTu || 0, dm.trangThai || 'HoatDong');
            }
            db.exec('PRAGMA foreign_keys = ON;');
        } else if (tenTep === 'khuVuc' && Array.isArray(duLieu)) {
            db.exec('PRAGMA foreign_keys = OFF;');
            db.exec('DELETE FROM khu_vuc;');
            const stmt = db.prepare('INSERT INTO khu_vuc (id, ten_khu_vuc, ghi_chu, trang_thai) VALUES (?, ?, ?, ?)');
            for (const kv of duLieu) {
                stmt.run(kv.id, kv.tenKhuVuc || kv.ten, kv.ghiChu || kv.moTa || '', kv.trangThai || 'HoatDong');
            }
            db.exec('PRAGMA foreign_keys = ON;');
        } else if (tenTep === 'nhanVien' && Array.isArray(duLieu)) {
            db.exec('PRAGMA foreign_keys = OFF;');
            const stmtTk = db.prepare('INSERT OR REPLACE INTO tai_khoan (id, ten_dang_nhap, mat_khau, email, trang_thai) VALUES (?, ?, ?, ?, ?)');
            const stmtNv = db.prepare('INSERT OR REPLACE INTO nhan_vien (id, tai_khoan_id, ho_ten, so_dien_thoai, email, vai_tro_id, trang_thai) VALUES (?, ?, ?, ?, ?, ?, ?)');
            const vaiTroIdMap = {
                'QuanLy': 1, 'QUAN_LY': 1,
                'ThuNgan': 2, 'THU_NGAN': 2,
                'Bep': 3, 'BEP': 3,
                'PhucVu': 4, 'PHUC_VU': 4
            };
            for (const nv of duLieu) {
                const vtId = vaiTroIdMap[nv.vaiTro] || 4;
                stmtTk.run(nv.id, nv.tenDangNhap, nv.matKhau || '$2a$10$DSxFp6IG8d2HuX1.In3ffeTkaO1NE6c/udEDalY5IxecYekgzWQhS', nv.email || '', nv.trangThai || 'HoatDong');
                stmtNv.run(nv.id, nv.id, nv.hoTen || nv.tenDangNhap, nv.soDienThoai || '', nv.email || '', vtId, nv.trangThai || 'HoatDong');
            }
            db.exec('PRAGMA foreign_keys = ON;');
        } else if (tenTep === 'cauHinhNhaHang' && typeof duLieu === 'object' && !Array.isArray(duLieu)) {
            db.exec('PRAGMA foreign_keys = OFF;');
            const stmt = db.prepare('INSERT OR REPLACE INTO cau_hinh_nha_hang (ma_cau_hinh, gia_tri, kieu_du_lieu, mo_ta) VALUES (?, ?, ?, ?)');
            for (const [k, v] of Object.entries(duLieu)) {
                stmt.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v), typeof v, `Cấu hình ${k}`);
            }
            db.exec('PRAGMA foreign_keys = ON;');
        } else if (tenTep === 'donGoiMon' && Array.isArray(duLieu)) {
            db.exec('PRAGMA foreign_keys = OFF;');
            db.exec('DELETE FROM chi_tiet_don_hang; DELETE FROM don_hang; DELETE FROM phien_phuc_vu;');
            const stmtPhien = db.prepare('INSERT OR IGNORE INTO phien_phuc_vu (id, ban_an_id, ma_phien, token_phien_hash, trang_thai) VALUES (?, ?, ?, ?, ?)');
            const stmtDon = db.prepare('INSERT OR REPLACE INTO don_hang (id, phien_phuc_vu_id, ma_don, ma_yeu_cau_idempotency, loai_don, trang_thai, ghi_chu_chung, tong_tien) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            const stmtCt = db.prepare('INSERT OR REPLACE INTO chi_tiet_don_hang (id, don_hang_id, mon_an_id, ten_mon_snapshot, don_gia_snapshot, so_luong, ghi_chu, thanh_tien, trang_thai_mon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

            let ctId = 1;
            for (const d of duLieu) {
                const phienId = d.banId || 1;
                stmtPhien.run(phienId, d.banId || 1, 'PH_' + phienId, 'tok_hash_' + phienId, 'DangMo');
                stmtDon.run(
                    d.id,
                    phienId,
                    d.maDon || ('ORD-' + d.id),
                    'IDEM-' + (d.maDon || d.id),
                    'Moi',
                    d.trangThai || 'ChoXacNhan',
                    d.ghiChuDon || d.ghiChu || '',
                    d.tongTienDon || d.tongTien || 0
                );

                if (Array.isArray(d.danhSachMon)) {
                    for (const m of d.danhSachMon) {
                        stmtCt.run(
                            m.id || (ctId++),
                            d.id,
                            m.monId || 1,
                            m.tenMon || 'Món',
                            m.donGia || 0,
                            m.soLuong || 1,
                            m.ghiChu || '',
                            m.thanhTien || ((m.donGia || 0) * (m.soLuong || 1)),
                            m.trangThai || 'ChoXacNhan'
                        );
                    }
                }
            }
            db.exec('PRAGMA foreign_keys = ON;');
        }
    } catch (loi) {
        console.warn(`[LuuTruDuLieu] Lỗi đồng bộ SQLite cho ${tenTep}:`, loi.message);
    }
}

// Đảm bảo thư mục backend/duLieu luôn tồn tại
try {
    if (!fs.existsSync(THU_MUC_DU_LIEU)) {
        fs.mkdirSync(THU_MUC_DU_LIEU, { recursive: true });
    }
} catch (loi) {
    console.error('Không thể tạo thư mục lưu trữ backend/duLieu:', loi);
}

/**
 * Đọc dữ liệu từ tệp JSON. Nếu tệp chưa tồn tại, tự động tạo mới với dữ liệu mặc định.
 * @param {string} tenTep Tên định danh bảng/tệp (ví dụ 'thucDon', 'banAn')
 * @param {any} duLieuMacDinh Dữ liệu mẫu khởi tạo ban đầu
 * @returns {any} Dữ liệu đã lưu trữ hoặc dữ liệu mặc định
 */
function docDuLieu(tenTep, duLieuMacDinh) {
    const duongDanTep = path.join(THU_MUC_DU_LIEU, `${tenTep}.json`);
    try {
        if (fs.existsSync(duongDanTep)) {
            const noiDung = fs.readFileSync(duongDanTep, 'utf8');
            if (noiDung && noiDung.trim().length > 0) {
                return JSON.parse(noiDung);
            }
        }
    } catch (loi) {
        console.warn(`[LuuTruDuLieu] Không đọc được tệp ${tenTep}.json, sử dụng dữ liệu mặc định:`, loi.message);
    }

    // Nếu chưa có tệp hoặc tệp rỗng, ghi dữ liệu mặc định ra đĩa và CSDL
    ghiDuLieu(tenTep, duLieuMacDinh);
    return duLieuMacDinh;
}

/**
 * Ghi dữ liệu đồng bộ ra cả tệp JSON và Cơ sở dữ liệu SQLite
 * @param {string} tenTep Tên định danh bảng/tệp
 * @param {any} duLieu Dữ liệu cần ghi
 */
function ghiDuLieu(tenTep, duLieu) {
    const duongDanTep = path.join(THU_MUC_DU_LIEU, `${tenTep}.json`);
    try {
        if (!fs.existsSync(THU_MUC_DU_LIEU)) {
            fs.mkdirSync(THU_MUC_DU_LIEU, { recursive: true });
        }
        const noiDung = JSON.stringify(duLieu, null, 2);
        fs.writeFileSync(duongDanTep, noiDung, 'utf8');
        // Đồng bộ lập tức vào bảng SQLite tương ứng
        dongBoVaoSqlite(tenTep, duLieu);
    } catch (loi) {
        console.error(`[LuuTruDuLieu] Lỗi khi ghi tệp ${tenTep}.json:`, loi);
    }
}

module.exports = {
    docDuLieu,
    ghiDuLieu,
    layDb,
    THU_MUC_DU_LIEU,
    DUONG_DAN_SQLITE
};
