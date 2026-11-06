/**
 * PHÂN HỆ QUẦY THU NGÂN, HÓA ĐƠN & THANH TOÁN POS (thanhToanPos.js)
 * Phụ trách: Quân (Frontend Table QR & POS Lead)
 * Đáp ứng các User Story trong Sprint 3:
 * - US-099: Quản lý danh sách mã khuyến mại / voucher (theo % hoặc số tiền)
 * - US-100: Kiểm tra điều kiện hợp lệ và áp dụng mã giảm giá vào hóa đơn bàn
 * - US-101: Tùy chỉnh chiết khấu trực tiếp hoặc cộng phụ phí (dịch vụ, phòng VIP)
 * - US-102: Tự động tổng hợp toàn bộ các lượt gọi món thành một hóa đơn duy nhất
 * - US-103: Tự động tính thành tiền, giảm giá, phụ phí, thuế VAT và tổng tiền phải trả
 * - US-104: Xem trước & in phiếu tạm tính cho khách (In nhiệt K80 chuẩn thu ngân)
 * - US-105: Thanh toán Tiền mặt (nút mệnh giá nhanh, tự tính tiền thừa trả khách)
 * - US-106: Sinh mã VietQR động chuẩn Napas 247 nhúng sẵn số tiền và nội dung hóa đơn
 * - US-107: Xác nhận thanh toán và lưu trữ hóa đơn chính thức
 * - US-108: Hỗ trợ tách món thanh toán riêng theo nhu cầu của nhóm khách (Split bill)
 * - US-109: Tự động đóng phiên phục vụ bàn (Table Session) sau thanh toán
 * - US-110: Tự động chuyển trạng thái bàn về "Bàn trống" sẵn sàng đón khách mới
 */

class ThanhToanPosModule {
    constructor() {
        this.khoiTaoDuLieuKho();
        this.banIdHienTai = null;
        this.maVoucherApDung = '';
        this.tienGiamVoucher = 0;
        this.chietKhauPhanTram = 0;
        this.chietKhauTienMat = 0;
        this.phuPhi = 0;
        this.apDungVat = false;
        this.mucThueVat = 8; // 8% VAT
        this.phuongThucThanhToan = 'CHUYEN_KHOAN_VIETQR'; // Mặc định VietQR
        this.tienKhachDua = 0;
    }

    /**
     * Khởi tạo danh mục mã khuyến mại và kho lịch sử hóa đơn
     */
    khoiTaoDuLieuKho() {
        // 1. Danh sách Voucher khuyến mại (US-099)
        const KHOA_KM = 'quanmoc_pos_danh_sach_khuyen_mai';
        if (!localStorage.getItem(KHOA_KM)) {
            const dsKmMau = [
                {
                    ma: 'BANMOI10',
                    ten: 'Giảm 10% Khai trương / Bàn mới',
                    loai: 'PHAN_TRAM',
                    giaTri: 10,
                    donToiThieu: 200000,
                    giamToiDa: 100000,
                    trangThai: 1
                },
                {
                    ma: 'MOCVUI50K',
                    ten: 'Giảm trực tiếp 50.000 đ',
                    loai: 'TIEN_MAT',
                    giaTri: 50000,
                    donToiThieu: 300000,
                    giamToiDa: 50000,
                    trangThai: 1
                },
                {
                    ma: 'VIP20',
                    ten: 'Tri ân khách hàng thân thiết VIP (20%)',
                    loai: 'PHAN_TRAM',
                    giaTri: 20,
                    donToiThieu: 500000,
                    giamToiDa: 300000,
                    trangThai: 1
                },
                {
                    ma: 'TRIAN5',
                    ten: 'Ưu đãi cuối tuần 5%',
                    loai: 'PHAN_TRAM',
                    giaTri: 5,
                    donToiThieu: 0,
                    giamToiDa: 50000,
                    trangThai: 1
                }
            ];
            localStorage.setItem(KHOA_KM, JSON.stringify(dsKmMau));
        }

        // 2. Lịch sử hóa đơn đã thanh toán (US-107)
        const KHOA_HD = 'quanmoc_pos_lich_su_hoa_don';
        if (!localStorage.getItem(KHOA_HD)) {
            const lichSuMau = [
                {
                    maHoaDon: 'HD-20261028-001',
                    soBan: 'Bàn 01',
                    thoiGianVao: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
                    thoiGianThanhToan: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                    tongTienMon: 560000,
                    giamGia: 50000,
                    phuPhi: 0,
                    vat: 40800,
                    tongThanhToan: 550800,
                    phuongThuc: 'TIEN_MAT',
                    thuNgan: 'Quân (Thu ngân)'
                }
            ];
            localStorage.setItem(KHOA_HD, JSON.stringify(lichSuMau));
        }
    }

    layTatCaPhienBan() {
        const raw = localStorage.getItem('quanmoc_pos_phien_ban');
        return raw ? JSON.parse(raw) : {};
    }

    luuTatCaPhienBan(ds) {
        localStorage.setItem('quanmoc_pos_phien_ban', JSON.stringify(ds));
    }

    layDanhSachKhuyenMai() {
        const raw = localStorage.getItem('quanmoc_pos_danh_sach_khuyen_mai');
        return raw ? JSON.parse(raw) : [];
    }

    layLichSuHoaDon() {
        const raw = localStorage.getItem('quanmoc_pos_lich_su_hoa_don');
        return raw ? JSON.parse(raw) : [];
    }

    luuHoaDon(hd) {
        const ds = this.layLichSuHoaDon();
        ds.unshift(hd);
        localStorage.setItem('quanmoc_pos_lich_su_hoa_don', JSON.stringify(ds));
    }

    async khoiTao() {
        const vungChua = document.getElementById('noi-dung-chinh');
        if (!vungChua) return;

        // Đọc bàn được chọn từ chuyển hướng nếu có
        const banDuocChon = localStorage.getItem('quanmoc_pos_ban_thanh_toan_chon');
        if (banDuocChon) {
            this.banIdHienTai = parseInt(banDuocChon);
            localStorage.removeItem('quanmoc_pos_ban_thanh_toan_chon');
        }

        vungChua.innerHTML = `
            <div class="trang-thanh-toan-pos">
                <!-- Header Quầy thu ngân -->
                <div class="thanh-tieu-de-pos">
                    <div class="nhom-tieu-de">
                        <h2>💵 Quầy Thu Ngân & Thanh Toán Hóa Đơn (POS)</h2>
                        <p class="mo-ta-phu">In hóa đơn K80, Chiết khấu/Voucher, VietQR Động Napas 247, Tách Bill</p>
                    </div>
                    <div class="nhom-nut-hanh-dong-pos">
                        <button class="nut nut-phu" onclick="window.ungDung.chuyenTab('soDoBanPos')">
                            🗺️ Về Sơ đồ bàn
                        </button>
                        <button class="nut nut-phu" onclick="window.thanhToanPos.moModalLichSuHoaDon()">
                            📜 Lịch sử hóa đơn đã thu
                        </button>
                        <button class="nut nut-phu" onclick="window.thanhToanPos.moModalQuanLyVoucher()">
                            🎟️ Quản lý mã Voucher
                        </button>
                    </div>
                </div>

                <!-- Bố cục 2 cột POS -->
                <div class="bo-cuc-quay-thu-ngan">
                    <!-- Cột trái: Danh sách các bàn đang phục vụ -->
                    <div class="cot-danh-sach-ban-pos">
                        <div class="dau-hop-cot">
                            <span style="font-weight: 700;">Danh sách bàn có khách:</span>
                            <span id="so-luong-ban-co-khach" class="badge badge-xanh-duong">0</span>
                        </div>
                        <div class="danh-sach-the-ban-thu-ngan" id="danh-sach-the-ban-thu-ngan">
                            <!-- Render thẻ bàn -->
                        </div>
                    </div>

                    <!-- Cột phải: Khung hóa đơn chi tiết & Thanh toán -->
                    <div class="cot-hoa-don-chi-tiet-pos" id="khung-hoa-don-chi-tiet-pos">
                        <!-- Render hóa đơn bàn đang chọn -->
                    </div>
                </div>
            </div>
        `;

        await this.taiVaHienThi();
    }

    async dongBoPhienVoiServer() {
        const phienLocal = this.layTatCaPhienBan();
        try {
            const dsBan = await window.api.layDanhSachBan();
            if (window.api && window.api.layTatCaDonGoiMon) {
                const dsDonServer = await window.api.layTatCaDonGoiMon();

                // DỌN DẸP BÀN TRỐNG: Xóa phiên rác của các bàn đã hoàn tất thanh toán / TRONG
                if (Array.isArray(dsBan)) {
                    dsBan.forEach(b => {
                        if (b.trangThai === 'TRONG' || b.trangThai === 'Trong') {
                            const bId = Number(b.id);
                            const donConHoatDong = Array.isArray(dsDonServer) && dsDonServer.some(d => 
                                Number(d.banId) === bId && d.trangThai !== 'HOAN_THANH' && d.trangThai !== 'DA_HUY'
                            );
                            if (!donConHoatDong && phienLocal[bId]) {
                                delete phienLocal[bId];
                            }
                        }
                    });
                }

                if (Array.isArray(dsDonServer)) {
                    dsDonServer.forEach(don => {
                        const bId = Number(don.banId);
                        if (!bId) return;
                        // Bỏ qua đơn đã hoàn thành hoặc đã hủy sau khi thanh toán
                        if (don.trangThai === 'HOAN_THANH' || don.trangThai === 'DA_HUY') return;

                        if (!phienLocal[bId]) {
                            phienLocal[bId] = {
                                banId: bId,
                                thoiGianBatDau: don.thoiGianDat || don.thoiGianTao || new Date().toISOString(),
                                soKhach: don.soKhach || 2,
                                danhSachMon: []
                            };
                        }
                        if (Array.isArray(don.danhSachMon)) {
                            don.danhSachMon.forEach(m => {
                                const daCo = phienLocal[bId].danhSachMon.some(existing => 
                                    (m.id && existing.id === m.id) || (existing.tenMon === m.tenMon && existing.donGia === m.donGia)
                                );
                                if (!daCo) {
                                    phienLocal[bId].danhSachMon.push({
                                        id: m.id || Date.now() + Math.random(),
                                        monAnId: m.monAnId || m.monId,
                                        tenMon: m.tenMon,
                                        soLuong: m.soLuong || 1,
                                        donGia: m.donGia || 0,
                                        tuyChon: m.tuyChon || '',
                                        ghiChu: m.ghiChu || '',
                                        trangThai: m.trangThai || 'CHO_CHE_BIEN'
                                    });
                                }
                            });
                        }
                    });
                    this.luuTatCaPhienBan(phienLocal);
                }
            }
        } catch (e) {
            console.warn('Lỗi đồng bộ đơn đặt món từ server sang phiên thu ngân:', e);
        }
        return phienLocal;
    }

    async taiVaHienThi() {
        const dsBan = await window.api.layDanhSachBan();
        const dsPhien = await this.dongBoPhienVoiServer();

        // Lọc các bàn đang có phiên (DANG_DUNG, CHO_THANH_TOAN, CAN_HO_TRO)
        const dsBanCoKhach = dsBan.filter(b => b.trangThai !== 'TRONG');

        // Cập nhật số lượng
        const badgeCount = document.getElementById('so-luong-ban-co-khach');
        if (badgeCount) badgeCount.textContent = `${dsBanCoKhach.length} bàn`;

        // Nếu chưa chọn bàn hoặc bàn đang chọn không có khách, chọn bàn đầu tiên
        if (!this.banIdHienTai || !dsBanCoKhach.some(b => b.id == this.banIdHienTai)) {
            if (dsBanCoKhach.length > 0) {
                this.banIdHienTai = dsBanCoKhach[0].id;
            } else {
                this.banIdHienTai = null;
            }
        }

        this.veCotDanhSachBan(dsBanCoKhach, dsPhien);
        this.veKhungHoaDon(dsBan, dsPhien);
    }

    veCotDanhSachBan(dsBanCoKhach, dsPhien) {
        const el = document.getElementById('danh-sach-the-ban-thu-ngan');
        if (!el) return;

        if (dsBanCoKhach.length === 0) {
            el.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--mau-chu-phu);">
                    <div style="font-size: 32px; margin-bottom: 8px;">🍽️</div>
                    <p>Hiện tại không có bàn nào đang phục vụ hoặc chờ tính tiền.</p>
                    <button class="nut nut-chinh nut-nho" style="margin-top: 12px;" onclick="window.ungDung.chuyenTab('soDoBanPos')">
                        Mở bàn tại Sơ đồ bàn
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        dsBanCoKhach.forEach(ban => {
            const phien = dsPhien[ban.id];
            const laDangChon = (ban.id == this.banIdHienTai);
            const tongTien = phien ? window.soDoBanPos.tinhTongTienBan(phien) : 0;
            const soPhut = phien ? window.soDoBanPos.tinhSoPhutNgoi(phien.thoiGianBatDau) : 0;

            let badgeTrangThai = '<span class="badge badge-xanh-duong">Đang ăn</span>';
            if (ban.trangThai === 'CHO_THANH_TOAN') badgeTrangThai = '<span class="badge badge-vang">Chờ tính tiền</span>';
            else if (ban.trangThai === 'CAN_HO_TRO') badgeTrangThai = '<span class="badge badge-do">Cần hỗ trợ</span>';

            html += `
                <div class="the-ban-thu-ngan-item ${laDangChon ? 'kich-hoat' : ''}" onclick="window.thanhToanPos.chonBan(${ban.id})">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <strong style="font-size: 15px;">${ban.soBan}</strong>
                        ${badgeTrangThai}
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--mau-chu-phu);">
                        <span>⏱️ ${soPhut} phút (${ban.sucChua} chỗ)</span>
                        <strong style="color: var(--mau-chinh); font-size: 14px;">${tongTien.toLocaleString()} đ</strong>
                    </div>
                </div>
            `;
        });

        el.innerHTML = html;
    }

    chonBan(banId) {
        this.banIdHienTai = banId;
        // Reset các khoản giảm giá khi đổi bàn
        this.maVoucherApDung = '';
        this.tienGiamVoucher = 0;
        this.chietKhauPhanTram = 0;
        this.chietKhauTienMat = 0;
        this.phuPhi = 0;
        this.tienKhachDua = 0;
        this.taiVaHienThi();
    }

    /**
     * Tính toán tổng tiền chi tiết của hóa đơn (US-102, US-103)
     */
    tinhToanTongTienHoaDon(phien) {
        const tienMon = phien ? window.soDoBanPos.tinhTongTienBan(phien) : 0;

        // Tiền giảm từ Voucher
        let giamVoucher = this.tienGiamVoucher || 0;

        // Chiết khấu thêm
        let giamChietKhau = this.chietKhauTienMat || 0;
        if (this.chietKhauPhanTram > 0) {
            giamChietKhau += Math.round((tienMon * this.chietKhauPhanTram) / 100);
        }

        const tongGiamGia = Math.min(tienMon, giamVoucher + giamChietKhau);
        const sauGiamGia = Math.max(0, tienMon - tongGiamGia);

        // Phụ phí
        const tienPhuPhi = this.phuPhi || 0;

        // Thuế VAT
        let tienVat = 0;
        if (this.apDungVat) {
            tienVat = Math.round(((sauGiamGia + tienPhuPhi) * this.mucThueVat) / 100);
        }

        const tongThanhToan = sauGiamGia + tienPhuPhi + tienVat;

        return {
            tienMon,
            giamVoucher,
            giamChietKhau,
            tongGiamGia,
            sauGiamGia,
            tienPhuPhi,
            tienVat,
            tongThanhToan
        };
    }

    veKhungHoaDon(dsBan, dsPhien) {
        const el = document.getElementById('khung-hoa-don-chi-tiet-pos');
        if (!el) return;

        if (!this.banIdHienTai) {
            el.innerHTML = `
                <div class="khung-chua-chon-ban-pos">
                    <div style="font-size: 48px; margin-bottom: 12px;">🧾</div>
                    <h3>Chưa chọn bàn nào để thanh toán</h3>
                    <p style="color: var(--mau-chu-phu); margin-top: 6px;">Vui lòng chọn một bàn từ danh sách bên trái hoặc mở bàn mới tại Sơ đồ bàn.</p>
                </div>
            `;
            return;
        }

        const ban = dsBan.find(b => b.id == this.banIdHienTai);
        const phien = dsPhien[this.banIdHienTai];

        if (!ban || !phien) {
            el.innerHTML = '<div class="khung-chua-chon-ban-pos">Không tìm thấy thông tin phiên của bàn này.</div>';
            return;
        }

        const tinhTien = this.tinhToanTongTienHoaDon(phien);
        const thoiGianVao = new Date(phien.thoiGianBatDau).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const maHoaDon = `HD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${ban.maBan || 'B' + ban.id}`;

        // Sinh danh sách món
        let danhSachMonHtml = '';
        const cacMonHopLe = phien.danhSachMon.filter(m => m.trangThai !== 'DA_HUY');

        if (cacMonHopLe.length === 0) {
            danhSachMonHtml = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--mau-chu-phu);">Bàn chưa gọi món nào.</td></tr>';
        } else {
            cacMonHopLe.forEach((m, idx) => {
                const thanhTien = m.donGia * m.soLuong;
                danhSachMonHtml += `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td>
                            <strong>${m.tenMon}</strong>
                            ${m.tuyChon ? `<div style="font-size: 11.5px; color: var(--mau-chinh);">${m.tuyChon}</div>` : ''}
                        </td>
                        <td style="text-align: center; font-weight: 700;">${m.soLuong}</td>
                        <td style="text-align: right;">${(m.donGia || 0).toLocaleString()} đ</td>
                        <td style="text-align: right; font-weight: 700;">${thanhTien.toLocaleString()} đ</td>
                    </tr>
                `;
            });
        }

        // Tạo nội dung VietQR động
        const noiDungChuyenKhoan = `QUANMOC ${ban.soBan.replace(/\s+/g,'').toUpperCase()} ${maHoaDon}`;
        const vietQrUrl = window.BoSinhQr 
            ? window.BoSinhQr.layUrlAnhQr(`https://vietqr.me/pay?acc=0987654321&bank=MB&amount=${tinhTien.tongThanhToan}&des=${encodeURIComponent(noiDungChuyenKhoan)}`, 200)
            : `https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${tinhTien.tongThanhToan}&addInfo=${encodeURIComponent(noiDungChuyenKhoan)}`;

        // Tính tiền thừa nếu khách đưa tiền mặt
        const tienThuaTraKhach = Math.max(0, (this.tienKhachDua || 0) - tinhTien.tongThanhToan);

        el.innerHTML = `
            <div class="hop-noi-dung-hoa-don">
                <!-- Tiêu đề hóa đơn -->
                <div class="dau-phieu-hoa-don">
                    <div>
                        <div class="so-ban-hd-lon">${ban.soBan} <span style="font-size: 14px; font-weight: 500; color: var(--mau-chu-phu);">(${ban.maBan})</span></div>
                        <div style="font-size: 12.5px; color: var(--mau-chu-phu); margin-top: 4px;">
                            Mã HĐ: <strong>${maHoaDon}</strong> | Giờ vào: <strong>${thoiGianVao}</strong> | Khách: <strong>${phien.soKhach} người</strong>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="nut nut-phu nut-nho" onclick="window.thanhToanPos.moModalTachHoaDon(${ban.id})" title="Tách món thanh toán riêng (US-108)">
                            ✂️ Tách món (Split Bill)
                        </button>
                        <button class="nut nut-phu nut-nho" onclick="window.thanhToanPos.inPhieuTamTinh()" title="Xem trước và in phiếu tạm tính K80 (US-104)">
                            🖨️ In tạm tính K80
                        </button>
                    </div>
                </div>

                <!-- Bảng chi tiết món ăn (US-102) -->
                <div class="khung-bang-mon-hd">
                    <table class="bang-du-lieu bang-mon-pos">
                        <thead>
                            <tr>
                                <th style="width: 35px; text-align: center;">#</th>
                                <th>Tên món / Tùy chọn</th>
                                <th style="width: 50px; text-align: center;">SL</th>
                                <th style="width: 90px; text-align: right;">Đơn giá</th>
                                <th style="width: 105px; text-align: right;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${danhSachMonHtml}
                        </tbody>
                    </table>
                </div>

                <!-- Khung cấu hình Khuyến mại, Chiết khấu & Phụ phí (US-099 -> US-101) -->
                <div class="khung-cau-hinh-khuyen-mai-pos">
                    <div class="hang-cau-hinh-km">
                        <!-- Voucher -->
                        <div class="o-voucher-pos">
                            <label>🎟️ Mã Voucher (US-100):</label>
                            <div style="display: flex; gap: 6px;">
                                <input type="text" id="nhap-ma-voucher" class="o-nhap-lieu" placeholder="Nhập mã (BANMOI10, MOCVUI50K...)" value="${this.maVoucherApDung}">
                                <button class="nut nut-chinh nut-nho" onclick="window.thanhToanPos.apDungVoucher()">Áp dụng</button>
                                ${this.maVoucherApDung ? `<button class="nut nut-phu nut-nho" onclick="window.thanhToanPos.huyVoucher()">✕</button>` : ''}
                            </div>
                            <div class="danh-sach-tag-voucher-nhanh">
                                <span class="tag-vc" onclick="window.thanhToanPos.dienNhanhVoucher('BANMOI10')">BANMOI10 (-10%)</span>
                                <span class="tag-vc" onclick="window.thanhToanPos.dienNhanhVoucher('MOCVUI50K')">MOCVUI50K (-50k)</span>
                                <span class="tag-vc" onclick="window.thanhToanPos.dienNhanhVoucher('VIP20')">VIP20 (-20%)</span>
                            </div>
                        </div>

                        <!-- Chiết khấu & Phụ phí -->
                        <div class="o-chiet-khau-pos">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div>
                                    <label>Chiết khấu (%):</label>
                                    <input type="number" class="o-nhap-lieu" min="0" max="100" value="${this.chietKhauPhanTram}" onchange="window.thanhToanPos.doiChietKhauPhanTram(this.value)">
                                </div>
                                <div>
                                    <label>Phụ phí (đ):</label>
                                    <input type="number" class="o-nhap-lieu" step="5000" min="0" value="${this.phuPhi}" onchange="window.thanhToanPos.doiPhuPhi(this.value)">
                                </div>
                            </div>
                            <div style="margin-top: 8px;">
                                <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
                                    <input type="checkbox" id="check-vat" ${this.apDungVat ? 'checked' : ''} onchange="window.thanhToanPos.doiVat(this.checked)">
                                    <span>Tính thuế VAT (${this.mucThueVat}%)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bảng tổng hợp số tiền (US-103) -->
                <div class="khung-tong-hop-so-tien-pos">
                    <div class="dong-tien-pos">
                        <span>Tiền món ăn (${cacMonHopLe.length} món):</span>
                        <strong>${tinhTien.tienMon.toLocaleString()} đ</strong>
                    </div>
                    ${tinhTien.giamVoucher > 0 ? `
                        <div class="dong-tien-pos dong-giam-gia">
                            <span>Voucher [${this.maVoucherApDung}]:</span>
                            <strong>-${tinhTien.giamVoucher.toLocaleString()} đ</strong>
                        </div>
                    ` : ''}
                    ${tinhTien.giamChietKhau > 0 ? `
                        <div class="dong-tien-pos dong-giam-gia">
                            <span>Chiết khấu quản lý:</span>
                            <strong>-${tinhTien.giamChietKhau.toLocaleString()} đ</strong>
                        </div>
                    ` : ''}
                    ${tinhTien.tienPhuPhi > 0 ? `
                        <div class="dong-tien-pos">
                            <span>Phụ phí dịch vụ:</span>
                            <strong>+${tinhTien.tienPhuPhi.toLocaleString()} đ</strong>
                        </div>
                    ` : ''}
                    ${tinhTien.tienVat > 0 ? `
                        <div class="dong-tien-pos">
                            <span>Thuế VAT (${this.mucThueVat}%):</span>
                            <strong>+${tinhTien.tienVat.toLocaleString()} đ</strong>
                        </div>
                    ` : ''}
                    <div class="dong-tien-pos dong-tong-thanh-toan">
                        <span>TỔNG CỘNG THANH TOÁN:</span>
                        <div class="so-tien-chot-lon">${tinhTien.tongThanhToan.toLocaleString()} đ</div>
                    </div>
                </div>

                <!-- Phương thức thanh toán (US-105 & US-106) -->
                <div class="khung-phuong-thuc-thanh-toan-pos">
                    <div class="tab-chon-phuong-thuc">
                        <button class="nut-tab-pt ${this.phuongThucThanhToan === 'CHUYEN_KHOAN_VIETQR' ? 'kich-hoat' : ''}" onclick="window.thanhToanPos.doiPhuongThuc('CHUYEN_KHOAN_VIETQR')">
                            📱 Chuyển khoản VietQR (Napas 247)
                        </button>
                        <button class="nut-tab-pt ${this.phuongThucThanhToan === 'TIEN_MAT' ? 'kich-hoat' : ''}" onclick="window.thanhToanPos.doiPhuongThuc('TIEN_MAT')">
                            💵 Tiền mặt tại quầy
                        </button>
                    </div>

                    <!-- Màn hình VietQR -->
                    <div id="man-hinh-vietqr" class="man-hinh-pt" style="display: ${this.phuongThucThanhToan === 'CHUYEN_KHOAN_VIETQR' ? 'flex' : 'none'};">
                        <div class="hop-anh-vietqr">
                            <img src="${vietQrUrl}" alt="VietQR Napas 247" class="anh-qr-dong">
                            <div class="qr-chu-thich">Quét mã bằng mọi App Ngân hàng hoặc Ví điện tử</div>
                        </div>
                        <div class="thong-tin-chuyen-khoan-pos">
                            <div class="dong-tt-ck"><span>Ngân hàng:</span> <strong>MB Bank (Quân Đội)</strong></div>
                            <div class="dong-tt-ck"><span>Số tài khoản:</span> <strong>0987654321</strong></div>
                            <div class="dong-tt-ck"><span>Chủ tài khoản:</span> <strong>NHA HANG QUAN MOC</strong></div>
                            <div class="dong-tt-ck"><span>Số tiền:</span> <strong style="color: var(--mau-chinh); font-size: 16px;">${tinhTien.tongThanhToan.toLocaleString()} đ</strong></div>
                            <div class="dong-tt-ck"><span>Nội dung:</span> <strong style="color: #2563EB;">${noiDungChuyenKhoan}</strong></div>
                        </div>
                    </div>

                    <!-- Màn hình Tiền mặt -->
                    <div id="man-hinh-tien-mat" class="man-hinh-pt" style="display: ${this.phuongThucThanhToan === 'TIEN_MAT' ? 'block' : 'none'};">
                        <div style="display: flex; gap: 14px; align-items: flex-start;">
                            <div style="flex: 1;">
                                <label style="font-weight: 700; margin-bottom: 6px; display: block;">Tiền khách đưa (đ):</label>
                                <input type="number" id="nhap-tien-khach-dua" class="o-nhap-lieu o-tien-lon" value="${this.tienKhachDua || ''}" placeholder="Nhập số tiền..." oninput="window.thanhToanPos.doiTienKhachDua(this.value)">
                                <div class="nhom-menh-gia-nhanh">
                                    <button class="nut-mg" onclick="window.thanhToanPos.dienTienNhanh(${tinhTien.tongThanhToan})">Đủ tiền (${tinhTien.tongThanhToan.toLocaleString()} đ)</button>
                                    <button class="nut-mg" onclick="window.thanhToanPos.dienTienNhanh(500000)">500.000 đ</button>
                                    <button class="nut-mg" onclick="window.thanhToanPos.dienTienNhanh(1000000)">1.000.000 đ</button>
                                    <button class="nut-mg" onclick="window.thanhToanPos.dienTienNhanh(2000000)">2.000.000 đ</button>
                                </div>
                            </div>
                            <div class="hop-tien-thua-pos">
                                <div style="font-size: 13px; color: var(--mau-chu-phu);">Tiền thừa trả khách:</div>
                                <div class="so-tien-thua-lon">${tienThuaTraKhach.toLocaleString()} đ</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Nút hoàn tất thanh toán (US-107, US-109, US-110) -->
                <div class="chan-thanh-toan-pos">
                    <button class="nut nut-phu nut-lon" onclick="window.ungDung.chuyenTab('soDoBanPos')">
                        Quay lại sơ đồ bàn
                    </button>
                    <button class="nut nut-chinh nut-lon nut-chot-thanh-toan" onclick="window.thanhToanPos.xacNhanHoanTatThanhToan(${ban.id}, '${maHoaDon}')">
                        ✓ HOÀN TẤT THANH TOÁN & ĐÓNG BÀN (${tinhTien.tongThanhToan.toLocaleString()} đ)
                    </button>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // XỬ LÝ VOUCHER & KHUYẾN MẠI (US-099, US-100)
    // =========================================================================
    dienNhanhVoucher(ma) {
        const inp = document.getElementById('nhap-ma-voucher');
        if (inp) {
            inp.value = ma;
            this.apDungVoucher();
        }
    }

    apDungVoucher() {
        const ma = (document.getElementById('nhap-ma-voucher')?.value || '').trim().toUpperCase();
        if (!ma) {
            alert('Vui lòng nhập mã Voucher khuyến mại!');
            return;
        }

        const dsKm = this.layDanhSachKhuyenMai();
        const voucher = dsKm.find(v => v.ma === ma && v.trangThai === 1);

        if (!voucher) {
            if (window.thongBao) window.thongBao.thatBai('Mã không hợp lệ', `Mã khuyến mại "${ma}" không tồn tại hoặc đã hết hạn.`);
            return;
        }

        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[this.banIdHienTai];
        const tienMon = phien ? window.soDoBanPos.tinhTongTienBan(phien) : 0;

        if (voucher.donToiThieu && tienMon < voucher.donToiThieu) {
            if (window.thongBao) {
                window.thongBao.canhBao('Chưa đủ điều kiện', `Mã "${voucher.ma}" yêu cầu đơn tối thiểu từ ${voucher.donToiThieu.toLocaleString()} đ (Đơn hiện tại: ${tienMon.toLocaleString()} đ).`);
            }
            return;
        }

        // Tính tiền giảm
        let giam = 0;
        if (voucher.loai === 'PHAN_TRAM') {
            giam = Math.round((tienMon * voucher.giaTri) / 100);
            if (voucher.giamToiDa && giam > voucher.giamToiDa) {
                giam = voucher.giamToiDa;
            }
        } else {
            giam = voucher.giaTri;
        }

        this.maVoucherApDung = voucher.ma;
        this.tienGiamVoucher = giam;

        if (window.thongBao) {
            window.thongBao.thanhCong('Áp dụng Voucher', `Áp dụng thành công mã "${voucher.ma}" giảm ${giam.toLocaleString()} đ.`);
        }
        this.veKhungHoaDon(window.api ? window.api.layDanhSachBanSync?.() || [] : [], dsPhien);
        this.taiVaHienThi();
    }

    huyVoucher() {
        this.maVoucherApDung = '';
        this.tienGiamVoucher = 0;
        this.taiVaHienThi();
    }

    doiChietKhauPhanTram(val) {
        this.chietKhauPhanTram = Math.max(0, Math.min(100, parseFloat(val) || 0));
        this.taiVaHienThi();
    }

    doiPhuPhi(val) {
        this.phuPhi = Math.max(0, parseFloat(val) || 0);
        this.taiVaHienThi();
    }

    doiVat(checked) {
        this.apDungVat = checked;
        this.taiVaHienThi();
    }

    doiPhuongThuc(pt) {
        this.phuongThucThanhToan = pt;
        const mQr = document.getElementById('man-hinh-vietqr');
        const mTm = document.getElementById('man-hinh-tien-mat');
        if (mQr && mTm) {
            mQr.style.display = pt === 'CHUYEN_KHOAN_VIETQR' ? 'flex' : 'none';
            mTm.style.display = pt === 'TIEN_MAT' ? 'block' : 'none';
        }
        document.querySelectorAll('.nut-tab-pt').forEach(b => b.classList.remove('kich-hoat'));
        event.target.classList.add('kich-hoat');
    }

    doiTienKhachDua(val) {
        this.tienKhachDua = parseFloat(val) || 0;
        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[this.banIdHienTai];
        const tinhTien = this.tinhToanTongTienHoaDon(phien);
        const tienThua = Math.max(0, this.tienKhachDua - tinhTien.tongThanhToan);
        const elThua = document.querySelector('.so-tien-thua-lon');
        if (elThua) elThua.textContent = tienThua.toLocaleString() + ' đ';
    }

    dienTienNhanh(soTien) {
        const inp = document.getElementById('nhap-tien-khach-dua');
        if (inp) {
            inp.value = soTien;
            this.doiTienKhachDua(soTien);
        }
    }

    // =========================================================================
    // US-104: XEM TRƯỚC VÀ IN PHIẾU TẠM TÍNH K80 (CSS PRINT)
    // =========================================================================
    async inPhieuTamTinh() {
        const dsBan = await window.api.layDanhSachBan();
        const ban = dsBan.find(b => b.id == this.banIdHienTai);
        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[this.banIdHienTai];
        if (!ban || !phien) return;

        const tinhTien = this.tinhToanTongTienHoaDon(phien);
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        const thoiGianIn = new Date().toLocaleString('vi-VN');
        const user = window.api ? window.api.layThongTinNguoiDung() : null;
        const tenThuNgan = user ? user.hoTen : 'Quân (Thu ngân)';

        let dongMonHtml = '';
        phien.danhSachMon.filter(m => m.trangThai !== 'DA_HUY').forEach((m, idx) => {
            dongMonHtml += `
                <tr>
                    <td>${idx + 1}. ${m.tenMon} ${m.tuyChon ? `(${m.tuyChon})` : ''}</td>
                    <td style="text-align: center;">${m.soLuong}</td>
                    <td style="text-align: right;">${(m.donGia * m.soLuong).toLocaleString()}</td>
                </tr>
            `;
        });

        modal.innerHTML = `
            <div class="hop-modal hop-modal-vua">
                <div class="dau-modal">
                    <h3>🖨️ Phiếu Tạm Tính Khổ Nhiệt 80mm (US-104)</h3>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.dongModal()">✕</button>
                </div>
                <div class="than-modal">
                    <!-- KHUNG IN BILL K80 -->
                    <div id="vung-in-bill-k80" class="khung-bill-in-k80">
                        <div class="bill-header">
                            <h2 style="font-size: 18px; margin-bottom: 2px;">NHÀ HÀNG QUÁN MỘC</h2>
                            <p style="font-size: 11px;">123 Đường Ẩm Thực, Quận 1, TP.HCM</p>
                            <p style="font-size: 11px;">Hotline: 028 1234 5678 - Wi-Fi: QuanMoc_Khach</p>
                            <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                            <h3 style="font-size: 15px; text-transform: uppercase;">PHIẾU TẠM TÍNH</h3>
                            <div style="font-size: 12px; margin-top: 4px;"><strong>${ban.soBan}</strong> (${ban.maBan})</div>
                            <div style="font-size: 11px; color: #555;">In lúc: ${thoiGianIn} | TN: ${tenThuNgan}</div>
                            <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                        </div>

                        <table class="bang-bill-k80">
                            <thead>
                                <tr>
                                    <th style="text-align: left;">Tên món</th>
                                    <th style="width: 35px; text-align: center;">SL</th>
                                    <th style="width: 70px; text-align: right;">T.Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dongMonHtml}
                            </tbody>
                        </table>

                        <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                        <div class="dong-bill-tong"><span>Tổng tiền món:</span> <span>${tinhTien.tienMon.toLocaleString()} đ</span></div>
                        ${tinhTien.giamVoucher > 0 ? `<div class="dong-bill-tong"><span>Voucher [${this.maVoucherApDung}]:</span> <span>-${tinhTien.giamVoucher.toLocaleString()} đ</span></div>` : ''}
                        ${tinhTien.giamChietKhau > 0 ? `<div class="dong-bill-tong"><span>Chiết khấu:</span> <span>-${tinhTien.giamChietKhau.toLocaleString()} đ</span></div>` : ''}
                        ${tinhTien.tienPhuPhi > 0 ? `<div class="dong-bill-tong"><span>Phụ phí:</span> <span>+${tinhTien.tienPhuPhi.toLocaleString()} đ</span></div>` : ''}
                        ${tinhTien.tienVat > 0 ? `<div class="dong-bill-tong"><span>VAT (${this.mucThueVat}%):</span> <span>+${tinhTien.tienVat.toLocaleString()} đ</span></div>` : ''}
                        <div style="border-top: 1px solid #000; margin: 6px 0;"></div>
                        <div class="dong-bill-tong" style="font-size: 14px; font-weight: 800;">
                            <span>TỔNG THANH TOÁN:</span>
                            <span>${tinhTien.tongThanhToan.toLocaleString()} đ</span>
                        </div>
                        <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                        <div class="bill-footer">
                            <p style="font-size: 11px; font-style: italic;">(Phiếu này chỉ dùng để đối soát tạm tính, chưa phải hóa đơn tài chính)</p>
                            <p style="font-size: 12px; font-weight: 700; margin-top: 4px;">CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!</p>
                        </div>
                    </div>
                </div>
                <div class="chan-modal">
                    <button class="nut nut-phu" onclick="window.soDoBanPos.dongModal()">Đóng</button>
                    <button class="nut nut-chinh" onclick="window.thanhToanPos.thucHienLenhIn()">
                        🖨️ In ra máy in nhiệt K80
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    thucHienLenhIn() {
        window.print();
    }

    // =========================================================================
    // US-108: TÁCH MÓN THANH TOÁN RIÊNG (SPLIT BILL)
    // =========================================================================
    async moModalTachHoaDon(banId) {
        const dsBan = await window.api.layDanhSachBan();
        const ban = dsBan.find(b => b.id == banId);
        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[banId];
        if (!ban || !phien) return;

        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        let checkMonHtml = '';
        phien.danhSachMon.filter(m => m.trangThai !== 'DA_HUY').forEach((m) => {
            checkMonHtml += `
                <label style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" name="mon-tach-chon" value="${m.id}" data-gia="${m.donGia * m.soLuong}">
                        <div>
                            <strong>${m.tenMon}</strong>
                            <div style="font-size: 12px; color: var(--mau-chu-phu);">Số lượng: ${m.soLuong} | ${m.tuyChon || 'Tiêu chuẩn'}</div>
                        </div>
                    </div>
                    <span style="font-weight: 700; color: var(--mau-chinh);">${(m.donGia * m.soLuong).toLocaleString()} đ</span>
                </label>
            `;
        });

        modal.innerHTML = `
            <div class="hop-modal hop-modal-vua">
                <div class="dau-modal">
                    <h3>✂️ Tách Món Thanh Toán Riêng (US-108 Split Bill)</h3>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.dongModal()">✕</button>
                </div>
                <div class="than-modal">
                    <p style="font-size: 13.5px; color: var(--mau-chu-phu); margin-bottom: 12px;">
                        Chọn các món khách muốn thanh toán trước để tạo hóa đơn phụ. Các món còn lại vẫn được lưu trên <strong>${ban.soBan}</strong>.
                    </p>
                    <div style="max-height: 250px; overflow-y: auto;">
                        ${checkMonHtml}
                    </div>
                </div>
                <div class="chan-modal">
                    <button class="nut nut-phu" onclick="window.soDoBanPos.dongModal()">Hủy bỏ</button>
                    <button class="nut nut-chinh" onclick="window.thanhToanPos.xacNhanTachMon(${banId})">
                        Tạo hóa đơn phụ cho món đã chọn
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    xacNhanTachMon(banId) {
        const cacMonChon = Array.from(document.querySelectorAll('input[name="mon-tach-chon"]:checked')).map(cb => parseInt(cb.value));

        if (cacMonChon.length === 0) {
            alert('Vui lòng chọn ít nhất 1 món để tách thanh toán!');
            return;
        }

        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[banId];
        if (!phien) return;

        // Tách các món ra
        const cacMonBiTach = phien.danhSachMon.filter(m => cacMonChon.includes(m.id));
        phien.danhSachMon = phien.danhSachMon.filter(m => !cacMonChon.includes(m.id));
        this.luuTatCaPhienBan(dsPhien);

        // Tạo hóa đơn tách và lưu lịch sử
        const tongTienTach = cacMonBiTach.reduce((sum, m) => sum + (m.donGia * m.soLuong), 0);
        const maHdTach = `HD-SPLIT-${Date.now().toString().slice(-6)}`;
        this.luuHoaDon({
            maHoaDon: maHdTach,
            soBan: `Bàn ${banId} (Tách bill)`,
            thoiGianVao: phien.thoiGianBatDau,
            thoiGianThanhToan: new Date().toISOString(),
            tongTienMon: tongTienTach,
            giamGia: 0,
            phuPhi: 0,
            vat: 0,
            tongThanhToan: tongTienTach,
            phuongThuc: 'TIEN_MAT',
            thuNgan: 'Quân (Thu ngân)'
        });

        window.soDoBanPos.dongModal();
        if (window.thongBao) {
            window.thongBao.thanhCong('Tách hóa đơn thành công', `Đã thanh toán riêng phần hóa đơn phụ (${tongTienTach.toLocaleString()} đ). Các món còn lại vẫn giữ tại bàn.`);
        }
        this.taiVaHienThi();
    }

    // =========================================================================
    // US-107, US-109, US-110: HOÀN TẤT THANH TOÁN & ĐÓNG PHIÊN BÀN
    // =========================================================================
    async xacNhanHoanTatThanhToan(banId, maHoaDon) {
        const dsBan = await window.api.layDanhSachBan();
        const ban = dsBan.find(b => b.id == banId);
        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[banId];
        if (!ban || !phien) return;

        const tinhTien = this.tinhToanTongTienHoaDon(phien);

        if (this.phuongThucThanhToan === 'TIEN_MAT' && this.tienKhachDua < tinhTien.tongThanhToan) {
            if (!confirm(`Tiền khách đưa (${(this.tienKhachDua || 0).toLocaleString()} đ) ít hơn tổng thanh toán (${tinhTien.tongThanhToan.toLocaleString()} đ). Bạn có chắc chắn muốn xác nhận không?`)) {
                return;
            }
        }

        // 1. Lưu hóa đơn vào lịch sử (US-107)
        const user = window.api ? window.api.layThongTinNguoiDung() : null;
        this.luuHoaDon({
            maHoaDon: maHoaDon,
            soBan: ban.soBan,
            thoiGianVao: phien.thoiGianBatDau,
            thoiGianThanhToan: new Date().toISOString(),
            tongTienMon: tinhTien.tienMon,
            giamGia: tinhTien.tongGiamGia,
            phuPhi: tinhTien.tienPhuPhi,
            vat: tinhTien.tienVat,
            tongThanhToan: tinhTien.tongThanhToan,
            phuongThuc: this.phuongThucThanhToan,
            thuNgan: user ? user.hoTen : 'Quân (Thu ngân)'
        });

        // 2 & 3. Đóng phiên, giải phóng bàn ăn về Bàn trống và xóa sạch toàn diện đơn hàng (US-109, US-110)
        delete dsPhien[banId];
        delete dsPhien[String(banId)];
        this.luuTatCaPhienBan(dsPhien);

        if (window.api && window.api.hoanTatThanhToanVaGiaiPhongBan) {
            await window.api.hoanTatThanhToanVaGiaiPhongBan(banId, {
                maHoaDon,
                tongThanhToan: tinhTien.tongThanhToan,
                phuongThuc: this.phuongThucThanhToan
            });
        } else {
            ban.trangThai = 'TRONG';
            await window.api.luuDanhSachBan(dsBan);
            if (window.api && window.api.capNhatTrangThaiBan) {
                await window.api.capNhatTrangThaiBan(banId, 'TRONG');
            }
        }

        // Thông báo thành công
        if (window.thongBao) {
            window.thongBao.thanhCong(
                'Thanh toán hoàn tất! 🎉',
                `Đã thanh toán hóa đơn ${maHoaDon} (${tinhTien.tongThanhToan.toLocaleString()} đ). ${ban.soBan} đã được giải phóng về trạng thái Bàn trống.`
            );
        }

        // Reset lựa chọn
        this.banIdHienTai = null;
        this.maVoucherApDung = '';
        this.tienGiamVoucher = 0;
        this.tienKhachDua = 0;

        await this.taiVaHienThi();
    }

    // =========================================================================
    // MODAL LỊCH SỬ HÓA ĐƠN & QUẢN LÝ VOUCHER
    // =========================================================================
    moModalLichSuHoaDon() {
        const ds = this.layLichSuHoaDon();
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        let rowHtml = '';
        if (ds.length === 0) {
            rowHtml = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Chưa có hóa đơn nào được thanh toán.</td></tr>';
        } else {
            ds.forEach((hd, idx) => {
                const tg = new Date(hd.thoiGianThanhToan).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                rowHtml += `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td><strong>${hd.maHoaDon}</strong></td>
                        <td>${hd.soBan}</td>
                        <td>${tg}</td>
                        <td style="text-align: center;"><span class="badge ${hd.phuongThuc === 'CHUYEN_KHOAN_VIETQR' ? 'badge-xanh-duong' : 'badge-xanh-la'}">${hd.phuongThuc === 'CHUYEN_KHOAN_VIETQR' ? 'VietQR' : 'Tiền mặt'}</span></td>
                        <td style="text-align: right; font-weight: 700; color: var(--mau-chinh);">${hd.tongThanhToan.toLocaleString()} đ</td>
                        <td><small>${hd.thuNgan}</small></td>
                    </tr>
                `;
            });
        }

        modal.innerHTML = `
            <div class="hop-modal hop-modal-lon">
                <div class="dau-modal">
                    <h3>📜 Lịch Sử Hóa Đơn Đã Thanh Toán (US-107)</h3>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.dongModal()">✕</button>
                </div>
                <div class="than-modal" style="max-height: 65vh; overflow-y: auto;">
                    <table class="bang-du-lieu">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Mã hóa đơn</th>
                                <th>Bàn</th>
                                <th>Thời gian</th>
                                <th style="text-align: center;">Hình thức</th>
                                <th style="text-align: right;">Tổng thanh toán</th>
                                <th>Thu ngân</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowHtml}
                        </tbody>
                    </table>
                </div>
                <div class="chan-modal">
                    <button class="nut nut-phu" onclick="window.soDoBanPos.dongModal()">Đóng</button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    moModalQuanLyVoucher() {
        const ds = this.layDanhSachKhuyenMai();
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        let rowHtml = '';
        ds.forEach((v, idx) => {
            rowHtml += `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td><strong style="color: var(--mau-chinh);">${v.ma}</strong></td>
                    <td>${v.ten}</td>
                    <td>${v.loai === 'PHAN_TRAM' ? `Giảm ${v.giaTri}%` : `Giảm ${v.giaTri.toLocaleString()} đ`}</td>
                    <td>Đơn từ: ${(v.donToiThieu || 0).toLocaleString()} đ</td>
                    <td><span class="badge badge-xanh-la">Đang áp dụng</span></td>
                </tr>
            `;
        });

        modal.innerHTML = `
            <div class="hop-modal hop-modal-lon">
                <div class="dau-modal">
                    <h3>🎟️ Quản Lý Mã Khuyến Mại & Voucher (US-099)</h3>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.dongModal()">✕</button>
                </div>
                <div class="than-modal" style="max-height: 65vh; overflow-y: auto;">
                    <table class="bang-du-lieu">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Mã Voucher</th>
                                <th>Tên chương trình</th>
                                <th>Mức giảm</th>
                                <th>Điều kiện</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowHtml}
                        </tbody>
                    </table>
                </div>
                <div class="chan-modal">
                    <button class="nut nut-phu" onclick="window.soDoBanPos.dongModal()">Đóng</button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }
}

// Khởi tạo toàn cục
if (typeof window !== 'undefined') {
    window.thanhToanPos = new ThanhToanPosModule();
}
