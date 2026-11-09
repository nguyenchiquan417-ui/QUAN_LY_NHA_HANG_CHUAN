/**
 * MODULE QUẢN LÝ KHU VỰC, BÀN ĂN & XUẤT MÃ QR (quanLyBanQr.js)
 * Đáp ứng toàn bộ các User Story của Quân trong Sprint 1:
 * - US-023: Quản lý khu vực / tầng (Thêm, sửa, xóa)
 * - US-024: Xem danh sách bàn ăn theo từng khu vực
 * - US-025: Thêm bàn ăn mới (số bàn, sức chứa, khu vực)
 * - US-026: Chỉnh sửa thông tin bàn ăn & tạm ngưng sử dụng
 * - US-027: Xóa bàn ăn
 * - US-028: Tự động sinh URL & mã QR riêng cho từng bàn
 * - US-029: Xem trước, tải xuống và in hàng loạt mã QR
 * - US-030: Làm mới mã bảo mật QR bàn
 */

class QuanLyBanQrModule {
    constructor() {
        this.danhSachKhuVuc = [];
        this.danhSachBan = [];
        this.khuVucDangChon = 'ALL';
        this.tuKhoaTimKiem = '';
        this.banDangChon = null;
    }

    async khoiTao() {
        await this.taiDuLieu();
        this.veGiaoDien();
    }

    async taiDuLieu() {
        const dsKv = await window.api.layDanhSachKhuVuc();
        this.danhSachKhuVuc = Array.isArray(dsKv) ? dsKv : [];
        const dsBan = await window.api.layDanhSachBan();
        this.danhSachBan = Array.isArray(dsBan) ? dsBan : [];
    }

    veGiaoDien() {
        const vungChua = document.getElementById('noi-dung-chinh');
        if (!vungChua) return;

        if (!Array.isArray(this.danhSachKhuVuc)) this.danhSachKhuVuc = [];
        if (!Array.isArray(this.danhSachBan)) this.danhSachBan = [];

        // Thống kê nhanh
        const tongBan = this.danhSachBan.length;
        const banTrong = this.danhSachBan.filter(b => b.trangThai === 'TRONG').length;
        const banDangDung = this.danhSachBan.filter(b => b.trangThai === 'DANG_DUNG').length;
        const banKhoa = this.danhSachBan.filter(b => b.trangThai === 'TAM_KHOA').length;

        // Lọc bàn theo khu vực và tìm kiếm
        const tk = (this.tuKhoaTimKiem || '').toLowerCase();
        const banHienThi = this.danhSachBan.filter(ban => {
            const thoaKhuVuc = (this.khuVucDangChon === 'ALL') || (ban.khuVucId === Number(this.khuVucDangChon));
            const soBanStr = (ban.soBan || ban.tenBan || '').toLowerCase();
            const maBanStr = (ban.maBan || '').toLowerCase();
            const thoaTuKhoa = !tk || soBanStr.includes(tk) || maBanStr.includes(tk);
            return thoaKhuVuc && thoaTuKhoa;
        });

        vungChua.innerHTML = `
            <div class="trang-quan-ly-ban">
                <!-- Tiêu đề & Nút thao tác nhanh -->
                <div class="thanh-tieu-de-trang">
                    <div>
                        <h2>🪑 Quản lý Sơ đồ Bàn & Mã QR</h2>
                        <p class="mo-ta-phu">Cấu hình khu vực, sơ đồ bàn và xuất mã QR gọi món tại bàn theo chuẩn E-Menu Quán Mộc</p>
                    </div>
                    <div class="nhom-nut-hanh-dong">
                        <button class="nut nut-phu" onclick="window.quanLyBanQr.moModalQuanLyKhuVuc()">
                            📁 Quản lý Khu vực (${this.danhSachKhuVuc.length})
                        </button>
                        <button class="nut nut-chinh" onclick="window.quanLyBanQr.moModalThemBan()">
                            ➕ Thêm bàn mới
                        </button>
                        <button class="nut nut-in" onclick="window.quanLyBanQr.moModalInHangLoatQr()">
                            🖨️ In hàng loạt QR
                        </button>
                    </div>
                </div>

                <!-- Thẻ thống kê tổng quan -->
                <div class="luoi-thong-ke">
                    <div class="the-chi-so">
                        <div class="so-chi-so">${tongBan}</div>
                        <div class="nhan-chi-so">Tổng số bàn ăn</div>
                    </div>
                    <div class="the-chi-so chi-so-xanh">
                        <div class="so-chi-so">${banTrong}</div>
                        <div class="nhan-chi-so">Bàn đang trống</div>
                    </div>
                    <div class="the-chi-so chi-so-xanh-duong">
                        <div class="so-chi-so">${banDangDung}</div>
                        <div class="nhan-chi-so">Bàn đang dùng bữa</div>
                    </div>
                    <div class="the-chi-so chi-so-xam">
                        <div class="so-chi-so">${banKhoa}</div>
                        <div class="nhan-chi-so">Bàn tạm khóa / Bảo trì</div>
                    </div>
                </div>

                <!-- Bộ lọc khu vực & Tìm kiếm -->
                <div class="thanh-bo-loc">
                    <div class="cac-tab-khu-vuc">
                        <button class="tab-khu-vuc ${this.khuVucDangChon === 'ALL' ? 'kich-hoat' : ''}" 
                                onclick="window.quanLyBanQr.chonKhuVuc('ALL')">
                            Tất cả bàn (${tongBan})
                        </button>
                        ${this.danhSachKhuVuc.map(kv => {
                            const soBanTheoKv = this.danhSachBan.filter(b => b.khuVucId === kv.id).length;
                            const tenKv = kv.ten || kv.tenKhuVuc || `Khu vực ${kv.id}`;
                            return `
                                <button class="tab-khu-vuc ${this.khuVucDangChon === kv.id ? 'kich-hoat' : ''}" 
                                        onclick="window.quanLyBanQr.chonKhuVuc(${kv.id})">
                                    ${window.DinhDang.thoatHtml(tenKv)} (${soBanTheoKv})
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <div class="hop-tim-kiem">
                        <input type="text" placeholder="Tìm số bàn, mã bàn..." 
                               value="${window.DinhDang.thoatHtml(this.tuKhoaTimKiem)}"
                               oninput="window.quanLyBanQr.timKiemBan(this.value)">
                    </div>
                </div>

                <!-- Lưới danh sách bàn ăn (Sơ đồ trực quan) -->
                ${banHienThi.length === 0 ? `
                    <div class="khung-trong">
                        <div class="bieu-tuong-trong">🍽️</div>
                        <h3>Không tìm thấy bàn nào</h3>
                        <p>Chưa có bàn ăn trong khu vực này hoặc không khớp với từ khóa tìm kiếm.</p>
                        <button class="nut nut-chinh" onclick="window.quanLyBanQr.moModalThemBan()">➕ Thêm bàn mới ngay</button>
                    </div>
                ` : `
                    <div class="luoi-the-ban">
                        ${banHienThi.map(ban => this.veTheBan(ban)).join('')}
                    </div>
                `}
            </div>
        `;
    }

    veTheBan(ban) {
        const khuVuc = this.danhSachKhuVuc.find(k => k.id === ban.khuVucId);
        const tenKhuVuc = khuVuc ? (khuVuc.ten || khuVuc.tenKhuVuc) : (ban.khuVucTen || 'Chưa phân khu');
        const tokenBaoMat = ban.qrToken || ban.tokenBaoMat || '';
        const urlQr = window.BoSinhQr.taoDuongDanBanAn(ban.maBan, tokenBaoMat, ban.id);
        const anhQrUrl = window.BoSinhQr.layUrlAnhQr(urlQr, 120);

        const thongTinTrangThai = window.HANG_SO.TRANG_THAI_BAN[ban.trangThai] || window.HANG_SO.TRANG_THAI_BAN.TRONG;

        return `
            <div class="the-ban ${ban.trangThai === 'TAM_KHOA' ? 'the-ban-khoa' : ''}">
                <div class="phan-dau-the-ban">
                    <div>
                        <span class="badge ${thongTinTrangThai.lopBadge}">${thongTinTrangThai.ten}</span>
                        <h3 class="ten-so-ban">${window.DinhDang.thoatHtml(ban.soBan)}</h3>
                        <span class="ma-dinh-danh">${window.DinhDang.thoatHtml(ban.maBan)}</span>
                    </div>
                    <!-- Ảnh QR thu nhỏ có thể click xem to -->
                    <div class="khung-qr-nho" title="Click để phóng to mã QR Standee" onclick="window.quanLyBanQr.xemMaQrBan(${ban.id})">
                        <img src="${anhQrUrl}" alt="QR ${ban.soBan}" loading="lazy" />
                        <span class="chu-xem-qr">Xem QR</span>
                    </div>
                </div>

                <div class="thong-tin-phu-ban">
                    <div class="dong-thong-tin">
                        <span class="nhan">📍 Khu vực:</span>
                        <span class="gia-tri"><strong>${window.DinhDang.thoatHtml(tenKhuVuc)}</strong></span>
                    </div>
                    <div class="dong-thong-tin">
                        <span class="nhan">👥 Sức chứa:</span>
                        <span class="gia-tri">${ban.sucChua} người</span>
                    </div>
                    ${ban.ghiChu ? `
                        <div class="dong-thong-tin">
                            <span class="nhan">📝 Ghi chú:</span>
                            <span class="gia-tri ghi-chu-it">${window.DinhDang.thoatHtml(ban.ghiChu)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="thanh-nut-the-ban">
                    <button class="nut-the nut-xem-qr" onclick="window.quanLyBanQr.xemMaQrBan(${ban.id})" title="Xem trước Standee & In mã">
                        🔍 Standee QR
                    </button>
                    <button class="nut-the nut-sua" onclick="window.quanLyBanQr.moModalSuaBan(${ban.id})" title="Chỉnh sửa thông tin bàn">
                        ✏️ Sửa
                    </button>
                    <button class="nut-the nut-xoa" onclick="window.quanLyBanQr.xoaBan(${ban.id})" title="Xóa bàn này">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    chonKhuVuc(id) {
        this.khuVucDangChon = id;
        this.veGiaoDien();
    }

    timKiemBan(tuKhoa) {
        this.tuKhoaTimKiem = tuKhoa;
        this.veGiaoDien();
    }

    // =========================================================================
    // MODAL XEM MÃ QR STANDEE BÀN (US-028, US-029, US-030)
    // =========================================================================
    xemMaQrBan(banId) {
        const ban = this.danhSachBan.find(b => b.id === banId);
        if (!ban) return;
        this.banDangChon = ban;

        const khuVuc = this.danhSachKhuVuc.find(k => k.id === ban.khuVucId);
        const tenKhuVuc = khuVuc ? (khuVuc.ten || khuVuc.tenKhuVuc) : 'Quán Mộc';
        const tokenBaoMat = ban.qrToken || ban.tokenBaoMat || '';
        const urlQr = window.BoSinhQr.taoDuongDanBanAn(ban.maBan, tokenBaoMat, ban.id);
        const anhQrUrl = window.BoSinhQr.layUrlAnhQr(urlQr, 280);

        const modal = document.getElementById('khung-modal-toan-cuc');
        modal.innerHTML = `
            <div class="hop-modal modal-standee">
                <div class="dau-modal">
                    <h3>🏷️ Mã QR Định Danh Bàn Ăn (US-028 & US-029)</h3>
                    <button class="nut-dong-modal" onclick="window.quanLyBanQr.dongModal()">✕</button>
                </div>

                <div class="than-modal modal-in-standee">
                    <!-- Thẻ Standee Quán Mộc thiết kế chuẩn để bàn -->
                    <div class="the-standee-de-ban" id="standee-ban-in">
                        <div class="standee-header">
                            <div class="standee-logo">🍽️ QUÁN MỘC</div>
                            <div class="standee-slogan">Ẩm Thực Dân Dã & Lẩu Nướng</div>
                        </div>

                        <div class="standee-body">
                            <div class="standee-ten-ban">${window.DinhDang.thoatHtml(ban.soBan)}</div>
                            <div class="standee-khu-vuc">${window.DinhDang.thoatHtml(tenKhuVuc)} • Sức chứa ${ban.sucChua} khách</div>
                            
                            <div class="standee-khung-qr">
                                <img src="${anhQrUrl}" alt="QR ${ban.soBan}" class="standee-anh-qr" />
                            </div>

                            <div class="standee-huong-dan">
                                <span class="nhan-quet">📷 QUÉT MÃ ĐỂ GỌI MÓN</span>
                                <p class="chu-nho">Mở Camera điện thoại để xem E-Menu và đặt món trực tiếp</p>
                            </div>
                        </div>

                        <div class="standee-footer">
                            <div class="thong-tin-wifi">
                                <span>📶 Wi-Fi: <strong>QuanMoc_KhachHang</strong></span> | 
                                <span>Mật khẩu: <strong>quanmoc2026</strong></span>
                            </div>
                            <div class="hop-link-qr" style="margin-top: 10px; padding: 10px 14px; background: rgba(0,0,0,0.04); border-radius: 8px; font-size: 13px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                                <a href="${urlQr}" target="_blank" rel="noopener noreferrer" style="color: #2563EB; text-decoration: underline; word-break: break-all; font-weight: 600;" title="Bấm vào để mở trực tiếp trang E-Menu gọi món">
                                    🔗 ${window.DinhDang.thoatHtml(urlQr)}
                                </a>
                                <button type="button" class="nut nut-phu nut-nho" style="white-space: nowrap; font-size: 12px; padding: 4px 10px;" onclick="navigator.clipboard.writeText('${urlQr}'); if (window.thongBao) window.thongBao.thanhCong('Đã sao chép link gọi món!');">
                                    📋 Sao chép
                                </button>
                            </div>
                            <p style="font-size: 11px; color: var(--mau-chu-phu); margin-top: 6px; line-height: 1.4;">
                                💡 <em>Điện thoại quét mã cần kết nối chung mạng Wi-Fi của quán để mở liên kết nội bộ.</em>
                            </p>
                        </div>
                    </div>
                </div>

                <div class="duoi-modal" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                    <button class="nut" style="background: #10B981; color: #FFF; font-weight: 600;" onclick="window.open('${urlQr}', '_blank')" title="Mở trang E-Menu gọi món trên tab trình duyệt mới">
                        🚀 Mở Link Trực Tiếp (Tab Mới)
                    </button>
                    <button class="nut nut-phu" onclick="window.quanLyBanQr.dongModal(); window.ungDung.chuyenTab('eMenuKhachHang'); window.thucDonQr.khoiTao(${ban.id}, '${tokenBaoMat}')" title="Mô phỏng khách quét QR mở E-Menu bàn này trong Admin">
                        📱 Giả lập Giao diện Mobile
                    </button>
                    <button class="nut nut-canh-bao" onclick="window.quanLyBanQr.lamMoiTokenQr(${ban.id})" title="Tạo mã bảo mật mới ngăn khách cũ đặt từ xa">
                        🔄 Làm mới mã bảo mật (US-030)
                    </button>
                    <button class="nut nut-phu" onclick="window.BoSinhQr.taiAnhVeMay('${anhQrUrl}', 'QR_${ban.maBan}.png')">
                        💾 Tải ảnh PNG
                    </button>
                    <button class="nut nut-chinh" onclick="window.quanLyBanQr.inMotStandee()">
                        🖨️ In Standee Bàn Này
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    // US-030: Làm mới mã bảo mật QR bàn
    async lamMoiTokenQr(banId) {
        if (!confirm('Bạn có chắc chắn muốn làm mới mã bảo mật QR của bàn này?\nMã QR cũ đang dán tại bàn sẽ bị vô hiệu hóa ngay lập tức!')) {
            return;
        }

        const ban = this.danhSachBan.find(b => b.id === banId);
        if (ban) {
            ban.qrToken = 'tok_' + window.DinhDang.taoChuoiNgauNhien(12);
            await window.api.luuDanhSachBan(this.danhSachBan);
            window.thongBao.thanhCong('Đã làm mới mã QR thành công!', `Bàn ${ban.soBan} đã được cấp mã Token bảo mật mới.`);
            this.xemMaQrBan(banId); // Vẽ lại Standee
            this.veGiaoDien();
        }
    }

    inMotStandee() {
        window.print();
    }

    // =========================================================================
    // IN HÀNG LOẠT MÃ QR TOÀN BỘ BÀN (US-029)
    // =========================================================================
    moModalInHangLoatQr() {
        const modal = document.getElementById('khung-modal-toan-cuc');
        const banIn = (this.khuVucDangChon === 'ALL')
            ? this.danhSachBan
            : this.danhSachBan.filter(b => b.khuVucId === Number(this.khuVucDangChon));

        modal.innerHTML = `
            <div class="hop-modal modal-in-hang-loat">
                <div class="dau-modal">
                    <h3>🖨️ Xem Trước & In Hàng Loạt Mã QR Bàn (US-029)</h3>
                    <button class="nut-dong-modal" onclick="window.quanLyBanQr.dongModal()">✕</button>
                </div>

                <div class="thanh-cong-cu-in">
                    <span>Đang chuẩn bị in: <strong>${banIn.length} bàn</strong> (${this.khuVucDangChon === 'ALL' ? 'Tất cả khu vực' : 'Khu vực đang chọn'})</span>
                    <button class="nut nut-chinh" onclick="window.print()">🖨️ Bấm vào đây để In ngay (A4/A6)</button>
                </div>

                <div class="than-modal vung-in-hang-loat-standee">
                    <div class="luoi-in-standee">
                        ${banIn.map(ban => {
                            const kv = this.danhSachKhuVuc.find(k => k.id === ban.khuVucId);
                            const tenKv = kv ? (kv.ten || kv.tenKhuVuc) : 'Quán Mộc';
                            const tokenBaoMat = ban.qrToken || ban.tokenBaoMat || '';
                            const urlQr = window.BoSinhQr.taoDuongDanBanAn(ban.maBan, tokenBaoMat, ban.id);
                            const anhQrUrl = window.BoSinhQr.layUrlAnhQr(urlQr, 200);

                            return `
                                <div class="standee-in-to">
                                    <div class="standee-header">
                                        <div class="standee-logo">🍽️ QUÁN MỘC</div>
                                        <div class="standee-slogan">Ẩm Thực Dân Dã</div>
                                    </div>
                                    <div class="standee-body">
                                        <div class="standee-ten-ban">${window.DinhDang.thoatHtml(ban.soBan)}</div>
                                        <div class="standee-khu-vuc">${window.DinhDang.thoatHtml(tenKv)}</div>
                                        <img src="${anhQrUrl}" alt="QR" class="standee-anh-qr" />
                                        <div class="standee-huong-dan">
                                            <span class="nhan-quet">📷 QUÉT MÃ ĐẶT MÓN</span>
                                        </div>
                                    </div>
                                    <div class="standee-footer">
                                        <div class="thong-tin-wifi">Wi-Fi: <strong>QuanMoc_KhachHang</strong></div>
                                        <div class="link-dinh-danh">${ban.maBan}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    // =========================================================================
    // MODAL THÊM / SỬA BÀN ĂN (US-025 & US-026)
    // =========================================================================
    moModalThemBan() {
        if (!this.danhSachKhuVuc || this.danhSachKhuVuc.length === 0) {
            window.thongBao.canhBao('Chưa có khu vực!', 'Hệ thống chưa có khu vực nào. Vui lòng thêm ít nhất một khu vực (ví dụ: Tầng 1, Tầng 2, Ngoài trời) trước khi thêm bàn ăn.');
            this.moModalQuanLyKhuVuc();
            return;
        }
        this.hienThiModalFormBan(null);
    }

    moModalSuaBan(banId) {
        const ban = this.danhSachBan.find(b => b.id === banId);
        if (!ban) return;
        this.hienThiModalFormBan(ban);
    }

    hienThiModalFormBan(banHienTai) {
        const laThemMoi = !banHienTai;
        const modal = document.getElementById('khung-modal-toan-cuc');

        modal.innerHTML = `
            <div class="hop-modal">
                <div class="dau-modal">
                    <h3>${laThemMoi ? '➕ Thêm Bàn Ăn Mới (US-025)' : '✏️ Chỉnh Sửa Thông Tin Bàn (US-026)'}</h3>
                    <button class="nut-dong-modal" onclick="window.quanLyBanQr.dongModal()">✕</button>
                </div>

                <form id="form-ban-an" onsubmit="window.quanLyBanQr.luuThongTinBan(event, ${laThemMoi ? 'null' : banHienTai.id})">
                    <div class="than-modal">
                        <div class="nhom-nhap-lieu">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label style="margin-bottom: 0;">Khu vực / Tầng <span class="bat-buoc">*</span></label>
                                <button type="button" onclick="window.quanLyBanQr.dongModal(); window.quanLyBanQr.moModalQuanLyKhuVuc();" style="font-size: 12px; color: var(--mau-chinh); background: none; border: none; cursor: pointer; text-decoration: underline;">
                                    📁 Quản lý khu vực
                                </button>
                            </div>
                            <select id="nhap-khu-vuc-ban" required>
                                ${this.danhSachKhuVuc.length === 0 ? '<option value="" disabled selected>⚠️ Chưa có khu vực nào - Bấm Quản lý khu vực để thêm</option>' : ''}
                                ${this.danhSachKhuVuc.map(kv => {
                                    const tenKv = kv.ten || kv.tenKhuVuc || ('Khu vực ' + kv.id);
                                    return `
                                        <option value="${kv.id}" ${banHienTai && (banHienTai.khuVucId === kv.id || banHienTai.khuVucId == kv.id) ? 'selected' : ''}>
                                            ${window.DinhDang.thoatHtml(tenKv)}
                                        </option>
                                    `;
                                }).join('')}
                            </select>
                        </div>

                        <div class="hang-nhap-doi">
                            <div class="nhom-nhap-lieu">
                                <label>Tên / Số bàn <span class="bat-buoc">*</span></label>
                                <input type="text" id="nhap-so-ban" placeholder="Ví dụ: Bàn 01, Bàn VIP 3" 
                                       value="${banHienTai ? window.DinhDang.thoatHtml(banHienTai.soBan) : ''}" required>
                            </div>
                            <div class="nhom-nhap-lieu">
                                <label>Mã định danh bàn <span class="bat-buoc">*</span></label>
                                <input type="text" id="nhap-ma-ban" placeholder="Ví dụ: T1-01, VIP-01" 
                                       value="${banHienTai ? window.DinhDang.thoatHtml(banHienTai.maBan) : ''}" required>
                            </div>
                        </div>

                        <div class="hang-nhap-doi">
                            <div class="nhom-nhap-lieu">
                                <label>Sức chứa (Số khách) <span class="bat-buoc">*</span></label>
                                <input type="number" id="nhap-suc-chua" min="1" max="50" 
                                       value="${banHienTai ? banHienTai.sucChua : 4}" required>
                            </div>
                            <div class="nhom-nhap-lieu">
                                <label>Trạng thái sử dụng</label>
                                <select id="nhap-trang-thai-ban">
                                    <option value="TRONG" ${banHienTai && banHienTai.trangThai === 'TRONG' ? 'selected' : ''}>Bàn trống</option>
                                    <option value="DANG_DUNG" ${banHienTai && banHienTai.trangThai === 'DANG_DUNG' ? 'selected' : ''}>Đang có khách</option>
                                    <option value="TAM_KHOA" ${banHienTai && banHienTai.trangThai === 'TAM_KHOA' ? 'selected' : ''}>Tạm khóa / Bảo trì</option>
                                </select>
                            </div>
                        </div>

                        <div class="nhom-nhap-lieu">
                            <label>Ghi chú vị trí</label>
                            <input type="text" id="nhap-ghi-chu-ban" placeholder="Gần cửa sổ, cạnh ổ cắm điện, view sân khấu..." 
                                   value="${banHienTai ? window.DinhDang.thoatHtml(banHienTai.ghiChu || '') : ''}">
                        </div>
                    </div>

                    <div class="duoi-modal">
                        <button type="button" class="nut nut-phu" onclick="window.quanLyBanQr.dongModal()">Hủy bỏ</button>
                        <button type="submit" class="nut nut-chinh">Lưu thông tin bàn</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.add('mo');
    }

    async luuThongTinBan(event, banId) {
        event.preventDefault();
        const khuVucId = Number(document.getElementById('nhap-khu-vuc-ban').value);
        if (!khuVucId || isNaN(khuVucId)) {
            window.thongBao.canhBao('Chưa chọn khu vực!', 'Vui lòng chọn hoặc thêm khu vực hợp lệ trước khi lưu bàn.');
            return;
        }
        const soBan = document.getElementById('nhap-so-ban').value.trim();
        const maBan = document.getElementById('nhap-ma-ban').value.trim();
        const sucChua = Number(document.getElementById('nhap-suc-chua').value) || 4;
        const trangThai = document.getElementById('nhap-trang-thai-ban').value;
        const ghiChu = document.getElementById('nhap-ghi-chu-ban').value.trim();

        if (banId) {
            // Sửa bàn
            const ban = this.danhSachBan.find(b => b.id === banId);
            if (ban) {
                ban.khuVucId = khuVucId;
                ban.soBan = soBan;
                ban.maBan = maBan;
                ban.sucChua = sucChua;
                ban.trangThai = trangThai;
                ban.ghiChu = ghiChu;
            }
            window.thongBao.thanhCong('Cập nhật bàn thành công!', `Đã lưu thông tin ${soBan}`);
        } else {
            // Thêm mới bàn (Tự động sinh mã token bảo mật QR theo US-028)
            const idMoi = this.danhSachBan.length > 0 ? Math.max(...this.danhSachBan.map(b => b.id)) + 1 : 1;
            const qrToken = 'tok_' + window.DinhDang.taoChuoiNgauNhien(12);

            this.danhSachBan.push({
                id: idMoi,
                khuVucId,
                soBan,
                maBan,
                sucChua,
                qrToken,
                trangThai,
                ghiChu
            });
            window.thongBao.thanhCong('Thêm bàn ăn mới thành công!', `Mã QR tự động đã sẵn sàng cho ${soBan}`);
        }

        await window.api.luuDanhSachBan(this.danhSachBan);
        this.dongModal();
        this.veGiaoDien();
    }

    // US-027: Xóa bàn ăn
    async xoaBan(banId) {
        const ban = this.danhSachBan.find(b => b.id === banId);
        if (!ban) return;

        if (ban.trangThai === 'DANG_DUNG') {
            window.thongBao.canhBao('Không thể xóa bàn!', 'Bàn đang có khách ngồi. Vui lòng thanh toán hoặc chuyển bàn trước khi xóa.');
            return;
        }

        if (confirm(`Bạn có chắc chắn muốn xóa "${ban.soBan}" không?`)) {
            this.danhSachBan = this.danhSachBan.filter(b => b.id !== banId);
            await window.api.luuDanhSachBan(this.danhSachBan);
            window.thongBao.thanhCong('Đã xóa bàn ăn thành công!');
            this.veGiaoDien();
        }
    }

    // =========================================================================
    // QUẢN LÝ KHU VỰC / TẦNG (US-023)
    // =========================================================================
    moModalQuanLyKhuVuc() {
        const modal = document.getElementById('khung-modal-toan-cuc');
        modal.innerHTML = `
            <div class="hop-modal">
                <div class="dau-modal">
                    <h3>📁 Quản Lý Khu Vực & Tầng Nhà Hàng (US-023)</h3>
                    <button class="nut-dong-modal" onclick="window.quanLyBanQr.dongModal()">✕</button>
                </div>

                <div class="than-modal">
                    <!-- Form thêm khu vực -->
                    <div class="hop-them-nhanh">
                        <input type="text" id="nhap-ten-khu-vuc-moi" placeholder="Nhập tên khu vực mới (VD: Tầng lửng, Sân thượng)...">
                        <button class="nut nut-chinh" onclick="window.quanLyBanQr.themKhuVucMoi()">➕ Thêm khu vực</button>
                    </div>

                    <!-- Danh sách khu vực -->
                    <div class="danh-sach-khu-vuc-modal">
                        ${this.danhSachKhuVuc.length === 0 ? '<p style="text-align: center; color: var(--mau-chu-phu); padding: 16px;">Chưa có khu vực nào. Hãy nhập tên ở trên và bấm "Thêm khu vực".</p>' : ''}
                        ${this.danhSachKhuVuc.map(kv => {
                            const soBan = this.danhSachBan.filter(b => b.khuVucId === kv.id).length;
                            const tenKv = kv.ten || kv.tenKhuVuc || `Khu vực ${kv.id}`;
                            return `
                                <div class="hang-khu-vuc">
                                    <div class="thong-tin-kv">
                                        <strong>${window.DinhDang.thoatHtml(tenKv)}</strong>
                                        <span class="chu-phu">(${soBan} bàn)</span>
                                    </div>
                                    <div class="nut-kv">
                                        <button class="nut-icon" onclick="window.quanLyBanQr.suaTenKhuVuc(${kv.id})" title="Đổi tên">✏️</button>
                                        <button class="nut-icon nut-do" onclick="window.quanLyBanQr.xoaKhuVuc(${kv.id})" title="Xóa khu vực">🗑️</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="duoi-modal">
                    <button class="nut nut-chinh" onclick="window.quanLyBanQr.dongModal()">Hoàn tất</button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    async themKhuVucMoi() {
        const input = document.getElementById('nhap-ten-khu-vuc-moi');
        const ten = input.value.trim();
        if (!ten) return;

        const idMoi = this.danhSachKhuVuc.length > 0 ? Math.max(...this.danhSachKhuVuc.map(k => k.id)) + 1 : 1;
        this.danhSachKhuVuc.push({
            id: idMoi,
            ma: `KV_${idMoi}`,
            ten,
            tenKhuVuc: ten,
            moTa: '',
            ghiChu: '',
            thuTu: this.danhSachKhuVuc.length + 1,
            trangThai: 'HoatDong'
        });

        await window.api.luuDanhSachKhuVuc(this.danhSachKhuVuc);
        window.thongBao.thanhCong('Thêm khu vực mới thành công!', `Đã tạo khu vực: ${ten}`);
        this.moModalQuanLyKhuVuc(); // vẽ lại modal
        this.veGiaoDien();
    }

    async suaTenKhuVuc(khuVucId) {
        const kv = this.danhSachKhuVuc.find(k => k.id === khuVucId);
        if (!kv) return;
        const tenMoi = prompt('Nhập tên mới cho khu vực:', kv.ten || kv.tenKhuVuc || '');
        if (tenMoi && tenMoi.trim() && tenMoi.trim() !== (kv.ten || kv.tenKhuVuc)) {
            kv.ten = tenMoi.trim();
            kv.tenKhuVuc = tenMoi.trim();
            await window.api.luuDanhSachKhuVuc(this.danhSachKhuVuc);
            window.thongBao.thanhCong('Đã cập nhật tên khu vực!');
            this.moModalQuanLyKhuVuc();
            this.veGiaoDien();
        }
    }

    async xoaKhuVuc(khuVucId) {
        const soBan = this.danhSachBan.filter(b => b.khuVucId === khuVucId).length;
        if (soBan > 0) {
            window.thongBao.canhBao('Không thể xóa khu vực!', `Khu vực này đang có ${soBan} bàn ăn. Vui lòng chuyển hoặc xóa bàn trước.`);
            return;
        }

        if (confirm('Bạn có chắc chắn muốn xóa khu vực này?')) {
            this.danhSachKhuVuc = this.danhSachKhuVuc.filter(k => k.id !== khuVucId);
            await window.api.luuDanhSachKhuVuc(this.danhSachKhuVuc);
            window.thongBao.thanhCong('Đã xóa khu vực thành công!');
            this.moModalQuanLyKhuVuc();
            this.veGiaoDien();
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

window.quanLyBanQr = new QuanLyBanQrModule();
