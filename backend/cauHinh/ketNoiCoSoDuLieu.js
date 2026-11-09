/**
 * CẤU HÌNH KẾT NỐI VÀ QUẢN TRỊ DỮ LIỆU BỀN VỮNG (ketNoiCoSoDuLieu.js)
 * Phụ trách: Phát (DBA) & Minh (Backend API) & Nhật (PM & Backend Core)
 * Cung cấp kết nối CSDL SQLite chuẩn Node.js 24 native kết hợp tầng đồng bộ bền vững.
 */

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { docDuLieu, ghiDuLieu, THU_MUC_DU_LIEU } = require('../tienIch/luuTruDuLieu');

const DUONG_DAN_CSDL = path.join(__dirname, '../../database/quan_ly_nha_hang.sqlite');

let db = null;
try {
    db = new DatabaseSync(DUONG_DAN_CSDL);
    db.exec('PRAGMA foreign_keys = ON;');
    damBaoKhoiTaoCsdl();
} catch (loi) {
    console.error('[CSDL] Lỗi kết nối CSDL SQLite:', loi);
}

function damBaoKhoiTaoCsdl() {
    if (!db) return;
    try {
        const check = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='mon_an'").get();
        let bangMoiKhoiTao = false;
        if (!check || check.count === 0) {
            bangMoiKhoiTao = true;
            console.log('[CSDL] Chưa có bảng mon_an, tự động nạp cấu trúc DDL từ database/*.sql...');
            const thuMucDb = path.join(__dirname, '../../database');
            const danhSachFileSql = [
                'taoBang.sql',
                'rangBuoc.sql',
                'chiMuc.sql',
                'sprint02_taoBang.sql',
                'sprint02_rangBuoc.sql',
                'sprint02_chiMuc.sql',
                'sprint03_taoBang.sql',
                'sprint03_rangBuoc.sql',
                'sprint03_chiMuc.sql',
                'sprint04_taoBang.sql',
                'sprint04_rangBuoc.sql',
                'sprint04_chiMuc.sql',
                'sprint04_viewThongKe.sql'
            ];

            db.exec('PRAGMA foreign_keys = OFF;');
            for (const tenFile of danhSachFileSql) {
                const duongDan = path.join(thuMucDb, tenFile);
                if (fs.existsSync(duongDan)) {
                    const sql = fs.readFileSync(duongDan, 'utf8');
                    db.exec(sql);
                }
            }
            db.exec('PRAGMA foreign_keys = ON;');
            console.log('[CSDL] Đã tự động tạo xong toàn bộ 49 bảng & 3 view trong SQLite!');
        }

        // Đảm bảo có tài khoản quản trị để login
        const checkTk = db.prepare("SELECT count(*) as count FROM tai_khoan").get();
        if (!checkTk || checkTk.count === 0) {
            db.exec(`
                INSERT OR IGNORE INTO vai_tro (id, ma_vai_tro, ten_vai_tro, mo_ta) VALUES
                (1, 'QUAN_LY', 'Quan ly', 'Quan tri nha hang'),
                (2, 'THU_NGAN', 'Thu ngan', 'Tiep nhan va thanh toan'),
                (3, 'BEP', 'Bep', 'Xu ly mon tai bep'),
                (4, 'PHUC_VU', 'Phuc vu', 'Phuc vu tai ban');

                INSERT OR IGNORE INTO quyen_han (id, ma_quyen, ten_quyen, nhom_quyen) VALUES
                (1, 'TAI_KHOAN_XEM', 'Xem tai khoan', 'Tai khoan'),
                (2, 'NHAN_VIEN_QUAN_LY', 'Quan ly nhan vien', 'Nhan vien'),
                (3, 'BAN_AN_QUAN_LY', 'Quan ly ban an', 'Ban an'),
                (4, 'THUC_DON_QUAN_LY', 'Quan ly thuc don', 'Thuc don'),
                (5, 'CAU_HINH_QUAN_LY', 'Quan ly cau hinh', 'He thong'),
                (6, 'NHAT_KY_XEM', 'Xem nhat ky he thong', 'He thong');

                INSERT OR IGNORE INTO vai_tro_quyen_han (vai_tro_id, quyen_han_id) SELECT 1, id FROM quyen_han;
                INSERT OR IGNORE INTO vai_tro_quyen_han (vai_tro_id, quyen_han_id) VALUES (2,1),(2,3),(3,4),(4,3);

                INSERT OR IGNORE INTO tai_khoan (id, ten_dang_nhap, mat_khau, email) VALUES
                (1, 'quanly', '$2a$10$w3a6zB2qLphF3kL4kOaPDeP46n9Gk1wD26dJ3j5aC3aE.vEw6G.Xe', 'quanly@quanmoc.com'),
                (2, 'thungan01', '$2a$10$w3a6zB2qLphF3kL4kOaPDeP46n9Gk1wD26dJ3j5aC3aE.vEw6G.Xe', 'thungan@quanmoc.com'),
                (3, 'bep01', '$2a$10$w3a6zB2qLphF3kL4kOaPDeP46n9Gk1wD26dJ3j5aC3aE.vEw6G.Xe', 'bep@quanmoc.com');

                INSERT OR IGNORE INTO nhan_vien (id, tai_khoan_id, ho_ten, so_dien_thoai, email, vai_tro_id) VALUES
                (1, 1, 'Nguyễn Văn Quản Lý', '0901234567', 'quanly@quanmoc.com', 1),
                (2, 2, 'Trần Thị Thu Ngân', '0912345678', 'thungan@quanmoc.com', 2),
                (3, 3, 'Lê Văn Bếp Trưởng', '0923456789', 'bep@quanmoc.com', 3);
            `);
        }


    } catch (e) {
        console.warn('[CSDL] Lỗi trong damBaoKhoiTaoCsdl:', e.message);
    }
}

async function kiemTraKetNoiCoSoDuLieu() {
    let soBang = 0;
    try {
        if (db) {
            const res = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get();
            soBang = res ? res.count : 0;
        }
    } catch (e) {
        console.warn('[CSDL] Lỗi đếm bảng:', e.message);
    }

    return {
        ok: db !== null,
        loai: 'SQLite3_Native',
        duongDan: DUONG_DAN_CSDL,
        soBang,
        thuMucDuLieu: THU_MUC_DU_LIEU,
        thoiGian: new Date().toISOString()
    };
}

module.exports = {
    db,
    DUONG_DAN_CSDL,
    kiemTraKetNoiCoSoDuLieu,
    docDuLieu,
    ghiDuLieu,
    THU_MUC_DU_LIEU
};

