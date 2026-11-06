/**
 * PHÂN HỆ ĐIỀU PHỐI BẾP (KITCHEN DISPLAY SYSTEM - KDS) (dieuPhoiBep.js)
 * Phụ trách: Phong (Sprint 3 Lead - US-079 -> US-088)
 * 
 * Đáp ứng đầy đủ các User Story của Sprint 3:
 * - US-079: Xem danh sách các đơn đặt món mới chuyển xuống Bếp theo thứ tự thời gian (FIFO).
 * - US-080: Xem chi tiết món ăn, số lượng, số bàn và ghi chú khẩu vị nổi bật (dị ứng, không cay...).
 * - US-081: Gom nhóm tổng số lượng món giống nhau từ nhiều bàn để chế biến cùng lúc (Batch Cooking).
 * - US-082: Chuyển trạng thái món ăn từ "Chờ chế biến" sang "Đang chế biến" (1-chạm hoặc cả phiếu).
 * - US-083: Đánh dấu hoàn thành từng món ăn hoặc hoàn thành toàn bộ phiếu order.
 * - US-084: Thông báo cho bộ phận Phục vụ biết món ăn đã sẵn sàng để bưng ra bàn.
 * - US-085: Cảnh báo màu sắc đối với các đơn hàng chờ quá thời gian quy định (<10p, 10-20p, >20p báo động).
 * - US-086: Xem lại lịch sử các món Bếp vừa hoàn thành trong ca làm việc.
 * - US-087: Nhân viên Bếp bật/tắt nhanh trạng thái "Hết món" ngay trên màn hình KDS.
 * - US-088: Hộp thoại Bếp từ chối món trong đơn mới kèm lý do và gửi cảnh báo về Thu ngân/Khách.
 */

class DieuPhoiBepModule {
    constructor() {
        this.cheDoXem = 'THE_DON'; // 'THE_DON' | 'GOM_MON' | 'LICH_SU' | 'HET_MON'
        this.cheDoXemLichSu = 'THE_DON'; // 'THE_DON' | 'BANG_MON'
        this.boLocTrangThai = 'TAT_CA'; // 'TAT_CA' | 'CHO_CHE_BIEN' | 'DANG_CHE_BIEN' | 'DA_XONG' | 'DA_HOAN_TAT'
        this.boLocKhuVuc = 'ALL';
        this.kieuSapXep = 'THEO_BAN'; // 'THEO_BAN' | 'UU_TIEN_NAU' | 'FIFO'
        this.tuKhoaMonHet = '';
        this.danhMucMonHet = 'ALL';
        this.danhSachDon = [];
        this.danhSachMonThucDon = [];
        this.danhSachBan = [];
        this.dangLangNghe = false;
        this.dongHoInterval = null;
        this.amThanhBat = true;

        // Dữ liệu cho modal từ chối món (US-088)
        this.monDangTuChoi = null;
    }

    /**
     * Khởi tạo phân hệ KDS Bếp
     */
    async khoiTao() {
        this.dangKySuKienSocket();
        await this.taiDuLieu();
        this.render();
        this.khoiDongDongHoCapNhatThoiGian();
    }

    /**
     * Hủy interval khi chuyển trang
     */
    huyDongHo() {
        if (this.dongHoInterval) {
            clearInterval(this.dongHoInterval);
            this.dongHoInterval = null;
        }
    }

    /**
     * Đồng hồ chạy ngầm mỗi 1 giây để cập nhật thời gian trôi qua và đổi màu cảnh báo (US-085)
     */
    khoiDongDongHoCapNhatThoiGian() {
        this.huyDongHo();
        this.dongHoInterval = setInterval(() => {
            if (this.cheDoXem === 'THE_DON') {
                this.capNhatThoiGianChoTrucTiep();
            }
        }, 1000);
    }

    /**
     * Đăng ký lắng nghe các sự kiện thời gian thực từ SocketClient (US-075 -> US-078)
     */
    dangKySuKienSocket() {
        if (this.dangLangNghe || !window.socketClient) return;

        // Đơn mới từ khách hàng hoặc thu ngân (US-075)
        window.socketClient.khiCoSuKien('order:moi', (donMoi) => {
            this.taiDuLieuVaCapNhatGiaoDien();
            if (this.amThanhBat && window.socketClient) {
                window.socketClient.phatAmThanh('chuongBao');
            }
            if (window.thongBao) {
                window.thongBao.thongTin('🛎️ Đơn đặt món mới!', `${donMoi.soBan || ('Bàn ' + donMoi.banId)} vừa gửi ${donMoi.danhSachMon?.length || 1} món xuống bếp.`);
            }
        });

        // Cập nhật trạng thái món (từ thu ngân, khách hủy, bếp khác)
        window.socketClient.khiCoSuKien('order:capNhatTrangThai', () => {
            this.taiDuLieuVaCapNhatGiaoDien();
        });

        // Khách hủy món
        window.socketClient.khiCoSuKien('order:huyMon', (data) => {
            this.taiDuLieuVaCapNhatGiaoDien();
            if (window.thongBao) {
                window.thongBao.canhBao('❌ Khách hủy món', `Bàn ${data.banId} vừa yêu cầu hủy món.`);
            }
        });

        // Cập nhật hết món từ quản lý thực đơn
        window.socketClient.khiCoSuKien('thucDon:hetMon', () => {
            this.taiDuLieuVaCapNhatGiaoDien();
        });

        this.dangLangNghe = true;
    }

    /**
     * Tải dữ liệu toàn bộ đơn đặt món và thực đơn
     */
    async taiDuLieu() {
        if (window.api) {
            this.danhSachDon = (await window.api.layTatCaDonGoiMon()) || [];
            this.danhSachMonThucDon = (await window.api.layDanhSachMonAn()) || [];
            this.danhSachBan = window.api.layDanhSachBan ? (await window.api.layDanhSachBan()) : (window.api.layDanhSachBanAn ? (await window.api.layDanhSachBanAn()) : []);
        }

        // Kiểm tra an toàn dữ liệu mảng
        if (!Array.isArray(this.danhSachDon)) this.danhSachDon = [];
        if (!Array.isArray(this.danhSachMonThucDon)) this.danhSachMonThucDon = [];
        if (!Array.isArray(this.danhSachBan)) this.danhSachBan = [];

        // Chuẩn hóa và làm sạch dữ liệu đơn hàng
        this.danhSachDon.forEach(don => {
            if (!don) return;
            if (!don.thoiGianTao) {
                don.thoiGianTao = don.thoiGianDat || don.thoiGian || new Date().toISOString().replace('T', ' ').substring(0, 19);
            }
            const banTim = (this.danhSachBan || []).find(b => Number(b.id) === Number(don.banId));
            if (banTim) {
                if (!don.soBan || (don.soBan.startsWith('Bàn ') && banTim.soBan && !banTim.soBan.startsWith('Bàn '))) {
                    don.soBan = banTim.soBan || banTim.tenBan;
                }
                if (!don.khuVucTen || (don.khuVucTen === 'Tầng 1' && banTim.khuVucTen && banTim.khuVucTen !== 'Tầng 1')) {
                    don.khuVucTen = banTim.khuVucTen || banTim.tenKhuVuc;
                }
            }
            if (!don.khuVucTen) don.khuVucTen = 'Tầng 1';
            if (!Array.isArray(don.danhSachMon)) don.danhSachMon = [];
            don.danhSachMon.forEach(m => {
                if (!m) return;
                if (!m.trangThai) m.trangThai = 'CHO_XAC_NHAN';
                // Đồng bộ từ ngữ trạng thái
                if (m.trangThai === 'CHO_CHE_BIEN') m.trangThai = 'CHO_XAC_NHAN';
                else if (m.trangThai === 'DA_CHE_BIEN') m.trangThai = 'DA_XONG';
                else if (m.trangThai === 'DA_PHUC_VU') m.trangThai = 'DA_LEN_MON';
            });
        });

        // Tự động kiểm tra: nếu chưa có đơn nào đang chờ hoặc toàn bộ đã xong, tạo mẫu đơn chờ sinh động
        this.kiemTraVaBoSungDonMauNeuCan();
    }

    async taiDuLieuVaCapNhatGiaoDien() {
        await this.taiDuLieu();
        this.render();
    }

    /**
     * Bổ sung đơn mẫu có trạng thái chờ chế biến để dễ dàng kiểm thử KDS
     */
    kiemTraVaBoSungDonMauNeuCan() {
        if (!Array.isArray(this.danhSachDon)) this.danhSachDon = [];
        const coDonCho = this.danhSachDon.some(don => 
            don && Array.isArray(don.danhSachMon) && don.danhSachMon.some(m => m && (m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'DANG_CHE_BIEN'))
        );

        if (!coDonCho && this.danhSachDon.length === 0) {
            this.taoDonHangMauTest();
        }
    }

    /**
     * US-085: Tính số phút đã trôi qua từ lúc tạo đơn
     */
    tinhSoPhutTroiQua(thoiGianTaoStr) {
        if (!thoiGianTaoStr) return 0;
        try {
            const str = String(thoiGianTaoStr).replace(' ', 'T');
            const thoiGianTao = new Date(str).getTime();
            if (isNaN(thoiGianTao)) return 0;
            const hienTai = Date.now();
            const phut = Math.floor((hienTai - thoiGianTao) / (1000 * 60));
            return isNaN(phut) ? 0 : Math.max(0, phut);
        } catch {
            return 0;
        }
    }

    /**
     * Định dạng chuỗi mm:ss trôi qua
     */
    dinhDangThoiGianTroiQua(thoiGianTaoStr) {
        if (!thoiGianTaoStr) return '00:00';
        try {
            const str = String(thoiGianTaoStr).replace(' ', 'T');
            const thoiGianTao = new Date(str).getTime();
            if (isNaN(thoiGianTao)) return '00:00';
            const hienTai = Date.now();
            const tongGiay = Math.max(0, Math.floor((hienTai - thoiGianTao) / 1000));
            const phut = Math.floor(tongGiay / 60);
            const giay = tongGiay % 60;
            return `${phut < 10 ? '0' + phut : phut}:${giay < 10 ? '0' + giay : giay}`;
        } catch {
            return '00:00';
        }
    }

    /**
     * US-085: Cảnh báo màu sắc theo thời gian chờ:
     * - < 10 phút: Bình thường (xanh / xám)
     * - 10 - 20 phút: Cảnh báo (vàng cam)
     * - > 20 phút: Quá hạn nguy cấp (đỏ đậm nhấp nháy)
     */
    layThongTinCanhBaoThoiGian(thoiGianTaoStr, don = null) {
        const soPhut = this.tinhSoPhutTroiQua(thoiGianTaoStr);

        // Kiểm tra xem đơn đã nấu xong hết hoặc đã phục vụ hết chưa
        if (don && Array.isArray(don.danhSachMon) && don.danhSachMon.length > 0) {
            const coMonCanNau = don.danhSachMon.some(m => 
                m && (m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'CHO_CHE_BIEN' || m.trangThai === 'DANG_CHE_BIEN')
            );
            const coMonChoBung = don.danhSachMon.some(m => 
                m && (m.trangThai === 'DA_XONG' || m.trangThai === 'DA_CHE_BIEN')
            );

            // Nếu không còn món nào cần nấu
            if (!coMonCanNau) {
                if (coMonChoBung) {
                    return {
                        capDo: 'DA_XONG_CHO_BUNG',
                        lopCss: 'kds-card-cho-bung',
                        lopBadge: 'badge-xanh-duong',
                        icon: '🔔',
                        nhan: `ĐÃ NẤU XONG - CHỜ BƯNG (${soPhut}p)`
                    };
                } else {
                    return {
                        capDo: 'DA_HOAN_TAT',
                        lopCss: 'kds-card-hoan-tat',
                        lopBadge: 'badge-xanh-la',
                        icon: '✅',
                        nhan: `ĐÃ PHỤC VỤ XONG`
                    };
                }
            }
        }

        if (soPhut >= 20) {
            return {
                capDo: 'DO_KHAN_CAP',
                lopCss: 'kds-card-qua-han',
                lopBadge: 'badge-do-nhap-nhay',
                icon: '🔥',
                nhan: `QUÁ HẠN (${soPhut}p) - NẤU GẤP!`
            };
        } else if (soPhut >= 10) {
            return {
                capDo: 'VANG_CANH_BAO',
                lopCss: 'kds-card-canh-bao',
                lopBadge: 'badge-vang',
                icon: '⚠️',
                nhan: `Đang chờ (${soPhut}p)`
            };
        } else {
            return {
                capDo: 'BINH_THUONG',
                lopCss: 'kds-card-binh-thuong',
                lopBadge: 'badge-xanh-la',
                icon: '⏱️',
                nhan: `Mới nhận (${soPhut}p)`
            };
        }
    }

    /**
     * Cập nhật thời gian sống động trên từng card mà không cần re-render toàn bộ DOM
     */
    capNhatThoiGianChoTrucTiep() {
        const cacPhanTuDongHo = document.querySelectorAll('.kds-dong-ho-troi-qua[data-time]');
        cacPhanTuDongHo.forEach(el => {
            const timeStr = el.getAttribute('data-time');
            const chuoiMmSs = this.dinhDangThoiGianTroiQua(timeStr);
            const phut = this.tinhSoPhutTroiQua(timeStr);
            el.textContent = `⏱️ ${chuoiMmSs}`;

            // Cập nhật card border nếu vượt ngưỡng (chỉ áp dụng cho đơn chưa nấu xong)
            const cardEl = el.closest('.kds-order-card');
            if (cardEl && !cardEl.classList.contains('kds-card-cho-bung') && !cardEl.classList.contains('kds-card-hoan-tat')) {
                if (phut >= 20) {
                    cardEl.classList.remove('kds-card-binh-thuong', 'kds-card-canh-bao');
                    cardEl.classList.add('kds-card-qua-han');
                } else if (phut >= 10) {
                    cardEl.classList.remove('kds-card-binh-thuong', 'kds-card-qua-han');
                    cardEl.classList.add('kds-card-canh-bao');
                }
            }
        });
    }

    /**
     * Render toàn bộ giao diện màn hình KDS
     */
    render() {
        const vungChua = document.getElementById('noi-dung-chinh');
        if (!vungChua) return;

        // Tính các số liệu thống kê ca bếp
        let tongMonCho = 0;
        let tongMonDangNau = 0;
        let tongMonQuaHan = 0;
        let tongMonHoanThanh = 0;

        (this.danhSachDon || []).forEach(don => {
            if (!don) return;
            const thoiGianStr = don.thoiGianTao || don.thoiGianDat || don.thoiGian;
            const phut = this.tinhSoPhutTroiQua(thoiGianStr);
            (don.danhSachMon || []).forEach(m => {
                if (!m) return;
                const tt = m.trangThai;
                if (tt === 'CHO_XAC_NHAN' || tt === 'CHO_CHE_BIEN') {
                    tongMonCho += Number(m.soLuong || 1);
                    if (phut >= 20) tongMonQuaHan += Number(m.soLuong || 1);
                } else if (tt === 'DANG_CHE_BIEN') {
                    tongMonDangNau += Number(m.soLuong || 1);
                    if (phut >= 20) tongMonQuaHan += Number(m.soLuong || 1);
                } else if (tt === 'DA_XONG' || tt === 'DA_CHE_BIEN' || tt === 'DA_LEN_MON' || tt === 'DA_PHUC_VU') {
                    tongMonHoanThanh += Number(m.soLuong || 1);
                }
            });
        });

        // Lấy danh sách khu vực để lọc
        const cacKhuVuc = [...new Set((this.danhSachDon || []).map(d => d && d.khuVucTen).filter(Boolean))];

        vungChua.innerHTML = `
            <div class="kds-container">
                <!-- THANH TIÊU ĐỀ & THỐNG KÊ KDS BẾP -->
                <div class="kds-header-top">
                    <div class="kds-title-area">
                        <div class="kds-title-badge">
                            <span class="pulse-dot"></span>
                            <span>KDS REAL-TIME</span>
                        </div>
                        <h2>👨‍🍳 ĐIỀU PHỐI BẾP (KITCHEN DISPLAY SYSTEM)</h2>
                        <p class="kds-sub-title">Điều phối chế biến theo thứ tự thời gian (FIFO) • Gom mẻ nấu • Kiểm soát hết món</p>
                    </div>

                    <!-- Thống kê nhanh chỉ số KDS -->
                    <div class="kds-stats-bar">
                        <div class="kds-stat-item kds-stat-cho">
                            <div class="kds-stat-val">${tongMonCho}</div>
                            <div class="kds-stat-label">⏳ Chờ chế biến</div>
                        </div>
                        <div class="kds-stat-item kds-stat-nau">
                            <div class="kds-stat-val">${tongMonDangNau}</div>
                            <div class="kds-stat-label">👨‍🍳 Đang nấu</div>
                        </div>
                        <div class="kds-stat-item ${tongMonQuaHan > 0 ? 'kds-stat-alert-active' : 'kds-stat-alert'}">
                            <div class="kds-stat-val">${tongMonQuaHan}</div>
                            <div class="kds-stat-label">🔥 Quá hạn (>20p)</div>
                        </div>
                        <div class="kds-stat-item kds-stat-xong">
                            <div class="kds-stat-val">${tongMonHoanThanh}</div>
                            <div class="kds-stat-label">✅ Đã xong trong ca</div>
                        </div>
                    </div>

                    <!-- Bộ nút điều khiển nhanh -->
                    <div class="kds-quick-actions">
                        <button class="nut ${this.amThanhBat ? 'nut-xanh' : 'nut-phu'} nut-nho" onclick="window.dieuPhoiBepModule.chuyenTrangThaiAmThanh()" title="Bật/Tắt chuông báo âm thanh">
                            ${this.amThanhBat ? '🔔 Chuông: BẬT' : '🔕 Chuông: TẮT'}
                        </button>
                        <button class="nut nut-phu nut-nho" onclick="window.dieuPhoiBepModule.taiDuLieuVaCapNhatGiaoDien()" title="Làm mới dữ liệu từ hệ thống">
                            🔄 Làm mới
                        </button>
                        <button class="nut nut-cam nut-nho" onclick="window.dieuPhoiBepModule.taoDonHangMauTest()" title="Tạo thêm 1 đơn đặt món mới để test hiển thị FIFO và cảnh báo">
                            ➕ Thêm đơn test
                        </button>
                    </div>
                </div>

                <!-- THANH ĐIỀU HƯỚNG TAB CHỨC NĂNG CỦA PHONG (SPRINT 3) -->
                <div class="kds-nav-tabs">
                    <button class="kds-tab-btn ${this.cheDoXem === 'THE_DON' ? 'kich-hoat' : ''}" onclick="window.dieuPhoiBepModule.chuyenCheDoXem('THE_DON')">
                        📋 Thẻ Đơn Hàng FIFO (US-079, US-080)
                        <span class="kds-tab-counter">${this.laySoDonDangXuLy()}</span>
                    </button>
                    <button class="kds-tab-btn ${this.cheDoXem === 'GOM_MON' ? 'kich-hoat' : ''}" onclick="window.dieuPhoiBepModule.chuyenCheDoXem('GOM_MON')">
                        🥘 Gom Món Nấu Cùng Lúc (US-081)
                        <span class="kds-tab-counter">${tongMonCho + tongMonDangNau}</span>
                    </button>
                    <button class="kds-tab-btn ${this.cheDoXem === 'LICH_SU' ? 'kich-hoat' : ''}" onclick="window.dieuPhoiBepModule.chuyenCheDoXem('LICH_SU')">
                        📜 Lịch Sử Món Đã Xong (US-086)
                        <span class="kds-tab-counter kds-counter-green">${this.laySoDonDaHoanTat()}</span>
                    </button>
                    <button class="kds-tab-btn ${this.cheDoXem === 'HET_MON' ? 'kich-hoat' : ''}" onclick="window.dieuPhoiBepModule.chuyenCheDoXem('HET_MON')">
                        🚫 Kiểm Soát Hết Món (US-087)
                        <span class="kds-tab-counter kds-counter-orange">${this.laySoMonDangHet()}</span>
                    </button>
                </div>

                <!-- NỘI DUNG TƯƠNG ỨNG THEO TAB -->
                <div class="kds-tab-content">
                    ${this.renderNoiDungTheoTab(cacKhuVuc)}
                </div>
            </div>
        `;
    }

    /**
     * Gộp tất cả các đơn / lượt gọi món của CÙNG 1 BÀN thành MỘT BILL DUY NHẤT
     */
    gopDonTheoBan(danhSach) {
        if (!Array.isArray(danhSach)) return [];
        const banMap = new Map();
        const danhSachGop = [];

        danhSach.forEach(don => {
            if (!don) return;
            const soBanSo = this.laySoThuTuBan(don);
            const banKey = don.banId ? Number(don.banId) : soBanSo;

            if (!banMap.has(banKey)) {
                const banTimThay = (this.danhSachBan || []).find(b => Number(b.id) === Number(banKey));
                let tenBanChuan = don.soBan || don.tenBan;
                if (!tenBanChuan && banTimThay) {
                    tenBanChuan = banTimThay.soBan || banTimThay.tenBan;
                }
                if (!tenBanChuan) {
                    tenBanChuan = `Bàn ${String(soBanSo).padStart(2, "0")}`;
                }

                let khuVucChuan = don.khuVucTen || don.tenKhuVuc;
                if ((!khuVucChuan || khuVucChuan === 'Tầng 1') && banTimThay) {
                    khuVucChuan = banTimThay.khuVucTen || banTimThay.tenKhuVuc || khuVucChuan;
                }
                if (!khuVucChuan) khuVucChuan = 'Tầng 1';

                const donGop = {
                    ...don,
                    id: don.id,
                    banId: banKey,
                    soBan: tenBanChuan,
                    khuVucTen: khuVucChuan,
                    cacDonGocIds: [don.id],
                    cacMaDon: don.maDon ? [don.maDon] : [],
                    soLuotGoi: 1,
                    danhSachMon: [...(don.danhSachMon || [])]
                };
                banMap.set(banKey, donGop);
                danhSachGop.push(donGop);
            } else {
                const donGop = banMap.get(banKey);
                if ((!donGop.soBan || donGop.soBan.startsWith('Bàn ')) && don.soBan && !don.soBan.startsWith('Bàn ')) {
                    donGop.soBan = don.soBan;
                }
                if ((!donGop.khuVucTen || donGop.khuVucTen === 'Tầng 1') && don.khuVucTen && don.khuVucTen !== 'Tầng 1') {
                    donGop.khuVucTen = don.khuVucTen;
                }
                if (!donGop.cacDonGocIds.includes(don.id)) {
                    donGop.cacDonGocIds.push(don.id);
                }
                if (don.maDon && !donGop.cacMaDon.includes(don.maDon)) {
                    donGop.cacMaDon.push(don.maDon);
                }
                donGop.soLuotGoi += 1;

                (don.danhSachMon || []).forEach(m => {
                    const daTonTai = donGop.danhSachMon.some(ex => 
                        (m.id && Number(ex.id) === Number(m.id))
                    );
                    if (!daTonTai) {
                        donGop.danhSachMon.push(m);
                    }
                });

                const timeDon = new Date(String(don.thoiGianTao || don.thoiGianDat || '').replace(' ', 'T')).getTime() || 0;
                const timeGop = new Date(String(donGop.thoiGianTao || donGop.thoiGianDat || '').replace(' ', 'T')).getTime() || 0;
                if (timeDon > 0 && (timeGop === 0 || timeDon < timeGop)) {
                    donGop.thoiGianTao = don.thoiGianTao || don.thoiGianDat;
                }
            }
        });

        return danhSachGop;
    }

    /**
     * Lấy số bàn đang có bill cần bếp xử lý hoặc chờ phục vụ bưng món
     */
    laySoDonDangXuLy() {
        if (!Array.isArray(this.danhSachDon)) return 0;
        const dsDangXuLy = this.danhSachDon.filter(don => 
            don && Array.isArray(don.danhSachMon) && don.danhSachMon.length > 0 &&
            don.danhSachMon.some(m => m && (
                m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'CHO_CHE_BIEN' ||
                m.trangThai === 'DANG_CHE_BIEN' ||
                m.trangThai === 'DA_XONG' || m.trangThai === 'DA_CHE_BIEN'
            ))
        );
        return this.gopDonTheoBan(dsDangXuLy).length;
    }

    /**
     * Lấy số bàn đã hoàn thành và bưng món xong toàn bộ
     */
    laySoDonDaHoanTat() {
        if (!Array.isArray(this.danhSachDon)) return 0;
        const dsHoanTat = this.danhSachDon.filter(don => 
            don && Array.isArray(don.danhSachMon) && don.danhSachMon.length > 0 &&
            don.danhSachMon.every(m => m && (
                m.trangThai === 'DA_LEN_MON' || m.trangThai === 'DA_PHUC_VU' ||
                m.trangThai === 'DA_HUY' || m.trangThai === 'TU_CHOI'
            ))
        );
        return this.gopDonTheoBan(dsHoanTat).length;
    }

    /**
     * Lấy số món đang tạm hết
     */
    laySoMonDangHet() {
        if (!Array.isArray(this.danhSachMonThucDon)) return 0;
        return this.danhSachMonThucDon.filter(m => m && (m.trangThai === 0 || m.trangThai === 'HET_HANG' || m.conHang === false)).length;
    }

    chuyenCheDoXem(cheDo) {
        this.cheDoXem = cheDo;
        this.render();
    }

    chuyenTrangThaiAmThanh() {
        this.amThanhBat = !this.amThanhBat;
        if (window.thongBao) {
            window.thongBao.thongTin('Cài đặt âm thanh', this.amThanhBat ? 'Đã BẬT chuông báo khi có đơn mới & hoàn thành món.' : 'Đã TẮT chuông báo.');
        }
        this.render();
    }

    /**
     * Render nội dung theo chế độ xem
     */
    renderNoiDungTheoTab(cacKhuVuc) {
        if (this.cheDoXem === 'THE_DON') {
            return this.renderTabTheDonFifo(cacKhuVuc);
        } else if (this.cheDoXem === 'GOM_MON') {
            return this.renderTabGomMon();
        } else if (this.cheDoXem === 'LICH_SU') {
            return this.renderTabLichSuXong();
        } else if (this.cheDoXem === 'HET_MON') {
            return this.renderTabKiemSoatHetMon();
        }
        return '';
    }

    /* ==========================================================================
       TAB 1: THẺ ĐƠN HÀNG THEO THỨ TỰ THỜI GIAN (FIFO) (US-079, US-080, US-082 -> US-085)
       ========================================================================== */
    renderTabTheDonFifo(cacKhuVuc) {
        // Tách các đơn:
        // 1. Đơn đang hoạt động trong bếp (còn món chờ, đang nấu, hoặc đã nấu xong chờ phục vụ bưng)
        const kiemTraDonDangXuLy = (d) => {
            if (!d || !Array.isArray(d.danhSachMon) || d.danhSachMon.length === 0) return false;
            return d.danhSachMon.some(m => m && (
                m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'CHO_CHE_BIEN' ||
                m.trangThai === 'DANG_CHE_BIEN' ||
                m.trangThai === 'DA_XONG' || m.trangThai === 'DA_CHE_BIEN'
            ));
        };

        // 2. Đơn đã hoàn tất toàn bộ (tất cả các món đã lên bàn DA_LEN_MON / DA_PHUC_VU hoặc DA_HUY / TU_CHOI)
        const kiemTraDonHoanTat = (d) => {
            if (!d || !Array.isArray(d.danhSachMon) || d.danhSachMon.length === 0) return false;
            return d.danhSachMon.every(m => m && (
                m.trangThai === 'DA_LEN_MON' || m.trangThai === 'DA_PHUC_VU' ||
                m.trangThai === 'DA_HUY' || m.trangThai === 'TU_CHOI'
            ));
        };

        // GỘP CÁC LƯỢT GỌI MÓN VÀ CÁC ĐƠN CỦA CÙNG 1 BÀN THÀNH 1 BILL DUY NHẤT
        const dsDonDangXuLy = this.gopDonTheoBan((this.danhSachDon || []).filter(kiemTraDonDangXuLy));
        const dsDonDaHoanTat = this.gopDonTheoBan((this.danhSachDon || []).filter(kiemTraDonHoanTat));

        // Mặc định: Chỉ hiển thị các đơn đang cần xử lý (loại bỏ đơn đã bưng xong khỏi bảng FIFO)
        let danhSachHienThi = [];
        if (this.boLocTrangThai === 'DA_HOAN_TAT') {
            danhSachHienThi = [...dsDonDaHoanTat];
        } else {
            danhSachHienThi = [...dsDonDangXuLy];
        }
        this.danhSachDonGopHienThi = danhSachHienThi;

        // Lọc theo khu vực
        if (this.boLocKhuVuc !== 'ALL') {
            danhSachHienThi = danhSachHienThi.filter(d => d.khuVucTen === this.boLocKhuVuc);
        }

        // Lọc theo trạng thái
        if (this.boLocTrangThai === 'CHO_CHE_BIEN') {
            danhSachHienThi = danhSachHienThi.filter(d => 
                (d.danhSachMon || []).some(m => m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'CHO_CHE_BIEN')
            );
        } else if (this.boLocTrangThai === 'DANG_CHE_BIEN') {
            danhSachHienThi = danhSachHienThi.filter(d => 
                (d.danhSachMon || []).some(m => m.trangThai === 'DANG_CHE_BIEN')
            );
        } else if (this.boLocTrangThai === 'DA_XONG') {
            danhSachHienThi = danhSachHienThi.filter(d => 
                (d.danhSachMon || []).some(m => m.trangThai === 'DA_XONG' || m.trangThai === 'DA_CHE_BIEN')
            );
        }

        // Đếm số đơn theo từng trạng thái để hiển thị trên pill
        const soDonCho = dsDonDangXuLy.filter(d => (d.danhSachMon || []).some(m => m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'CHO_CHE_BIEN')).length;
        const soDonDangNau = dsDonDangXuLy.filter(d => (d.danhSachMon || []).some(m => m.trangThai === 'DANG_CHE_BIEN')).length;
        const soDonChoBung = dsDonDangXuLy.filter(d => (d.danhSachMon || []).some(m => m.trangThai === 'DA_XONG' || m.trangThai === 'DA_CHE_BIEN')).length;

        // Sắp xếp đơn hàng logic theo Bàn & Nghiệp vụ bếp
        danhSachHienThi.sort((a, b) => {
            if (this.kieuSapXep === 'THEO_BAN') {
                // 1. Ưu tiên số bàn tăng dần (Bàn 01 -> Bàn 02 -> Bàn 03 -> ... -> Bàn 11)
                const soBanA = this.laySoThuTuBan(a);
                const soBanB = this.laySoThuTuBan(b);
                if (soBanA !== soBanB) return soBanA - soBanB;

                // 2. Nếu cùng bàn: xếp theo Lượt gọi (Lượt 1 trước, Lượt 2 sau)
                const luotA = Number(a.luotGoi || 1);
                const luotB = Number(b.luotGoi || 1);
                if (luotA !== luotB) return luotA - luotB;

                // 3. Nếu cùng lượt: đơn cũ hơn xếp trước
                const timeA = new Date(String(a.thoiGianTao || a.thoiGianDat || a.thoiGian || '').replace(' ', 'T')).getTime() || 0;
                const timeB = new Date(String(b.thoiGianTao || b.thoiGianDat || b.thoiGian || '').replace(' ', 'T')).getTime() || 0;
                return timeA - timeB;
            } else if (this.kieuSapXep === 'UU_TIEN_NAU') {
                // Đơn còn món chờ nấu / đang nấu được ưu tiên lên đầu
                const conMonA = (a.danhSachMon || []).some(m => m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'CHO_CHE_BIEN' || m.trangThai === 'DANG_CHE_BIEN') ? 1 : 0;
                const conMonB = (b.danhSachMon || []).some(m => m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'CHO_CHE_BIEN' || m.trangThai === 'DANG_CHE_BIEN') ? 1 : 0;
                if (conMonA !== conMonB) return conMonB - conMonA;

                const soBanA = this.laySoThuTuBan(a);
                const soBanB = this.laySoThuTuBan(b);
                if (soBanA !== soBanB) return soBanA - soBanB;
                return (Number(a.luotGoi || 1) - Number(b.luotGoi || 1));
            } else {
                // FIFO: Thời gian gọi cũ nhất lên trước
                const timeA = new Date(String(a.thoiGianTao || a.thoiGianDat || a.thoiGian || '').replace(' ', 'T')).getTime() || 0;
                const timeB = new Date(String(b.thoiGianTao || b.thoiGianDat || b.thoiGian || '').replace(' ', 'T')).getTime() || 0;
                return timeA - timeB;
            }
        });

        return `
            <!-- Thanh bộ lọc đơn hàng KDS -->
            <div class="kds-filter-bar">
                <div class="kds-filter-group">
                    <span class="kds-filter-label">Bộ lọc trạng thái:</span>
                    <button class="nut-loc-pill ${this.boLocTrangThai === 'TAT_CA' ? 'kich-hoat' : ''}" onclick="window.dieuPhoiBepModule.doiBoLocTrangThai('TAT_CA')">
                        🔥 Đang làm (${dsDonDangXuLy.length})
                    </button>
                    <button class="nut-loc-pill ${this.boLocTrangThai === 'CHO_CHE_BIEN' ? 'kich-hoat' : ''}" onclick="window.dieuPhoiBepModule.doiBoLocTrangThai('CHO_CHE_BIEN')">
                        ⏳ Chờ chế biến (${soDonCho})
                    </button>
                    <button class="nut-loc-pill ${this.boLocTrangThai === 'DANG_CHE_BIEN' ? 'kich-hoat' : ''}" onclick="window.dieuPhoiBepModule.doiBoLocTrangThai('DANG_CHE_BIEN')">
                        👨‍🍳 Đang chế biến (${soDonDangNau})
                    </button>
                    <button class="nut-loc-pill ${this.boLocTrangThai === 'DA_XONG' ? 'kich-hoat' : ''}" onclick="window.dieuPhoiBepModule.doiBoLocTrangThai('DA_XONG')">
                        🔔 Đã xong (Chờ bưng) (${soDonChoBung})
                    </button>
                    <button class="nut-loc-pill ${this.boLocTrangThai === 'DA_HOAN_TAT' ? 'kich-hoat' : ''}" onclick="window.dieuPhoiBepModule.doiBoLocTrangThai('DA_HOAN_TAT')">
                        ✅ Đã bưng xong (${dsDonDaHoanTat.length})
                    </button>
                </div>

                <div class="kds-filter-group">
                    <span class="kds-filter-label">Khu vực:</span>
                    <select class="o-nhap o-nhap-nho" onchange="window.dieuPhoiBepModule.doiBoLocKhuVuc(this.value)">
                        <option value="ALL">Tất cả khu vực</option>
                        ${cacKhuVuc.map(kv => `<option value="${kv}" ${this.boLocKhuVuc === kv ? 'selected' : ''}>${kv}</option>`).join('')}
                    </select>
                </div>

                <div class="kds-filter-group">
                    <span class="kds-filter-label">Sắp xếp:</span>
                    <select class="o-nhap o-nhap-nho" onchange="window.dieuPhoiBepModule.doiKieuSapXep(this.value)">
                        <option value="THEO_BAN" ${this.kieuSapXep === 'THEO_BAN' ? 'selected' : ''}>🏷️ Số Bàn (Bàn 01 ➔ 12)</option>
                        <option value="UU_TIEN_NAU" ${this.kieuSapXep === 'UU_TIEN_NAU' ? 'selected' : ''}>🔥 Cần nấu gấp lên đầu</option>
                        <option value="FIFO" ${this.kieuSapXep === 'FIFO' ? 'selected' : ''}>⏱️ Thời gian đặt (FIFO)</option>
                    </select>
                </div>
            </div>

            <!-- LƯỚI THẺ ĐƠN HÀNG FIFO (ORDER CARDS) -->
            ${danhSachHienThi.length === 0 ? `
                <div class="khung-trong" style="margin-top: 30px;">
                    <div style="font-size: 50px; margin-bottom: 12px;">👨‍🍳</div>
                    <h3>Hiện không có đơn hàng nào đang chờ xử lý!</h3>
                    <p style="color: var(--mau-chu-phu); margin: 8px 0 20px;">Tất cả các món đã được nấu xong và bưng ra bàn cho khách.</p>
                    <button class="nut nut-chinh" onclick="window.dieuPhoiBepModule.taoDonHangMauTest()">
                        ➕ Bấm vào đây để tạo 1 Đơn Đặt Món Mẫu (Kiểm thử KDS)
                    </button>
                </div>
            ` : `
                <div class="kds-cards-grid">
                    ${danhSachHienThi.map((don, viTri) => this.renderTheDonHang(don, viTri)).join('')}
                </div>
            `}
        `;
    }

    
    /**
     * Tách số thứ tự bàn từ chuỗi tên bàn (ví dụ 'Bàn 01' -> 1, 'Bàn 11' -> 11)
     */
    laySoThuTuBan(don) {
        if (!don) return 999;
        const text = String(don.soBan || don.banId || '');
        const match = text.match(/\d+/);
        return match ? parseInt(match[0], 10) : 999;
    }

    doiKieuSapXep(kieu) {
        this.kieuSapXep = kieu;
        this.render();
    }

    doiBoLocTrangThai(tt) {
        this.boLocTrangThai = tt;
        this.render();
    }

    doiBoLocKhuVuc(kv) {
        this.boLocKhuVuc = kv;
        this.render();
    }

    /**
     * Render một thẻ đơn hàng (Order Card)
     */
    renderTheDonHang(don, viTri) {
        const danhSachMon = don.danhSachMon || [];
        const thoiGianStr = don.thoiGianTao || don.thoiGianDat || don.thoiGian || '';
        const thongTinCanhBao = this.layThongTinCanhBaoThoiGian(thoiGianStr, don);
        const thoiGianTroiQua = this.dinhDangThoiGianTroiQua(thoiGianStr);

        // Kiểm tra số món theo trạng thái trong thẻ
        const monCho = danhSachMon.filter(m => m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'CHO_CHE_BIEN').length;
        const monDangNau = danhSachMon.filter(m => m.trangThai === 'DANG_CHE_BIEN').length;
        const monDaXong = danhSachMon.filter(m => m.trangThai === 'DA_XONG' || m.trangThai === 'DA_CHE_BIEN').length;

        // Trạng thái chung của thẻ
        let tongSoMonConLai = monCho + monDangNau;
        const tongSoLuongPhan = danhSachMon.reduce((sum, m) => sum + (Number(m.soLuong) || 1), 0);
        const monChuaXongDs = danhSachMon.filter(m => m.trangThai !== 'DA_XONG' && m.trangThai !== 'DA_CHE_BIEN' && m.trangThai !== 'DA_LEN_MON');
        const soPhanChuaXong = monChuaXongDs.reduce((sum, m) => sum + (Number(m.soLuong) || 1), 0);

        return `
            <div class="kds-order-card ${thongTinCanhBao.lopCss}" id="card-don-${don.id}">
                <!-- ĐẦU THẺ ORDER (CARD HEADER) -->
                <div class="kds-card-head">
                    <div class="kds-card-head-top">
                        <div class="kds-table-badge">
                            <span class="kds-table-title">${don.soBan || ('Bàn ' + don.banId)}</span>
                            <span class="kds-table-area">${don.khuVucTen || 'Khu vực chính'}</span>
                        </div>
                        <div class="kds-fifo-badge" title="Thứ tự nhận đơn theo chuẩn FIFO (First-In, First-Out)">
                            ${this.kieuSapXep === 'FIFO' ? `#FIFO ${viTri + 1}` : `#${viTri + 1}`}
                        </div>
                    </div>

                    <div class="kds-card-info-row">
                        <div class="kds-order-code">
                            <span>Mã: <strong>${don.cacMaDon && don.cacMaDon.length > 1 ? don.cacMaDon[0] + ' (+' + (don.cacMaDon.length - 1) + ')' : don.maDon}</strong></span>
                            <span class="kds-luot-badge">${don.soLuotGoi && don.soLuotGoi > 1 ? `${don.soLuotGoi} lượt (Gộp 1 Bill)` : `Lượt ${don.luotGoi || 1}`}</span>
                        </div>
                        <div class="kds-time-badge ${thongTinCanhBao.lopBadge}">
                            <span class="kds-dong-ho-troi-qua" data-time="${thoiGianStr}">⏱️ ${thoiGianTroiQua}</span>
                        </div>
                    </div>

                    <!-- US-085: Thông báo cảnh báo quá thời gian -->
                    <div class="kds-alert-pill ${thongTinCanhBao.lopBadge}">
                        ${thongTinCanhBao.icon} ${thongTinCanhBao.nhan} • Gửi lúc ${thoiGianStr ? String(thoiGianStr).substring(11, 16) : ''}
                    </div>

                    ${don.ghiChuDon ? `
                        <div class="kds-order-general-note">
                            📝 <strong>Ghi chú đơn:</strong> ${don.ghiChuDon}
                        </div>
                    ` : ''}

                    <!-- NÚT THAO TÁC TOÀN BỘ PHIẾU (US-082, US-083) -->
                    <div class="kds-batch-card-actions">
                        ${monCho > 0 ? `
                            <button class="nut nut-nho nut-chinh kds-btn-batch" onclick="window.dieuPhoiBepModule.batDauNauCaPhieu('${don.id}')" title="Nhận nấu tất cả các món đang chờ trong phiếu này">
                                🔥 Nấu tất cả (${monCho})
                            </button>
                        ` : ''}
                        ${monDangNau > 0 ? `
                            <button class="nut nut-nho nut-xanh kds-btn-batch" onclick="window.dieuPhoiBepModule.hoanThanhCaPhieu('${don.id}')" title="Đánh dấu hoàn thành toàn bộ phiếu và báo Phục vụ">
                                ✅ Xong tất cả (${monDangNau})
                            </button>
                        ` : ''}
                        ${monCho === 0 && monDangNau === 0 && monDaXong > 0 ? `
                            <button class="nut nut-nho nut-xanh kds-btn-batch" onclick="window.dieuPhoiBepModule.xacNhanDaLenMonCaPhieu('${don.id}')" title="Xác nhận Phục vụ đã bưng toàn bộ món lên bàn (Chuyển đơn sang Lịch sử)">
                                🏃 Bưng tất cả (${monDaXong}) • Xong đơn
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- DANH SÁCH MÓN ĂN TRONG ĐƠN (US-080) -->
                <div class="kds-card-items-list">
                    ${danhSachMon.map(mon => this.renderDongMonAn(mon, don)).join('')}
                </div>

                <!-- CHÂN THẺ -->
                <div class="kds-card-foot">
                    <div class="kds-card-summary">
                        <span>Tổng: <strong>${danhSachMon.length} món (${tongSoLuongPhan} phần)</strong></span>
                        <span style="color: ${tongSoMonConLai === 0 && monDaXong === 0 ? '#10B981' : (tongSoMonConLai === 0 ? '#3B82F6' : '#F59E0B')}; font-weight: 600;">
                            ${tongSoMonConLai === 0 && monDaXong === 0 
                                ? '🎉 Đã hoàn tất & bưng lên bàn' 
                                : (tongSoMonConLai === 0 
                                    ? `🔔 Nấu xong, chờ bưng (${monDaXong} món)` 
                                    : `Còn ${tongSoMonConLai} món (${soPhanChuaXong} phần) chưa nấu`)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render từng dòng món ăn trong thẻ đơn hàng (US-080, US-082, US-083, US-084, US-088)
     */
    renderDongMonAn(mon, don) {
        const trangThai = mon.trangThai || 'CHO_XAC_NHAN';
        const thongTinTrangThai = window.HANG_SO?.TRANG_THAI_MON_GOI?.[trangThai] || 
            (trangThai === 'CHO_CHE_BIEN' ? window.HANG_SO?.TRANG_THAI_MON_GOI?.CHO_XAC_NHAN :
            (trangThai === 'DA_CHE_BIEN' ? window.HANG_SO?.TRANG_THAI_MON_GOI?.DA_XONG :
            (trangThai === 'DA_PHUC_VU' ? window.HANG_SO?.TRANG_THAI_MON_GOI?.DA_LEN_MON : null))) || {
            ten: trangThai,
            mau: '#6B7280',
            icon: '📋',
            lopBadge: 'badge-xam'
        };

        const coGhiChuDacBiet = Boolean(mon.ghiChu && mon.ghiChu.trim());
        const tenMonEscaped = String(mon.tenMon || '').replace(/'/g, "\\'");
        const soBanEscaped = String(don.soBan || ('Bàn ' + don.banId)).replace(/'/g, "\\'");
        const isCho = (trangThai === 'CHO_XAC_NHAN' || trangThai === 'CHO_CHE_BIEN');
        const isDangNau = (trangThai === 'DANG_CHE_BIEN');
        const isXong = (trangThai === 'DA_XONG' || trangThai === 'DA_CHE_BIEN');
        const isLenMon = (trangThai === 'DA_LEN_MON' || trangThai === 'DA_PHUC_VU');

        return `
            <div class="kds-item-row kds-status-${String(trangThai).toLowerCase()}" id="mon-${mon.id}">
                <!-- CỘT SỐ LƯỢNG NỔI BẬT -->
                <div class="kds-item-qty-box">
                    <span class="kds-qty-badge">x${mon.soLuong || 1}</span>
                </div>

                <!-- THÔNG TIN MÓN & GHI CHÚ KHẨU VỊ NỔI BẬT (US-080) -->
                <div class="kds-item-content">
                    <div class="kds-item-title-row">
                        <span class="kds-dish-name">${mon.tenMon}</span>
                        <span class="badge ${thongTinTrangThai.lopBadge} kds-item-status-badge">
                            ${thongTinTrangThai.icon} ${thongTinTrangThai.ten}
                        </span>
                    </div>

                    <!-- Size & Topping -->
                    ${(mon.size || mon.topping) ? `
                        <div class="kds-item-options">
                            ${mon.size ? `<span class="kds-option-pill">🏷️ ${mon.size}</span>` : ''}
                            ${mon.topping ? `<span class="kds-option-pill">✨ ${mon.topping}</span>` : ''}
                        </div>
                    ` : ''}

                    <!-- US-080: GHI CHÚ KHẨU VỊ NỔI BẬT (DỊ ỨNG, KHÔNG CAY...) -->
                    ${coGhiChuDacBiet ? `
                        <div class="kds-item-highlight-note">
                            <span class="kds-note-icon">⚠️ Ghi chú khách:</span>
                            <span class="kds-note-text">${mon.ghiChu}</span>
                        </div>
                    ` : ''}

                    <!-- Hiển thị lý do từ chối nếu có -->
                    ${mon.trangThai === 'TU_CHOI' ? `
                        <div class="canh-bao-bep-tu-choi-box">
                            🚫 Đã từ chối: ${mon.lyDoTuChoi || 'Hết nguyên liệu trong ngày'}
                        </div>
                    ` : ''}

                    <!-- Hiển thị lý do hủy nếu có -->
                    ${mon.trangThai === 'DA_HUY' ? `
                        <div class="canh-bao-huy-box">
                            ❌ Đã hủy: ${mon.lyDoHuy || 'Khách đổi ý'}
                        </div>
                    ` : ''}
                </div>

                <!-- CÁC NÚT THAO TÁC 1-CHẠM TRÊN TỪNG MÓN -->
                <div class="kds-item-actions">
                    ${isCho ? `
                        <button class="nut nut-chinh nut-nho kds-btn-action" onclick="window.dieuPhoiBepModule.batDauNauMon(${mon.id}, ${don.banId})" title="Bắt đầu chế biến món này (US-082)">
                            👨‍🍳 Bắt đầu nấu
                        </button>
                        <button class="nut nut-do-vien nut-nho kds-btn-action" onclick="window.dieuPhoiBepModule.moModalTuChoiMon(${mon.id}, ${don.banId}, '${tenMonEscaped}')" title="Từ chối món do hết nguyên liệu (US-088)">
                            🚫 Hết món
                        </button>
                    ` : ''}

                    ${isDangNau ? `
                        <button class="nut nut-xanh nut-nho kds-btn-action" onclick="window.dieuPhoiBepModule.hoanThanhMon(${mon.id}, ${don.banId}, '${tenMonEscaped}', '${soBanEscaped}')" title="Đánh dấu đã nấu xong, thông báo Phục vụ bưng món (US-083, US-084)">
                            🔔 Nấu xong
                        </button>
                    ` : ''}

                    ${isXong ? `
                        <button class="nut nut-phu nut-nho kds-btn-action" onclick="window.dieuPhoiBepModule.xacNhanDaLenMon(${mon.id}, ${don.banId})" title="Xác nhận Phục vụ đã bưng món lên bàn khách (US-084)">
                            🏃 Đã lên bàn
                        </button>
                        <button class="nut nut-phu nut-nho" style="font-size: 11px;" onclick="window.dieuPhoiBepModule.thuHoiMonVeBep(${mon.id}, ${don.banId})" title="Thu hồi về bếp (nếu ấn nhầm)">
                            ↩️ Nấu lại
                        </button>
                    ` : ''}

                    ${isLenMon ? `
                        <span class="badge badge-xanh-la" style="font-size: 11px;">
                            ✅ Hoàn tất
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /* ==========================================================================
       TAB 2: GOM NHÓM TỔNG SỐ LƯỢNG MÓN GIỐNG NHAU (BATCH COOKING) (US-081)
       ========================================================================== */
    renderTabGomMon() {
        // Quét tất cả các món đang chờ hoặc đang nấu trên toàn bộ quán
        const banDoGomMon = new Map();

        (this.danhSachDon || []).forEach(don => {
            if (!don) return;
            const donThoiGian = don.thoiGianTao || don.thoiGianDat || don.thoiGian || '';
            (don.danhSachMon || []).forEach(mon => {
                if (!mon) return;
                const tt = mon.trangThai;
                if (tt === 'CHO_XAC_NHAN' || tt === 'CHO_CHE_BIEN' || tt === 'DANG_CHE_BIEN') {
                    const khoaGom = `${mon.tenMon || 'Món'}___${mon.size || 'Mặc định'}`;
                    if (!banDoGomMon.has(khoaGom)) {
                        banDoGomMon.set(khoaGom, {
                            tenMon: mon.tenMon,
                            size: mon.size || '',
                            tongSoLuong: 0,
                            soLuongCho: 0,
                            soLuongDangNau: 0,
                            cacBanCho: []
                        });
                    }

                    const nhom = banDoGomMon.get(khoaGom);
                    const qty = Number(mon.soLuong || 1);
                    nhom.tongSoLuong += qty;
                    if (tt === 'CHO_XAC_NHAN' || tt === 'CHO_CHE_BIEN') nhom.soLuongCho += qty;
                    if (tt === 'DANG_CHE_BIEN') nhom.soLuongDangNau += qty;

                    nhom.cacBanCho.push({
                        monId: mon.id,
                        banId: don.banId,
                        soBan: don.soBan || ('Bàn ' + don.banId),
                        khuVucTen: don.khuVucTen,
                        soLuong: qty,
                        ghiChu: mon.ghiChu,
                        trangThai: tt,
                        thoiGianTao: donThoiGian
                    });
                }
            });
        });

        const dsGom = Array.from(banDoGomMon.values());
        // Sắp xếp theo tổng số lượng giảm dần để bếp ưu tiên nấu mẻ lớn
        dsGom.sort((a, b) => b.tongSoLuong - a.tongSoLuong);

        return `
            <div class="kds-batch-view-intro">
                <div>
                    <h3>🥘 CHẾ ĐỘ GOM MẺ NẤU CÙNG LÚC (BATCH COOKING - US-081)</h3>
                    <p style="color: var(--mau-chu-phu); font-size: 13px; margin-top: 4px;">
                        Tự động tổng hợp tất cả món ăn giống nhau từ các bàn khác nhau để đầu bếp chế biến một mẻ lớn cùng lúc, tiết kiệm tối đa thời gian ra món.
                    </p>
                </div>
                <div class="badge badge-xanh-duong" style="font-size: 14px; padding: 6px 14px;">
                    Tổng ${dsGom.length} loại món cần nấu
                </div>
            </div>

            ${dsGom.length === 0 ? `
                <div class="khung-trong" style="margin-top: 30px;">
                    <div style="font-size: 50px; margin-bottom: 12px;">🎉</div>
                    <h3>Không có món nào đang chờ gom mẻ!</h3>
                    <p style="color: var(--mau-chu-phu);">Tất cả các món đã được chế biến hoàn tất.</p>
                </div>
            ` : `
                <div class="kds-batch-grid">
                    ${dsGom.map((nhom, idx) => `
                        <div class="kds-batch-card">
                            <div class="kds-batch-card-head">
                                <div class="kds-batch-dish-title">
                                    <div class="kds-batch-index">#${idx + 1}</div>
                                    <div>
                                        <h4 class="kds-batch-dish-name">${nhom.tenMon}</h4>
                                        ${nhom.size ? `<span class="kds-option-pill">🏷️ ${nhom.size}</span>` : ''}
                                    </div>
                                </div>
                                <div class="kds-batch-total-box">
                                    <span class="kds-batch-total-num">${nhom.tongSoLuong}</span>
                                    <span class="kds-batch-total-label">suất cần làm</span>
                                </div>
                            </div>

                            <!-- Trạng thái phân bổ mẻ -->
                            <div class="kds-batch-status-row">
                                <span class="badge badge-vang">⏳ Chờ nấu: ${nhom.soLuongCho}</span>
                                <span class="badge badge-xanh-duong">👨‍🍳 Đang nấu: ${nhom.soLuongDangNau}</span>
                                <span class="badge badge-xam">🪑 ${nhom.cacBanCho.length} bàn gọi</span>
                            </div>

                            <!-- Chi tiết từng bàn đang đợi mẻ này -->
                            <div class="kds-batch-tables-list">
                                <div class="kds-batch-table-header">Danh sách bàn đang chờ:</div>
                                ${nhom.cacBanCho.map(banItem => {
                                    const thoiGianTroiQua = this.dinhDangThoiGianTroiQua(banItem.thoiGianTao);
                                    const canhBao = this.layThongTinCanhBaoThoiGian(banItem.thoiGianTao);
                                    return `
                                        <div class="kds-batch-table-item">
                                            <div class="kds-batch-tbl-info">
                                                <strong>${banItem.soBan}</strong> (${banItem.khuVucTen || 'Phòng'})
                                                <span class="badge ${canhBao.lopBadge}" style="font-size: 11px;">⏱️ ${thoiGianTroiQua}</span>
                                            </div>
                                            <div class="kds-batch-tbl-qty">
                                                <span class="badge badge-xanh-la">x${banItem.soLuong}</span>
                                                <span class="badge ${banItem.trangThai === 'DANG_CHE_BIEN' ? 'badge-xanh-duong' : 'badge-vang'}" style="font-size: 11px;">
                                                    ${banItem.trangThai === 'DANG_CHE_BIEN' ? 'Đang nấu' : 'Chờ'}
                                                </span>
                                            </div>
                                            ${banItem.ghiChu ? `
                                                <div class="kds-batch-tbl-note">
                                                    ⚠️ ${banItem.ghiChu}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>

                            <!-- Thao tác mẻ một chạm -->
                            <div class="kds-batch-actions">
                                ${nhom.soLuongCho > 0 ? `
                                    <button class="nut nut-chinh nut-nho" style="flex: 1;" onclick="window.dieuPhoiBepModule.batDauNauGomMe('${nhom.tenMon.replace(/'/g, "\\'")}', '${nhom.size}')">
                                        🔥 Bắt đầu nấu cả mẻ (${nhom.tongSoLuong})
                                    </button>
                                ` : ''}
                                <button class="nut nut-xanh nut-nho" style="flex: 1;" onclick="window.dieuPhoiBepModule.hoanThanhGomMe('${nhom.tenMon.replace(/'/g, "\\'")}', '${nhom.size}')">
                                    ✅ Hoàn thành cả mẻ (${nhom.tongSoLuong})
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;
    }

    /* ==========================================================================
       TAB 3: LỊCH SỬ CÁC MÓN BẾP VỪA HOÀN THÀNH TRONG CA (US-086)
       ========================================================================== */
    renderTabLichSuXong() {
        const danhSachHoanThanh = [];

        (this.danhSachDon || []).forEach(don => {
            if (!don) return;
            const donThoiGian = don.thoiGianTao || don.thoiGianDat || don.thoiGian || '';
            (don.danhSachMon || []).forEach(mon => {
                if (!mon) return;
                const tt = mon.trangThai;
                if (tt === 'DA_XONG' || tt === 'DA_CHE_BIEN' || tt === 'DA_LEN_MON' || tt === 'DA_PHUC_VU') {
                    danhSachHoanThanh.push({
                        ...mon,
                        banId: don.banId,
                        soBan: don.soBan || ('Bàn ' + don.banId),
                        khuVucTen: don.khuVucTen,
                        maDon: don.maDon,
                        thoiGianTao: donThoiGian,
                        thoiGianCapNhat: mon.thoiGianCapNhat || mon.thoiGianXong || donThoiGian
                    });
                }
            });
        });

        // Danh sách các đơn đã bưng món và hoàn tất toàn bộ
        const dsDonDaHoanTat = (this.danhSachDon || []).filter(don => {
            if (!don || !Array.isArray(don.danhSachMon) || don.danhSachMon.length === 0) return false;
            return don.danhSachMon.every(m => m && (
                m.trangThai === 'DA_LEN_MON' || m.trangThai === 'DA_PHUC_VU' ||
                m.trangThai === 'DA_HUY' || m.trangThai === 'TU_CHOI'
            ));
        });

        dsDonDaHoanTat.sort((a, b) => {
            const timeA = new Date(String(a.thoiGianTao || '').replace(' ', 'T')).getTime() || 0;
            const timeB = new Date(String(b.thoiGianTao || '').replace(' ', 'T')).getTime() || 0;
            return timeB - timeA;
        });

        // Sắp xếp món hoàn thành gần nhất lên đầu
        danhSachHoanThanh.sort((a, b) => {
            const timeAStr = a ? (a.thoiGianCapNhat || a.thoiGianXong || a.thoiGianTao || '') : '';
            const timeBStr = b ? (b.thoiGianCapNhat || b.thoiGianXong || b.thoiGianTao || '') : '';
            const timeA = timeAStr ? new Date(String(timeAStr).replace(' ', 'T')).getTime() || 0 : 0;
            const timeB = timeBStr ? new Date(String(timeBStr).replace(' ', 'T')).getTime() || 0 : 0;
            return timeB - timeA;
        });

        return `
            <div class="kds-history-view-intro">
                <div>
                    <h3>📜 LỊCH SỬ MÓN & ĐƠN ĐÃ HOÀN THÀNH PHỤC VỤ (US-086)</h3>
                    <p style="color: var(--mau-chu-phu); font-size: 13px; margin-top: 4px;">
                        Tất cả các đơn đã hoàn thành và bưng món ra bàn được tự động chuyển về đây để bếp và quản lý dễ dàng tra cứu, giúp màn hình điều phối chính luôn tinh gọn.
                    </p>
                </div>
                <div class="kds-history-badge-box" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <span class="badge badge-xanh-la" style="font-size: 13px; padding: 6px 14px;">
                        ✅ Đã xong: ${dsDonDaHoanTat.length} đơn (${danhSachHoanThanh.length} món)
                    </span>
                    <button class="nut ${this.cheDoXemLichSu === 'THE_DON' ? 'nut-chinh' : 'nut-phu'} nut-nho" onclick="window.dieuPhoiBepModule.doiCheDoXemLichSu('THE_DON')">
                        📋 Xem theo phiếu đơn (${dsDonDaHoanTat.length})
                    </button>
                    <button class="nut ${this.cheDoXemLichSu === 'BANG_MON' ? 'nut-chinh' : 'nut-phu'} nut-nho" onclick="window.dieuPhoiBepModule.doiCheDoXemLichSu('BANG_MON')">
                        📑 Xem chi tiết từng món (${danhSachHoanThanh.length})
                    </button>
                </div>
            </div>

            ${danhSachHoanThanh.length === 0 ? `
                <div class="khung-trong" style="margin-top: 30px;">
                    <div style="font-size: 50px; margin-bottom: 12px;">🍽️</div>
                    <h3>Chưa có món nào được hoàn thành trong ca này!</h3>
                    <p style="color: var(--mau-chu-phu);">Khi bạn bấm "Nấu xong" hoặc "Đã lên bàn", lịch sử sẽ được lưu và thống kê tại đây.</p>
                </div>
            ` : (this.cheDoXemLichSu === 'THE_DON' ? `
                <div class="kds-cards-grid" style="margin-top: 16px;">
                    ${dsDonDaHoanTat.map(don => `
                        <div class="kds-order-card kds-card-hoan-tat" id="card-don-ls-${don.id}">
                            <div class="kds-card-head">
                                <div class="kds-card-head-top">
                                    <div class="kds-table-badge">
                                        <span class="kds-table-title">${don.soBan || ('Bàn ' + don.banId)}</span>
                                        <span class="kds-table-area">${don.khuVucTen || 'Khu vực chính'}</span>
                                    </div>
                                    <div class="badge badge-xanh-la" style="font-size: 11px;">
                                        ✅ ĐÃ BƯNG XONG
                                    </div>
                                </div>
                                <div class="kds-card-info-row">
                                    <div class="kds-order-code">
                                        <span>Mã: <strong>${don.maDon}</strong></span>
                                        <span class="kds-luot-badge">Lượt ${don.luotGoi || 1}</span>
                                    </div>
                                    <div style="font-size: 11px; color: var(--mau-chu-phu);">
                                        🕒 Tạo lúc: ${don.thoiGianTao ? String(don.thoiGianTao).substring(11, 16) : ''}
                                    </div>
                                </div>
                                <div class="kds-alert-pill badge-xanh-la">
                                    🎉 Toàn bộ món đã được bưng phục vụ tại bàn
                                </div>
                            </div>
                            <div class="kds-card-items-list">
                                ${(don.danhSachMon || []).map(m => `
                                    <div class="kds-item-row" style="background: transparent;">
                                        <div class="kds-item-qty-box">
                                            <span class="kds-qty-badge" style="background:#E5E7EB; color:#374151;">x${m.soLuong || 1}</span>
                                        </div>
                                        <div class="kds-item-content">
                                            <div class="kds-item-title-row">
                                                <span class="kds-dish-name" style="font-size: 13px;">${m.tenMon}</span>
                                                <span class="badge badge-xanh-la" style="font-size: 10px;">
                                                    ${m.trangThai === 'DA_LEN_MON' || m.trangThai === 'DA_PHUC_VU' ? '✅ Đã lên món' : (m.trangThai === 'DA_HUY' ? '❌ Đã hủy' : '🚫 Từ chối')}
                                                </span>
                                            </div>
                                            ${(m.size || m.topping) ? `
                                                <div class="kds-item-options" style="font-size: 11px;">
                                                    ${m.size ? `<span>🏷️ ${m.size}</span>` : ''}
                                                    ${m.topping ? `<span>✨ ${m.topping}</span>` : ''}
                                                </div>
                                            ` : ''}
                                            ${m.ghiChu ? `<div style="font-size: 11px; color: #B45309;">⚠️ ${m.ghiChu}</div>` : ''}
                                        </div>
                                        <div class="kds-item-actions">
                                            <button class="nut nut-phu nut-nho" style="font-size: 11px;" onclick="window.dieuPhoiBepModule.thuHoiMonVeBep(${m.id}, ${don.banId})" title="Thu hồi lại về bếp nấu lại nếu khách đổi ý">
                                                ↩️ Nấu lại
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="kds-card-foot">
                                <div class="kds-card-summary">
                                    <span>Tổng: <strong>${(don.danhSachMon || []).length} món</strong></span>
                                    <span style="color: #10B981; font-weight: 600;">✅ Hoàn tất toàn bộ</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="khung-bang" style="margin-top: 16px;">
                    <table class="bang-du-lieu">
                        <thead>
                            <tr>
                                <th>Thời gian xong</th>
                                <th>Bàn ăn</th>
                                <th>Tên món ăn</th>
                                <th>SL</th>
                                <th>Tùy chọn</th>
                                <th>Ghi chú</th>
                                <th>Trạng thái bưng</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${danhSachHoanThanh.map(mon => `
                                <tr>
                                    <td>
                                        <strong>${mon.thoiGianCapNhat ? mon.thoiGianCapNhat.substring(11, 19) : 'Vừa xong'}</strong>
                                        <div style="font-size: 11px; color: var(--mau-chu-phu);">Đơn ${mon.maDon}</div>
                                    </td>
                                    <td>
                                        <span class="badge badge-xanh-duong">${mon.soBan}</span>
                                        <div style="font-size: 11px; color: var(--mau-chu-phu); margin-top: 2px;">${mon.khuVucTen || ''}</div>
                                    </td>
                                    <td>
                                        <strong>${mon.tenMon}</strong>
                                    </td>
                                    <td>
                                        <span class="badge badge-xam">x${mon.soLuong || 1}</span>
                                    </td>
                                    <td style="font-size: 12px;">
                                        ${mon.size ? `<div>🏷️ ${mon.size}</div>` : ''}
                                        ${mon.topping ? `<div>✨ ${mon.topping}</div>` : ''}
                                        ${!mon.size && !mon.topping ? '—' : ''}
                                    </td>
                                    <td style="font-size: 12px; color: #B45309;">
                                        ${mon.ghiChu || '—'}
                                    </td>
                                    <td>
                                        ${mon.trangThai === 'DA_LEN_MON' || mon.trangThai === 'DA_PHUC_VU' ? `
                                            <span class="badge badge-xanh-la">✅ Đã lên bàn</span>
                                        ` : `
                                            <span class="badge badge-tim">🔔 Chờ phục vụ bưng</span>
                                        `}
                                    </td>
                                    <td>
                                        <button class="nut nut-phu nut-nho" onclick="window.dieuPhoiBepModule.thuHoiMonVeBep(${mon.id}, ${mon.banId})" title="Thu hồi lại về trạng thái đang chế biến nếu bấm nhầm">
                                            ↩️ Nấu lại
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `)}
        `;
    }

    doiCheDoXemLichSu(cheDo) {
        this.cheDoXemLichSu = cheDo;
        this.render();
    }

    /* ==========================================================================
       TAB 4: KIỂM SOÁT HẾT MÓN TẠI BẾP (US-087)
       ========================================================================== */
    renderTabKiemSoatHetMon() {
        const dsMon = Array.isArray(this.danhSachMonThucDon) ? this.danhSachMonThucDon : [];
        // Lấy danh mục để lọc
        const cacDanhMuc = [...new Set(dsMon.map(m => (m && m.tenDanhMuc) || 'Món đặc sắc').filter(Boolean))];

        let dsHienThi = [...dsMon].filter(m => m && m.trangThai !== -1);

        // Lọc từ khóa
        if (this.tuKhoaMonHet) {
            const kw = this.tuKhoaMonHet.toLowerCase();
            dsHienThi = dsHienThi.filter(m => 
                (m.tenMon || '').toLowerCase().includes(kw) ||
                (m.maMon || '').toLowerCase().includes(kw)
            );
        }

        // Lọc danh mục
        if (this.danhMucMonHet !== 'ALL') {
            dsHienThi = dsHienThi.filter(m => (m.tenDanhMuc || 'Món đặc sắc') === this.danhMucMonHet);
        }

        const soMonHet = this.laySoMonDangHet();

        return `
            <div class="kds-out-of-stock-header">
                <div>
                    <h3>🚫 KIỂM SOÁT HẾT MÓN TẠI BẾP (OUT-OF-STOCK CONTROL - US-087)</h3>
                    <p style="color: var(--mau-chu-phu); font-size: 13px; margin-top: 4px;">
                        Gạt công tắc tắt món khi hết nguyên liệu. Món sẽ tự động bị khóa tức thời trên E-Menu khách quét QR và máy Thu ngân (US-077).
                    </p>
                </div>
                <div class="badge ${soMonHet > 0 ? 'badge-cam' : 'badge-xanh-la'}" style="font-size: 13px; padding: 6px 14px;">
                    ${soMonHet > 0 ? `⚠️ Đang có ${soMonHet} món tạm hết hàng` : '🟢 Tất cả món đang sẵn sàng phục vụ'}
                </div>
            </div>

            <!-- Thanh tìm kiếm & lọc nhanh -->
            <div class="kds-filter-bar" style="margin-top: 14px;">
                <div style="flex: 1; max-width: 320px;">
                    <input type="text" class="o-nhap o-nhap-nho" placeholder="🔍 Tìm tên món, mã món..." 
                           value="${this.tuKhoaMonHet}" 
                           oninput="window.dieuPhoiBepModule.timKiemMonHet(this.value)">
                </div>
                <div class="kds-filter-group">
                    <span class="kds-filter-label">Danh mục:</span>
                    <select class="o-nhap o-nhap-nho" onchange="window.dieuPhoiBepModule.doiDanhMucMonHet(this.value)">
                        <option value="ALL">Tất cả danh mục</option>
                        ${cacDanhMuc.map(dm => `<option value="${dm}" ${this.danhMucMonHet === dm ? 'selected' : ''}>${dm}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- DANH SÁCH MÓN ĂN VỚI CÔNG TẮC BẬT/TẮT 1-CHẠM -->
            <div class="kds-dishes-grid">
                ${dsHienThi.map(mon => {
                    const dangBan = (mon.trangThai === 1);
                    return `
                        <div class="kds-dish-switch-card ${dangBan ? '' : 'kds-dish-out-card'}">
                            <div class="kds-dish-switch-info">
                                <div class="kds-dish-switch-name">${mon.tenMon}</div>
                                <div class="kds-dish-switch-meta">
                                    <span>Mã: ${mon.maMon || 'M' + mon.id}</span> • 
                                    <span>${window.dinhDang ? window.dinhDang.tien(mon.giaBan) : (mon.giaBan + 'đ')}</span>
                                </div>
                                <div style="margin-top: 4px;">
                                    <span class="badge ${dangBan ? 'badge-xanh-la' : 'badge-do'}">
                                        ${dangBan ? '🟢 Đang phục vụ' : '🔴 TẠM HẾT HÀNG'}
                                    </span>
                                </div>
                            </div>

                            <!-- Công tắc chuyển đổi trạng thái -->
                            <div class="kds-switch-control">
                                <label class="switch-toggle" title="Click để Bật/Tắt trạng thái phục vụ">
                                    <input type="checkbox" ${dangBan ? 'checked' : ''} 
                                           onchange="window.dieuPhoiBepModule.chuyenTrangThaiMonAn(${mon.id}, this.checked)">
                                    <span class="slider-round"></span>
                                </label>
                                <span class="kds-switch-text">${dangBan ? 'Còn hàng' : 'Hết món'}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    timKiemMonHet(kw) {
        this.tuKhoaMonHet = kw;
        this.render();
    }

    doiDanhMucMonHet(dm) {
        this.danhMucMonHet = dm;
        this.render();
    }

    /**
     * US-087: Bếp chuyển đổi trạng thái Hết món / Còn món
     */
    async chuyenTrangThaiMonAn(monId, dangBan) {
        const mon = this.danhSachMonThucDon.find(m => Number(m.id) === Number(monId));
        if (!mon) return;

        mon.trangThai = dangBan ? 1 : 0; // 1 = Đang bán, 0 = Tạm hết

        if (window.api) {
            await window.api.luuDanhSachMonAn(this.danhSachMonThucDon);
            window.api.ghiNhatKy(
                `Bếp cập nhật trạng thái món (${mon.tenMon})`,
                dangBan ? 'INFO' : 'WARN',
                `Đầu bếp đổi trạng thái món [${mon.tenMon}] sang: ${dangBan ? 'ĐANG BÁN' : 'TẠM HẾT HÀNG'}`
            );
        }

        // Phát sự kiện realtime đồng bộ sang khách và thu ngân (US-077)
        if (window.socketClient) {
            window.socketClient.phatSuKien('thucDon:hetMon', {
                monId: mon.id,
                tenMon: mon.tenMon,
                trangThai: mon.trangThai
            });
        }

        if (window.thongBao) {
            if (dangBan) {
                window.thongBao.thanhCong('Đã mở bán lại món', `Món [${mon.tenMon}] đã sẵn sàng nhận order.`);
            } else {
                window.thongBao.canhBao('Đã đánh dấu TẠM HẾT HÀNG', `Món [${mon.tenMon}] đã tạm khóa trên E-Menu của khách hàng.`);
            }
        }

        this.render();
    }

    /* ==========================================================================
       CÁC HÀM XỬ LÝ NGHIỆP VỤ ĐIỀU PHỐI (US-082, US-083, US-084, US-088)
       ========================================================================== */

    /**
     * US-082: Bắt đầu nấu 1 món ăn lẻ
     */
    async batDauNauMon(idMonChiTiet, banId) {
        if (!window.api) return;

        const kq = await window.api.capNhatTrangThaiMonAn(idMonChiTiet, banId, 'DANG_CHE_BIEN');
        if (kq && kq.ok) {
            if (window.thongBao) {
                window.thongBao.thongTin('👨‍🍳 Bếp bắt đầu nấu', `Đang chế biến món ăn...`);
            }
            await this.taiDuLieuVaCapNhatGiaoDien();
        } else {
            if (window.thongBao) {
                window.thongBao.thatBai('Lỗi', kq ? kq.msg : 'Không thể cập nhật trạng thái.');
            }
        }
    }

    /**
     * US-082: Bắt đầu nấu toàn bộ phiếu order
     */
    async batDauNauCaPhieu(donId) {
        const don = (this.danhSachDonGopHienThi && this.danhSachDonGopHienThi.find(d => String(d.id) === String(donId)))
                 || this.danhSachDon.find(d => String(d.id) === String(donId));
        if (!don || !don.danhSachMon) return;

        let soMonDaNhan = 0;
        for (const mon of don.danhSachMon) {
            if (mon.trangThai === 'CHO_XAC_NHAN' || mon.trangThai === 'CHO_CHE_BIEN') {
                await window.api.capNhatTrangThaiMonAn(mon.id, don.banId, 'DANG_CHE_BIEN');
                soMonDaNhan++;
            }
        }

        if (window.thongBao) {
            window.thongBao.thanhCong('👨‍🍳 Đã nhận nấu toàn bộ phiếu', `Đã chuyển ${soMonDaNhan} món của ${don.soBan} sang trạng thái đang nấu.`);
        }
        await this.taiDuLieuVaCapNhatGiaoDien();
    }

    /**
     * US-083 & US-084: Đánh dấu món đã nấu xong & Báo cho Phục vụ bưng lên bàn
     */
    async hoanThanhMon(idMonChiTiet, banId, tenMon, soBan) {
        if (!window.api) return;

        const kq = await window.api.capNhatTrangThaiMonAn(idMonChiTiet, banId, 'DA_XONG');
        if (kq && kq.ok) {
            // Phát âm thanh chuông báo hoàn thành
            if (this.amThanhBat && window.socketClient) {
                window.socketClient.phatAmThanh('thanhCong');
            }

            // US-084: Bắn thông báo cho bộ phận phục vụ
            if (window.thongBao) {
                window.thongBao.thanhCong(
                    `🔔 Món đã nấu xong!`, 
                    `Đã gửi tín hiệu thông báo cho Phục vụ: Bưng món [${tenMon}] ra ${soBan}.`
                );
            }

            await this.taiDuLieuVaCapNhatGiaoDien();
        }
    }

    /**
     * US-083 & US-084: Đánh dấu hoàn thành toàn bộ phiếu
     */
    async hoanThanhCaPhieu(donId) {
        const don = (this.danhSachDonGopHienThi && this.danhSachDonGopHienThi.find(d => String(d.id) === String(donId)))
                 || this.danhSachDon.find(d => String(d.id) === String(donId));
        if (!don || !don.danhSachMon) return;

        let soMonHoanThanh = 0;
        for (const mon of don.danhSachMon) {
            if (mon.trangThai === 'DANG_CHE_BIEN' || mon.trangThai === 'CHO_XAC_NHAN' || mon.trangThai === 'CHO_CHE_BIEN') {
                await window.api.capNhatTrangThaiMonAn(mon.id, don.banId, 'DA_XONG');
                soMonHoanThanh++;
            }
        }

        if (this.amThanhBat && window.socketClient) {
            window.socketClient.phatAmThanh('thanhCong');
        }

        if (window.thongBao) {
            window.thongBao.thanhCong(
                `🎉 Hoàn thành toàn phiếu ${don.soBan}!`, 
                `Tất cả ${soMonHoanThanh} món đã nấu xong. Đã gửi thông báo cho nhân viên phục vụ bưng ra bàn.`
            );
        }

        await this.taiDuLieuVaCapNhatGiaoDien();
    }

    /**
     * US-084: Xác nhận Phục vụ đã bưng món lên bàn cho khách
     */
    async xacNhanDaLenMon(idMonChiTiet, banId) {
        if (!window.api) return;

        const kq = await window.api.capNhatTrangThaiMonAn(idMonChiTiet, banId, 'DA_LEN_MON');
        if (kq && kq.ok) {
            if (window.thongBao) {
                window.thongBao.thanhCong('✅ Đã lên món', 'Đã phục vụ món ăn tại bàn.');
            }
            await this.taiDuLieuVaCapNhatGiaoDien();
        }
    }

    /**
     * US-084: Xác nhận Phục vụ đã bưng toàn bộ món trong phiếu lên bàn (Chuyển phiếu sang Lịch sử)
     */
    async xacNhanDaLenMonCaPhieu(donId) {
        const don = (this.danhSachDonGopHienThi && this.danhSachDonGopHienThi.find(d => String(d.id) === String(donId)))
                 || this.danhSachDon.find(d => String(d.id) === String(donId));
        if (!don || !don.danhSachMon) return;

        let soMonDaBung = 0;
        for (const mon of don.danhSachMon) {
            if (mon.trangThai === 'DA_XONG' || mon.trangThai === 'DA_CHE_BIEN' || mon.trangThai === 'DANG_CHE_BIEN' || mon.trangThai === 'CHO_XAC_NHAN' || mon.trangThai === 'CHO_CHE_BIEN') {
                await window.api.capNhatTrangThaiMonAn(mon.id, don.banId, 'DA_LEN_MON');
                soMonDaBung++;
            }
        }

        if (window.thongBao) {
            window.thongBao.thanhCong(
                `🎉 Đã bưng toàn bộ món ${don.soBan}!`, 
                `Đã phục vụ xong ${soMonDaBung} món và chuyển phiếu vào Lịch sử món đã xong.`
            );
        }

        await this.taiDuLieuVaCapNhatGiaoDien();
    }

    /**
     * Thu hồi món về bếp (nếu bấm nhầm hoàn thành)
     */
    async thuHoiMonVeBep(idMonChiTiet, banId) {
        if (!window.api) return;

        await window.api.capNhatTrangThaiMonAn(idMonChiTiet, banId, 'DANG_CHE_BIEN');
        if (window.thongBao) {
            window.thongBao.thongTin('↩️ Đã thu hồi về bếp', 'Món ăn đã quay lại trạng thái Đang chế biến.');
        }
        await this.taiDuLieuVaCapNhatGiaoDien();
    }

    /**
     * US-081: Bắt đầu nấu gom mẻ cho tất cả các bàn đang đợi cùng món
     */
    async batDauNauGomMe(tenMon, size) {
        let soLuongCapNhat = 0;
        for (const don of this.danhSachDon) {
            for (const mon of (don.danhSachMon || [])) {
                if (mon.tenMon === tenMon && (mon.size || '') === (size || '') && (mon.trangThai === 'CHO_XAC_NHAN' || mon.trangThai === 'CHO_CHE_BIEN')) {
                    await window.api.capNhatTrangThaiMonAn(mon.id, don.banId, 'DANG_CHE_BIEN');
                    soLuongCapNhat += Number(mon.soLuong || 1);
                }
            }
        }

        if (window.thongBao) {
            window.thongBao.thanhCong(`👨‍🍳 Đã bắt đầu nấu mẻ [${tenMon}]`, `Tổng cộng ${soLuongCapNhat} suất cho tất cả các bàn.`);
        }
        await this.taiDuLieuVaCapNhatGiaoDien();
    }

    /**
     * US-081: Hoàn thành gom mẻ cho tất cả các bàn đang đợi cùng món
     */
    async hoanThanhGomMe(tenMon, size) {
        let soLuongCapNhat = 0;
        for (const don of this.danhSachDon) {
            for (const mon of (don.danhSachMon || [])) {
                if (mon.tenMon === tenMon && (mon.size || '') === (size || '') && 
                    (mon.trangThai === 'DANG_CHE_BIEN' || mon.trangThai === 'CHO_XAC_NHAN' || mon.trangThai === 'CHO_CHE_BIEN')) {
                    await window.api.capNhatTrangThaiMonAn(mon.id, don.banId, 'DA_XONG');
                    soLuongCapNhat += Number(mon.soLuong || 1);
                }
            }
        }

        if (this.amThanhBat && window.socketClient) {
            window.socketClient.phatAmThanh('thanhCong');
        }

        if (window.thongBao) {
            window.thongBao.thanhCong(`🎉 Mẻ [${tenMon}] đã nấu xong!`, `Đã xong ${soLuongCapNhat} suất. Thông báo đã gửi tới nhân viên phục vụ của tất cả các bàn.`);
        }
        await this.taiDuLieuVaCapNhatGiaoDien();
    }

    /* ==========================================================================
       HỘP THOẠI TỪ CHỐI MÓN TẠI BẾP DO HẾT NGUYÊN LIỆU (US-088)
       ========================================================================== */

    /**
     * Mở hộp thoại từ chối món
     */
    moModalTuChoiMon(idMonChiTiet, banId, tenMon) {
        this.monDangTuChoi = { idMonChiTiet, banId, tenMon };

        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        modal.innerHTML = `
            <div class="hop-thoai-modal" style="max-width: 500px;">
                <div class="tieu-de-modal tieu-de-do">
                    <span>🚫 BẾP TỪ CHỐI MÓN (US-088)</span>
                    <button class="nut-dong-modal" onclick="window.dieuPhoiBepModule.dongModal()">&times;</button>
                </div>
                <div class="than-modal">
                    <p style="margin-bottom: 12px; line-height: 1.5;">
                        Bạn đang từ chối món: <strong style="color: #DC2626; font-size: 15px;">[${tenMon}]</strong> của <strong style="color: var(--mau-chinh);">Bàn ${banId}</strong>.
                    </p>
                    <p style="font-size: 13px; color: var(--mau-chu-phu); margin-bottom: 16px;">
                        Lý do từ chối sẽ được thông báo ngay lập tức trên màn hình khách hàng và máy Thu ngân/Phục vụ.
                    </p>

                    <label class="nhan-o-nhap">Chọn lý do từ chối nhanh:</label>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
                        <label class="nhan-radio" style="font-size: 13px;">
                            <input type="radio" name="lyDoTuChoi" value="Bếp vừa hết nguyên liệu tươi sống trong ngày" checked>
                            <span>🥩 Bếp vừa hết nguyên liệu tươi sống trong ngày</span>
                        </label>
                        <label class="nhan-radio" style="font-size: 13px;">
                            <input type="radio" name="lyDoTuChoi" value="Bếp đang quá tải, thời gian chờ vượt quá 45 phút">
                            <span>⏳ Bếp đang quá tải, thời gian chờ vượt quá 45 phút</span>
                        </label>
                        <label class="nhan-radio" style="font-size: 13px;">
                            <input type="radio" name="lyDoTuChoi" value="Thiết bị chế biến (lò nướng/nồi hấp) gặp sự cố">
                            <span>⚙️ Thiết bị chế biến gặp sự cố kỹ thuật đột xuất</span>
                        </label>
                        <label class="nhan-radio" style="font-size: 13px;">
                            <input type="radio" name="lyDoTuChoi" value="Ghi chú yêu cầu của khách bếp không thể đáp ứng">
                            <span>📝 Ghi chú yêu cầu đặc biệt của khách không đáp ứng được</span>
                        </label>
                        <label class="nhan-radio" style="font-size: 13px;">
                            <input type="radio" name="lyDoTuChoi" value="KHAC">
                            <span>✏️ Lý do cụ thể khác...</span>
                        </label>
                    </div>

                    <div id="vung-ly-do-khac" style="display: none; margin-bottom: 14px;">
                        <input type="text" id="nhap-ly-do-khac" class="o-nhap" placeholder="Nhập lý do cụ thể...">
                    </div>

                    <div style="background: #FEF3C7; border: 1px solid #FCD34D; padding: 10px 12px; border-radius: 6px; margin-bottom: 16px;">
                        <label class="nhan-checkbox" style="font-size: 13px; font-weight: 600; color: #92400E; display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="chk-tu-dong-khoa-mon" checked>
                            <span>Đồng thời khóa "Tạm hết món" trên Thực đơn toàn quán (US-087)</span>
                        </label>
                    </div>

                    <div class="hang-nut-modal" style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="nut nut-phu" onclick="window.dieuPhoiBepModule.dongModal()">Hủy bỏ</button>
                        <button class="nut nut-do" onclick="window.dieuPhoiBepModule.xacNhanTuChoiMon()">
                            🚫 Xác nhận từ chối món
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('mo');

        // Lắng nghe radio thay đổi để mở ô nhập lý do khác
        const radios = modal.querySelectorAll('input[name="lyDoTuChoi"]');
        radios.forEach(r => {
            r.addEventListener('change', () => {
                const oKhac = document.getElementById('vung-ly-do-khac');
                if (oKhac) {
                    oKhac.style.display = (r.value === 'KHAC' && r.checked) ? 'block' : 'none';
                }
            });
        });
    }

    dongModal() {
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (modal) {
            modal.classList.remove('mo');
            modal.innerHTML = '';
        }
        this.monDangTuChoi = null;
    }

    /**
     * Xác nhận từ chối món
     */
    async xacNhanTuChoiMon() {
        if (!this.monDangTuChoi || !window.api) return;

        const modal = document.getElementById('khung-modal-toan-cuc');
        const radioChon = modal ? modal.querySelector('input[name="lyDoTuChoi"]:checked') : null;
        let lyDo = radioChon ? radioChon.value : 'Bếp vừa hết nguyên liệu trong ngày';

        if (lyDo === 'KHAC') {
            const nhapKhac = document.getElementById('nhap-ly-do-khac');
            lyDo = (nhapKhac && nhapKhac.value.trim()) ? nhapKhac.value.trim() : 'Bếp vừa hết nguyên liệu trong ngày';
        }

        const khoaMonToanQuan = document.getElementById('chk-tu-dong-khoa-mon')?.checked;

        const { idMonChiTiet, banId, tenMon } = this.monDangTuChoi;

        // 1. Gọi API từ chối món (US-069, US-088)
        const kq = await window.api.tuChoiMonTuBep(idMonChiTiet, banId, lyDo);

        // 2. Nếu người dùng chọn tự động khóa món (US-087)
        if (khoaMonToanQuan) {
            const timMon = this.danhSachMonThucDon.find(m => m.tenMon === tenMon);
            if (timMon) {
                await this.chuyenTrangThaiMonAn(timMon.id, false);
            }
        }

        this.dongModal();

        if (kq && kq.ok) {
            if (window.thongBao) {
                window.thongBao.canhBao('Đã từ chối món', `Đã gửi lý do "${lyDo}" về Bàn ${banId} và Thu ngân.`);
            }
            await this.taiDuLieuVaCapNhatGiaoDien();
        }
    }

    /**
     * Tạo đơn hàng mẫu phục vụ việc kiểm thử KDS dễ dàng (Reviewer / Teacher testing)
     */
    async taoDonHangMauTest() {
        const dsMonHienCo = this.danhSachMonThucDon.filter(m => m.trangThai === 1);
        if (dsMonHienCo.length === 0) {
            if (window.thongBao) window.thongBao.canhBao('Không có món', 'Thực đơn chưa có món đang bán.');
            return;
        }

        const banSo = Math.floor(Math.random() * 8) + 1; // Bàn 1 -> 8
        const monNgauNhien1 = dsMonHienCo[Math.floor(Math.random() * dsMonHienCo.length)];
        const monNgauNhien2 = dsMonHienCo[Math.floor(Math.random() * dsMonHienCo.length)];

        const ghiChuMau = [
            '🌶️ Bớt cay, không ăn được cay',
            '🚫 Dị ứng hành lá và tiêu đen',
            'Nấu chín kỹ, da giòn',
            'Ít ngọt, ít đường',
            'Làm gấp giúp em'
        ];

        const donMoi = {
            id: Date.now(),
            maDon: `ORD-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
            banId: banSo,
            soBan: `Bàn 0${banSo}`,
            khuVucTen: banSo <= 4 ? 'Tầng 1 (Máy lạnh)' : 'Tầng 2 (Sân vườn)',
            luotGoi: Math.floor(Math.random() * 2) + 1,
            thoiGianTao: new Date().toISOString().replace('T', ' ').substring(0, 19),
            ghiChuDon: 'Khách yêu cầu chế biến nhanh',
            tongTien: (monNgauNhien1.giaBan || 120000) + (monNgauNhien2.giaBan || 85000),
            danhSachMon: [
                {
                    id: Date.now() + 1,
                    monId: monNgauNhien1.id,
                    tenMon: monNgauNhien1.tenMon,
                    size: 'Tiêu chuẩn',
                    topping: '',
                    donGia: monNgauNhien1.giaBan,
                    soLuong: Math.floor(Math.random() * 2) + 1,
                    thanhTien: monNgauNhien1.giaBan,
                    ghiChu: ghiChuMau[Math.floor(Math.random() * ghiChuMau.length)],
                    trangThai: 'CHO_XAC_NHAN',
                    thoiGianCapNhat: new Date().toISOString().replace('T', ' ').substring(0, 19)
                },
                {
                    id: Date.now() + 2,
                    monId: monNgauNhien2.id,
                    tenMon: monNgauNhien2.tenMon,
                    size: 'Lớn',
                    topping: '',
                    donGia: monNgauNhien2.giaBan,
                    soLuong: 1,
                    thanhTien: monNgauNhien2.giaBan,
                    ghiChu: '',
                    trangThai: 'CHO_XAC_NHAN',
                    thoiGianCapNhat: new Date().toISOString().replace('T', ' ').substring(0, 19)
                }
            ]
        };

        const ds = await window.api.layTatCaDonGoiMon();
        ds.push(donMoi);
        localStorage.setItem(window.HANG_SO?.KHOA_LUU_TRU?.DANH_SACH_DON_GOI || 'quanmoc_ds_don_goi', JSON.stringify(ds));

        if (window.socketClient) {
            window.socketClient.phatSuKien('order:moi', donMoi);
        }

        if (window.thongBao) {
            window.thongBao.thanhCong('Đã tạo đơn thử nghiệm', `Đã thêm đơn mới cho ${donMoi.soBan} với 2 món đang chờ nấu.`);
        }

        await this.taiDuLieuVaCapNhatGiaoDien();
    }
}

// Khởi tạo instance toàn cục
window.dieuPhoiBepModule = new DieuPhoiBepModule();
