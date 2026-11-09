/**
 * TIỆN ÍCH DỌN DẸP DỮ LIỆU MẪU (xoaDuLieuMau.js)
 * Xóa toàn bộ dữ liệu mẫu (thực đơn, bàn ăn, khu vực, danh mục, đơn món, hóa đơn, kds, giỏ hàng...)
 * trong cả CSDL SQLite và các tệp JSON lưu trữ bền vững.
 * Giữ lại tài khoản quản trị (quanly/123456), vai trò và cấu hình hệ thống để người dùng tự tạo dữ liệu.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DUONG_DAN_SQLITE = path.join(__dirname, '../../database/quan_ly_nha_hang.sqlite');
const THU_MUC_DU_LIEU = path.join(__dirname, '../duLieu');

function xoaDuLieuMau() {
    console.log('🧹 Đang bắt đầu làm sạch toàn bộ dữ liệu mẫu...');

    // 1. Dọn dẹp trong CSDL SQLite
    try {
        if (fs.existsSync(DUONG_DAN_SQLITE)) {
            const db = new DatabaseSync(DUONG_DAN_SQLITE);
            db.exec('PRAGMA foreign_keys = OFF;');

            const cacBangCanXoa = [
                'chi_tiet_don_hang',
                'chi_tiet_don_hang_tuy_chon',
                'don_hang',
                'phien_phuc_vu',
                'chi_tiet_hoa_don',
                'hoa_don_khuyen_mai',
                'giao_dich_thanh_toan',
                'hoa_don',
                'hinh_anh_mon_an',
                'tuy_chon_mon',
                'nhom_tuy_chon_mon',
                'mon_an',
                'danh_muc_mon',
                'ma_qr_ban',
                'ban_an',
                'khu_vuc',
                'hang_doi_bep',
                'lich_su_mon_bep',
                'yeu_cau_ho_tro_ban',
                'yeu_cau_huy_tra_mon',
                'danh_gia_khach_hang',
                'phan_hoi_quan_ly',
                'ca_lam_viec',
                'bien_ban_giao_ca',
                'phieu_thu_chi_ca',
                'chuong_trinh_khuyen_mai',
                'ma_giam_gia',
                'gio_hang_item_tuy_chon',
                'gio_hang_item',
                'gio_hang',
                'lich_su_chuyen_ban',
                'lich_su_ghep_ban',
                'lich_su_that_thoat_mon',
                'lich_su_trang_thai_don_hang',
                'lich_su_xuat_bao_cao',
                'thong_ke_khung_gio',
                'thong_ke_mon_an',
                'tong_hop_doanh_thu_ngay',
                'tong_hop_doanh_thu_thang'
            ];

            for (const bang of cacBangCanXoa) {
                try {
                    db.exec(`DELETE FROM ${bang};`);
                } catch (e) {
                    // Bảng có thể chưa tồn tại, bỏ qua
                }
            }

            // Khởi tạo lại các khu vực và bàn ăn mặc định cho nhà hàng
            db.exec(`
                INSERT INTO khu_vuc (id, ten_khu_vuc, ghi_chu, trang_thai) VALUES
                (1, 'Tầng 1', 'Khu vực tầng 1 trong nhà', 'HoatDong'),
                (2, 'Tầng 2', 'Khu vực tầng 2 lầu cao', 'HoatDong'),
                (3, 'Ngoài trời', 'Khu vực sân vườn ngoài trời thoáng mát', 'HoatDong'),
                (4, 'Phòng VIP', 'Khu vực phòng VIP máy lạnh riêng tư', 'HoatDong');

                INSERT INTO ban_an (id, khu_vuc_id, ma_ban, ten_ban, suc_chua, trang_thai) VALUES
                (1, 1, 'B101', 'Bàn 01', 4, 'TRONG'),
                (2, 1, 'B102', 'Bàn 02', 4, 'TRONG'),
                (3, 1, 'B103', 'Bàn 03', 6, 'TRONG'),
                (4, 1, 'B104', 'Bàn 04', 2, 'TRONG'),
                (5, 2, 'B201', 'Bàn 05', 4, 'TRONG'),
                (6, 2, 'B202', 'Bàn 06', 4, 'TRONG'),
                (7, 2, 'B203', 'Bàn 07', 8, 'TRONG'),
                (8, 3, 'NT01', 'Bàn 08', 4, 'TRONG'),
                (9, 3, 'NT02', 'Bàn 09', 4, 'TRONG'),
                (10, 3, 'NT03', 'Bàn 10', 6, 'TRONG'),
                (11, 4, 'VIP01', 'Bàn VIP 1', 10, 'TRONG'),
                (12, 4, 'VIP02', 'Bàn VIP 2', 12, 'TRONG');

                INSERT INTO ma_qr_ban (ban_an_id, token_bao_mat, duong_dan_qr) VALUES
                (1, 'tok_b101_dev001', '/e-menu?ban=B101'),
                (2, 'tok_b102_dev002', '/e-menu?ban=B102'),
                (3, 'tok_b103_dev003', '/e-menu?ban=B103'),
                (4, 'tok_b104_dev004', '/e-menu?ban=B104'),
                (5, 'tok_b201_dev005', '/e-menu?ban=B201'),
                (6, 'tok_b202_dev006', '/e-menu?ban=B202'),
                (7, 'tok_b203_dev007', '/e-menu?ban=B203'),
                (8, 'tok_nt01_dev008', '/e-menu?ban=NT01'),
                (9, 'tok_nt02_dev009', '/e-menu?ban=NT02'),
                (10, 'tok_nt03_dev010', '/e-menu?ban=NT03'),
                (11, 'tok_vip01_dev011', '/e-menu?ban=VIP01'),
                (12, 'tok_vip02_dev012', '/e-menu?ban=VIP02');
            `);

            db.exec('PRAGMA foreign_keys = ON;');
            console.log('✅ Đã xóa sạch dữ liệu mẫu trong CSDL SQLite (giữ lại tài khoản đăng nhập, vai trò & sơ đồ bàn chuẩn).');
        }
    } catch (e) {
        console.error('❌ Lỗi khi dọn dẹp SQLite:', e.message);
    }

    // 2. Dọn dẹp trong các tệp JSON lưu trữ backend/duLieu/
    try {
        if (!fs.existsSync(THU_MUC_DU_LIEU)) {
            fs.mkdirSync(THU_MUC_DU_LIEU, { recursive: true });
        }

        const cacTepLamRong = ['thucDon', 'danhMucMon', 'donGoiMon'];
        for (const t of cacTepLamRong) {
            const p = path.join(THU_MUC_DU_LIEU, `${t}.json`);
            fs.writeFileSync(p, JSON.stringify([], null, 2), 'utf8');
            console.log(`✅ Đã đặt tệp backend/duLieu/${t}.json về mảng rỗng []`);
        }

        // Khởi tạo 4 khu vực chuẩn cho khuVuc.json
        const dsKhuVucChuan = [
            { id: 1, ma: 'KV_1', ten: 'Tầng 1', tenKhuVuc: 'Tầng 1', ghiChu: 'Khu vực tầng 1 trong nhà', thuTu: 1, trangThai: 'HoatDong' },
            { id: 2, ma: 'KV_2', ten: 'Tầng 2', tenKhuVuc: 'Tầng 2', ghiChu: 'Khu vực tầng 2 lầu cao', thuTu: 2, trangThai: 'HoatDong' },
            { id: 3, ma: 'KV_3', ten: 'Ngoài trời', tenKhuVuc: 'Ngoài trời', ghiChu: 'Khu vực sân vườn ngoài trời thoáng mát', thuTu: 3, trangThai: 'HoatDong' },
            { id: 4, ma: 'KV_4', ten: 'Phòng VIP', tenKhuVuc: 'Phòng VIP', ghiChu: 'Khu vực phòng VIP máy lạnh riêng tư', thuTu: 4, trangThai: 'HoatDong' }
        ];
        fs.writeFileSync(path.join(THU_MUC_DU_LIEU, 'khuVuc.json'), JSON.stringify(dsKhuVucChuan, null, 2), 'utf8');

        // Khởi tạo 12 bàn ăn chuẩn cho banAn.json
        const dsBanChuan = [
            { id: 1, khuVucId: 1, maBan: 'B101', soBan: 'Bàn 01', tenBan: 'Bàn 01', sucChua: 4, trangThai: 'TRONG', qrToken: 'tok_b101_dev001', tokenBaoMat: 'tok_b101_dev001', ghiChu: 'Gần cửa chính' },
            { id: 2, khuVucId: 1, maBan: 'B102', soBan: 'Bàn 02', tenBan: 'Bàn 02', sucChua: 4, trangThai: 'TRONG', qrToken: 'tok_b102_dev002', tokenBaoMat: 'tok_b102_dev002', ghiChu: 'Trung tâm sảnh' },
            { id: 3, khuVucId: 1, maBan: 'B103', soBan: 'Bàn 03', tenBan: 'Bàn 03', sucChua: 6, trangThai: 'TRONG', qrToken: 'tok_b103_dev003', tokenBaoMat: 'tok_b103_dev003', ghiChu: 'Bàn gia đình' },
            { id: 4, khuVucId: 1, maBan: 'B104', soBan: 'Bàn 04', tenBan: 'Bàn 04', sucChua: 2, trangThai: 'TRONG', qrToken: 'tok_b104_dev004', tokenBaoMat: 'tok_b104_dev004', ghiChu: 'Bàn đôi cạnh cửa sổ' },
            { id: 5, khuVucId: 2, maBan: 'B201', soBan: 'Bàn 05', tenBan: 'Bàn 05', sucChua: 4, trangThai: 'TRONG', qrToken: 'tok_b201_dev005', tokenBaoMat: 'tok_b201_dev005', ghiChu: 'Tầng 2 view thoáng' },
            { id: 6, khuVucId: 2, maBan: 'B202', soBan: 'Bàn 06', tenBan: 'Bàn 06', sucChua: 4, trangThai: 'TRONG', qrToken: 'tok_b202_dev006', tokenBaoMat: 'tok_b202_dev006', ghiChu: 'Gần cầu thang' },
            { id: 7, khuVucId: 2, maBan: 'B203', soBan: 'Bàn 07', tenBan: 'Bàn 07', sucChua: 8, trangThai: 'TRONG', qrToken: 'tok_b203_dev007', tokenBaoMat: 'tok_b203_dev007', ghiChu: 'Bàn nhóm họp mặt' },
            { id: 8, khuVucId: 3, maBan: 'NT01', soBan: 'Bàn 08', tenBan: 'Bàn 08', sucChua: 4, trangThai: 'TRONG', qrToken: 'tok_nt01_dev008', tokenBaoMat: 'tok_nt01_dev008', ghiChu: 'Sân vườn ngoài trời' },
            { id: 9, khuVucId: 3, maBan: 'NT02', soBan: 'Bàn 09', tenBan: 'Bàn 09', sucChua: 4, trangThai: 'TRONG', qrToken: 'tok_nt02_dev009', tokenBaoMat: 'tok_nt02_dev009', ghiChu: 'Dưới tán cây' },
            { id: 10, khuVucId: 3, maBan: 'NT03', soBan: 'Bàn 10', tenBan: 'Bàn 10', sucChua: 6, trangThai: 'TRONG', qrToken: 'tok_nt03_dev010', tokenBaoMat: 'tok_nt03_dev010', ghiChu: 'View hồ nước' },
            { id: 11, khuVucId: 4, maBan: 'VIP01', soBan: 'Bàn VIP 1', tenBan: 'Bàn VIP 1', sucChua: 10, trangThai: 'TRONG', qrToken: 'tok_vip01_dev011', tokenBaoMat: 'tok_vip01_dev011', ghiChu: 'Phòng VIP Hoa Sen' },
            { id: 12, khuVucId: 4, maBan: 'VIP02', soBan: 'Bàn VIP 2', tenBan: 'Bàn VIP 2', sucChua: 12, trangThai: 'TRONG', qrToken: 'tok_vip02_dev012', tokenBaoMat: 'tok_vip02_dev012', ghiChu: 'Phòng VIP Hoàng Gia' }
        ];
        fs.writeFileSync(path.join(THU_MUC_DU_LIEU, 'banAn.json'), JSON.stringify(dsBanChuan, null, 2), 'utf8');
        console.log('✅ Đã khởi tạo 4 khu vực và 12 bàn ăn chuẩn cho vận hành.');
    } catch (e) {
        console.error('❌ Lỗi khi dọn dẹp tệp JSON:', e.message);
    }

    console.log('🎉 Hoàn tất làm sạch! Hệ thống hiện tại hoàn toàn trống để bạn tự tạo dữ liệu.');
}

if (require.main === module) {
    xoaDuLieuMau();
}

module.exports = { xoaDuLieuMau };
