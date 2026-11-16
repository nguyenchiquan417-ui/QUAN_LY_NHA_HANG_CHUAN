/**
 * THÀNH PHẦN HỖ TRỢ TẠI BÀN & YÊU CẦU THANH TOÁN (hoTroTaiBan.js)
 * Phụ trách: Phong (Sprint 2 - US-071 -> US-074, US-078)
 * - US-071: Nút nổi "Gọi nhân viên" trên Web E-Menu khi cần hỗ trợ trực tiếp
 * - US-072: Hộp thoại chọn nhanh lý do cần hỗ trợ (bát đũa, khăn giấy, thêm đá...)
 * - US-073: Nút "Yêu cầu thanh toán" kèm phương thức dự kiến (Tiền mặt / Chuyển khoản)
 * - US-074: Nhận phản hồi trên màn hình khi nhân viên tiếp nhận yêu cầu
 * - US-078: Phát âm thanh chuông báo khi có thông báo mới
 */

class HoTroTaiBanComponent {
    constructor() {
        this.banIdHienTai = 3; // Mặc định bàn 03
        this.yeuCauDangCho = [];
        this.daKhoiTao = false;
    }

    /**
     * Khởi tạo widget nút nổi hỗ trợ tại bàn
     */
    khoiTao(banId = 3) {
        this.banIdHienTai = banId;
        this.chenWidgetVaoTrang();
        this.dangKyLangNgheRealtime();
        this.taiDanhSachYeuCau();
        this.daKhoiTao = true;
    }

    /**
     * Thiết lập bàn hiện tại khi khách quét mã hoặc chọn bàn
     */
    datBanHienTai(banId) {
        this.banIdHienTai = Number(banId);
        this.taiDanhSachYeuCau();
    }

    /**
     * Chèn Floating Action Button vào trang
     */
    chenWidgetVaoTrang() {
        if (document.getElementById('khung-nut-noi-ho-tro')) return;

        const container = document.createElement('div');
        container.id = 'khung-nut-noi-ho-tro';
        container.className = 'khung-nut-noi-ho-tro';
        container.innerHTML = `
            <!-- Nút bật/tắt menu hỗ trợ nổi -->
            <div class="menu-ho-tro-noi-cac-nut" id="menu-cac-nut-ho-tro">
                <button type="button" class="nut-noi-con nut-noi-theo-doi-don" onclick="window.hoTroTaiBan.moTrangTheoDoiDon()" title="Xem món đã gọi & Tiến độ (Sprint 2)">
                    <span class="icon-noi">⏱️</span>
                    <span class="chu-noi">Món đã gọi</span>
                </button>
                <button type="button" class="nut-noi-con nut-noi-goi-phuc-vu" onclick="window.hoTroTaiBan.moModalGoiNhanVien()" title="Gọi nhân viên phục vụ">
                    <span class="icon-noi">🙋</span>
                    <span class="chu-noi">Gọi nhân viên</span>
                </button>
                <button type="button" class="nut-noi-con nut-noi-thanh-toan" onclick="window.hoTroTaiBan.moModalYeuCauThanhToan()" title="Yêu cầu thanh toán tại bàn">
                    <span class="icon-noi">💳</span>
                    <span class="chu-noi">Yêu cầu tính tiền</span>
                </button>
            </div>

            <button type="button" class="nut-noi-chinh" id="nut-noi-toggle-ho-tro" onclick="window.hoTroTaiBan.toggleMenu()" title="Hỗ trợ & Thanh toán tại bàn">
                <span class="icon-chuong">🔔</span>
                <span class="badge-so-yeu-cau" id="badge-so-yeu-cau-noi" style="display: none;">0</span>
            </button>
        `;

        document.body.appendChild(container);
    }

    /**
     * Bật/tắt menu nổi
     */
    toggleMenu() {
        const menu = document.getElementById('menu-cac-nut-ho-tro');
        const btn = document.getElementById('nut-noi-toggle-ho-tro');
        if (menu && btn) {
            menu.classList.toggle('hien-thi');
            btn.classList.toggle('dang-mo');
        }
    }

    dongMenu() {
        const menu = document.getElementById('menu-cac-nut-ho-tro');
        const btn = document.getElementById('nut-noi-toggle-ho-tro');
        if (menu && btn) {
            menu.classList.remove('hien-thi');
            btn.classList.remove('dang-mo');
        }
    }

    moTrangTheoDoiDon() {
        this.dongMenu();
        if (window.ungDung) {
            window.ungDung.chuyenTab('theoDoiDonMon');
        }
    }

    /**
     * Lắng nghe các sự kiện thời gian thực
     */
    dangKyLangNgheRealtime() {
        if (!window.socketClient) return;

        // Khi nhân viên tiếp nhận yêu cầu (US-074)
        window.socketClient.khiCoSuKien('hoTro:tiepNhan', (duLieu) => {
            if (Number(duLieu.banId) === Number(this.banIdHienTai)) {
                if (window.thongBao) {
                    window.thongBao.thanhCong(
                        'Nhân viên đang tới!',
                        `Yêu cầu "${duLieu.tenYeuCau}" đã được [${duLieu.nguoiTiepNhan || 'Nhân viên phục vụ'}] tiếp nhận.`
                    );
                }
                this.taiDanhSachYeuCau();
            }
        });

        // Khi Bếp từ chối món do hết nguyên liệu (US-069)
        window.socketClient.khiCoSuKien('order:tuChoiMon', (duLieu) => {
            if (Number(duLieu.banId) === Number(this.banIdHienTai)) {
                this.hienThiPopupTuChoiMon(duLieu);
            }
        });
    }

    /**
     * US-069: Hiển thị popup cảnh báo khi Bếp từ chối món
     */
    hienThiPopupTuChoiMon(duLieu) {
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        modal.innerHTML = `
            <div class="hop-thoai-modal hop-thoai-canh-bao-bep" style="max-width: 460px; text-align: center;">
                <div style="font-size: 54px; margin-bottom: 12px; animation: bounce 1s infinite;">🚫</div>
                <h3 style="color: #DC2626; font-size: 20px; margin-bottom: 8px;">Bếp Thông Báo Hết Món!</h3>
                <p style="font-size: 15px; color: #1F2937; margin-bottom: 12px; font-weight: 600;">
                    Món: <span style="color: #B85D19;">${duLieu.tenMon}</span>
                </p>
                <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: left; font-size: 13px; color: #991B1B;">
                    <strong>Lý do từ bếp:</strong> ${duLieu.lyDo || 'Vừa hết nguyên liệu tươi trong ngày'}
                </div>
                <p style="font-size: 13px; color: #6B7280; margin-bottom: 20px;">
                    Món ăn này đã được tự động trừ khỏi hóa đơn tạm tính của quý khách. Quý khách có thể chọn món thay thế khác trên thực đơn.
                </p>
                <button type="button" class="nut nut-chinh" style="width: 100%;" onclick="window.hoTroTaiBan.dongModal()">
                    Đã hiểu & Chọn món khác
                </button>
            </div>
        `;
        modal.classList.add('mo');
    }

    /**
     * Tải danh sách yêu cầu hỗ trợ hiện có của bàn
     */
    async taiDanhSachYeuCau() {
        if (!window.api) return;
        const ds = await window.api.layDanhSachYeuCauHoTro(this.banIdHienTai);
        this.yeuCauDangCho = ds.filter(y => y.trangThai !== 'DA_XU_LY');

        // Cập nhật badge số yêu cầu
        const badge = document.getElementById('badge-so-yeu-cau-noi');
        if (badge) {
            if (this.yeuCauDangCho.length > 0) {
                badge.textContent = this.yeuCauDangCho.length;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * US-071 & US-072: Mở Modal chọn nhanh lý do gọi nhân viên hỗ trợ
     */
    moModalGoiNhanVien() {
        this.dongMenu();
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        const danhSachLyDo = window.HANG_SO?.LY_DO_HO_TRO || [
            { ma: 'THEM_BAT_DUA', ten: '🥢 Xin thêm bát, đĩa, đũa, thìa' },
            { ma: 'THEM_KHAN_GIAY', ten: '🧻 Xin thêm khăn giấy, tăm' },
            { ma: 'THEM_DA_LANH', ten: '🧊 Xin thêm đá lạnh / nước lọc' },
            { ma: 'THEM_GIA_VI', ten: '🌶️ Xin thêm nước chấm, ớt, chanh' },
            { ma: 'DON_BAN', ten: '🧹 Yêu cầu dọn bàn / lau bàn sạch' },
            { ma: 'GAP_NHAN_VIEN', ten: '🙋 Cần gặp trực tiếp nhân viên' }
        ];

        modal.innerHTML = `
            <div class="hop-thoai-modal hop-thoai-ho-tro">
                <div class="dau-modal">
                    <h3>🙋 Gọi Nhân Viên Hỗ Trợ (Bàn 03)</h3>
                    <button type="button" class="nut-dong-modal" onclick="window.hoTroTaiBan.dongModal()">✕</button>
                </div>
                <div class="than-modal">
                    <p style="font-size: 13px; color: var(--mau-chu-phu); margin-bottom: 16px;">
                        Vui lòng chọn nhu cầu hỗ trợ để nhân viên phục vụ chuẩn bị chu đáo và mang đến tận bàn cho bạn:
                    </p>

                    <!-- Danh sách nút chọn nhanh lý do (US-072) -->
                    <div class="luoi-ly-do-ho-tro">
                        ${danhSachLyDo.map((ld, idx) => `
                            <label class="the-ly-do-ho-tro ${idx === 0 ? 'da-chon' : ''}">
                                <input type="radio" name="lyDoHoTro" value="${ld.ma}" ${idx === 0 ? 'checked' : ''} onchange="window.hoTroTaiBan.chonLyDo(this)">
                                <span class="ten-ly-do">${ld.ten}</span>
                            </label>
                        `).join('')}
                    </div>

                    <div class="nhom-form" style="margin-top: 16px;">
                        <label class="nhan-form">Ghi chú cụ thể thêm (tùy chọn):</label>
                        <input type="text" id="ghi-chu-ho-tro" class="nhap-du-lieu" placeholder="Ví dụ: Xin thêm 2 đôi đũa và 1 chén nước mắm ớt...">
                    </div>
                </div>
                <div class="duoi-modal">
                    <button type="button" class="nut nut-phu" onclick="window.hoTroTaiBan.dongModal()">Hủy bỏ</button>
                    <button type="button" class="nut nut-chinh" onclick="window.hoTroTaiBan.xacNhanGuiYeuCauHoTro()">
                        🚀 Gửi yêu cầu ngay
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    chonLyDo(input) {
        document.querySelectorAll('.the-ly-do-ho-tro').forEach(el => el.classList.remove('da-chon'));
        if (input.checked) {
            input.closest('.the-ly-do-ho-tro').classList.add('da-chon');
        }
    }

    /**
     * Xác nhận gửi yêu cầu hỗ trợ (US-071, US-072)
     */
    async xacNhanGuiYeuCauHoTro() {
        const inputRadio = document.querySelector('input[name="lyDoHoTro"]:checked');
        const loaiYeuCau = inputRadio ? inputRadio.value : 'GAP_NHAN_VIEN';
        const ghiChu = document.getElementById('ghi-chu-ho-tro')?.value.trim() || '';

        const kq = await window.api.guiYeuCauHoTroTaiBan(this.banIdHienTai, loaiYeuCau, ghiChu);
        this.dongModal();

        if (kq && kq.ok) {
            if (window.thongBao) {
                window.thongBao.thanhCong('Đã gửi yêu cầu!', kq.msg);
            }
            this.taiDanhSachYeuCau();
            // Nếu đang mở trang theo dõi đơn món thì refresh lại
            if (window.theoDoiDonMonModule) {
                window.theoDoiDonMonModule.taiDuLieuVaVe();
            }
        } else {
            if (window.thongBao) {
                window.thongBao.thatBai('Không thể gửi', kq ? kq.msg : 'Có lỗi xảy ra');
            }
        }
    }

    /**
     * US-073: Mở Modal yêu cầu thanh toán
     */
    async moModalYeuCauThanhToan() {
        this.dongMenu();
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        // Lấy tạm tính
        const kqDon = await window.api.layDanhSachDonTheoBan(this.banIdHienTai);
        const tongTien = kqDon.ok ? kqDon.data.tongTienLuyKe : 0;
        const cauHinh = await window.api.layCauHinhHeThong();
        const nganHang = cauHinh.nganHang || {};
        const dsBan = await window.api.layDanhSachBanAn();
        const ban = dsBan.find(b => Number(b.id) === Number(this.banIdHienTai));
        const tenBan = ban ? ban.soBan : `Bàn ${this.banIdHienTai}`;
        const soMonChoBung = kqDon.ok && kqDon.data.thongKe ? (kqDon.data.thongKe.daXong || 0) : 0;

        modal.innerHTML = `
            <div class="hop-thoai-modal hop-thoai-thanh-toan-ban">
                <div class="dau-modal">
                    <h3>💳 Yêu Cầu Thanh Toán (${tenBan})</h3>
                    <button type="button" class="nut-dong-modal" onclick="window.hoTroTaiBan.dongModal()">✕</button>
                </div>
                <div class="than-modal">
                    <div class="hop-tong-tien-thanh-toan">
                        <span class="nhan-tong">Tổng tiền tạm tính lũy kế:</span>
                        <span class="so-tien-tong">${tongTien.toLocaleString('vi-VN')} đ</span>
                    </div>
                    ${soMonChoBung > 0 ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 12.5px; color: #b45309;">🔔 <strong>Lưu ý:</strong> Bàn còn <strong>${soMonChoBung} món</strong> Bếp đã nấu xong và nhân viên đang bưng ra. Bàn sẽ không bị dọn khi gọi thanh toán.</div>` : ''}

                    <p style="font-size: 13px; color: var(--mau-chu-phu); margin-bottom: 12px;">
                        Vui lòng chọn hình thức thanh toán mong muốn:
                    </p>

                    <div class="luoi-phuong-thuc-thanh-toan">
                        <label class="the-phuong-thuc da-chon">
                            <input type="radio" name="phuongThucThanhToan" value="TIEN_MAT" checked onchange="window.hoTroTaiBan.chonPhuongThuc(this)">
                            <div class="icon-pt">💵</div>
                            <div class="tt-pt">
                                <strong>Tiền mặt tại bàn</strong>
                                <small>Nhân viên mang hóa đơn và tiền thối ra bàn</small>
                            </div>
                        </label>

                        <label class="the-phuong-thuc">
                            <input type="radio" name="phuongThucThanhToan" value="CHUYEN_KHOAN" onchange="window.hoTroTaiBan.chonPhuongThuc(this)">
                            <div class="icon-pt">📲</div>
                            <div class="tt-pt">
                                <strong>Chuyển khoản VietQR</strong>
                                <small>Quét mã VietQR ${nganHang.tenNganHang || 'Napas 247'}</small>
                            </div>
                        </label>
                    </div>

                    <div class="nhom-form" style="margin-top: 14px;">
                        <label class="nhan-form">Yêu cầu đặc biệt về hóa đơn (tùy chọn):</label>
                        <input type="text" id="ghi-chu-thanh-toan" class="nhap-du-lieu" placeholder="Ví dụ: Cần xuất hóa đơn VAT công ty, thanh toán riêng đồ uống...">
                    </div>
                </div>
                <div class="duoi-modal">
                    <button type="button" class="nut nut-phu" onclick="window.hoTroTaiBan.dongModal()">Hủy bỏ</button>
                    <button type="button" class="nut nut-chinh" onclick="window.hoTroTaiBan.xacNhanGuiYeuCauThanhToan()">
                        ✅ Xác nhận gọi thanh toán
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    chonPhuongThuc(input) {
        document.querySelectorAll('.the-phuong-thuc').forEach(el => el.classList.remove('da-chon'));
        if (input.checked) {
            input.closest('.the-phuong-thuc').classList.add('da-chon');
        }
    }

    /**
     * Xác nhận gửi yêu cầu thanh toán (US-073)
     */
    async xacNhanGuiYeuCauThanhToan() {
        const inputRadio = document.querySelector('input[name="phuongThucThanhToan"]:checked');
        const phuongThuc = inputRadio ? inputRadio.value : 'TIEN_MAT';
        const ghiChu = document.getElementById('ghi-chu-thanh-toan')?.value.trim() || '';

        const kq = await window.api.guiYeuCauThanhToan(this.banIdHienTai, phuongThuc, ghiChu);
        this.dongModal();

        if (kq && kq.ok) {
            if (window.thongBao) {
                window.thongBao.thanhCong('Đã gửi yêu cầu thanh toán!', kq.msg);
            }
            this.taiDanhSachYeuCau();
            if (window.theoDoiDonMonModule) {
                window.theoDoiDonMonModule.taiDuLieuVaVe();
            }
        }
    }

    dongModal() {
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (modal) {
            modal.classList.remove('mo');
            modal.innerHTML = '';
        }
    }
}

// Khởi tạo đối tượng toàn cục
window.hoTroTaiBan = new HoTroTaiBanComponent();
