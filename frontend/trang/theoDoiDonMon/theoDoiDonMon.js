/**
 * PHÂN HỆ THEO DÕI ĐƠN MÓN & ĐẶT MÓN THỜI GIAN THỰC (theoDoiDonMon.js)
 * Phụ trách: Phong (Sprint 2 Lead - US-063 -> US-078)
 * 
 * Đáp ứng đầy đủ các User Story của Sprint 2:
 * - US-063: Xác nhận và gửi yêu cầu đặt món (Order) từ giỏ hàng xuống hệ thống
 * - US-064: Nhận thông báo xác nhận đặt món thành công ngay trên màn hình
 * - US-065: Xem danh sách toàn bộ các món đã gọi trong phiên ngồi tại bàn
 * - US-066: Theo dõi trạng thái từng món ăn (Chờ xác nhận, Đang chế biến, Đã xong, Đã lên món)
 * - US-067: Đặt thêm lượt món mới (Order bổ sung) trong cùng một phiên ăn
 * - US-068: Khách hàng yêu cầu hủy món khi món vẫn đang ở trạng thái "Chờ xác nhận"
 * - US-069: Nhận thông báo trên màn hình nếu Bếp từ chối món do vừa hết nguyên liệu
 * - US-070: Xem tổng chi phí lũy kế của tất cả các lượt gọi món tại bàn
 * - US-071 -> US-074: Tương tác hỗ trợ tại bàn (Gọi nhân viên / Yêu cầu thanh toán)
 * - US-075 -> US-078: Đồng bộ thời gian thực (Real-time Sync) & Chuông báo âm thanh Web Audio
 */

class TheoDoiDonMonModule {
    constructor() {
        this.banIdHienTai = 3; // Mặc định Bàn 03 - Tầng 1
        this.banIdKhachHang = null; // Khóa cứng bàn cho khách hàng
        this.boLocTrangThai = 'TAT_CA'; // 'TAT_CA' | 'CHO_XAC_NHAN' | 'DANG_CHE_BIEN' | 'DA_LEN_MON' | 'DA_HUY'
        this.duLieuDonBan = null;
        this.danhSachBan = [];
        this.dangLangNghe = false;
        this.intervalDongBo = null;
    }

    /**
     * Nhận diện xem người dùng có đang ở chế độ khách hàng (quét QR / E-Menu) hay không
     */
    laCheDoKhachHang() {
        if (window.ungDung && typeof window.ungDung.laCheDoKhachHang === 'function' && window.ungDung.laCheDoKhachHang()) {
            return true;
        }
        if (document.body.classList.contains('che-do-khach-hang')) {
            return true;
        }
        const pathname = window.location.pathname.toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
        if (pathname.includes('/e-menu') || pathname.includes('/menu')) {
            return true;
        }
        if (urlParams.has('token') || hashParams.has('token') || urlParams.has('ban') || hashParams.has('ban') || urlParams.has('banId') || hashParams.has('banId')) {
            return true;
        }
        return false;
    }

    /**
     * Khởi tạo giao diện trang theo dõi đơn món
     */
    async khoiTao(banId = null) {
        // Ưu tiên 1: banId truyền trực tiếp
        // Ưu tiên 2: param trong URL (?banId=6 hoặc ?ban=B101 hoặc hash ?banId=6)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
        const paramBanId = urlParams.get('banId') || hashParams.get('banId');
        const paramBanMa = urlParams.get('ban') || hashParams.get('ban') || urlParams.get('maBan') || hashParams.get('maBan');

        let banIdXacDinh = null;
        if (banId) {
            banIdXacDinh = Number(banId);
        } else if (paramBanId && !isNaN(Number(paramBanId))) {
            banIdXacDinh = Number(paramBanId);
        } else {
            // Kiểm tra xem bàn nào trong phiên POS đang có món chờ bưng hoặc đang phục vụ
            const rawPhien = localStorage.getItem('quanmoc_pos_phien_ban');
            if (rawPhien) {
                try {
                    const pMap = JSON.parse(rawPhien);
                    // Ưu tiên 1: Bàn có món bếp đã nấu xong đang chờ bưng
                    for (const [bId, phien] of Object.entries(pMap)) {
                        if (phien && Array.isArray(phien.danhSachMon) && phien.danhSachMon.some(m => m.trangThai === 'DA_XONG' || m.trangThai === 'DA_NAU_XONG' || m.trangThai === 'DA_CHE_BIEN')) {
                            banIdXacDinh = Number(bId);
                            break;
                        }
                    }
                    // Ưu tiên 2: Bàn có món đang phục vụ
                    if (!banIdXacDinh) {
                        for (const [bId, phien] of Object.entries(pMap)) {
                            if (phien && Array.isArray(phien.danhSachMon) && phien.danhSachMon.length > 0) {
                                banIdXacDinh = Number(bId);
                                break;
                            }
                        }
                    }
                } catch (e) {}
            }

            // Ưu tiên 3: Bàn có món đã nấu xong trong quanmoc_ds_don_goi
            if (!banIdXacDinh) {
                const rawDon = localStorage.getItem('quanmoc_ds_don_goi');
                if (rawDon) {
                    try {
                        const dsDon = JSON.parse(rawDon);
                        for (const d of dsDon) {
                            if (d && d.banId && Array.isArray(d.danhSachMon) && d.danhSachMon.some(m => m.trangThai === 'DA_XONG' || m.trangThai === 'DA_NAU_XONG')) {
                                banIdXacDinh = Number(d.banId);
                                break;
                            }
                        }
                    } catch (e) {}
                }
            }

            if (!banIdXacDinh) {
                // Lấy từ session bàn đang được quét hoặc chọn gần nhất
                const banLuu = localStorage.getItem('quanmoc_ban_id_hien_tai');
                if (banLuu && !isNaN(Number(banLuu))) {
                    banIdXacDinh = Number(banLuu);
                }
            }
        }

        // Nếu có mã bàn (ví dụ ban=B101) mà chưa có ID số
        if (!banIdXacDinh && paramBanMa) {
            try {
                if (window.api && window.api.layDanhSachBanAn) {
                    const dsBan = await window.api.layDanhSachBanAn();
                    const bTim = (dsBan || []).find(b => String(b.maBan).toLowerCase() === String(paramBanMa).toLowerCase());
                    if (bTim) banIdXacDinh = Number(bTim.id);
                }
            } catch (e) {}
        }

        if (banIdXacDinh) {
            this.banIdHienTai = banIdXacDinh;
        }

        // Nếu là khách hàng: Khóa cứng chỉ xem bàn của mình
        if (this.laCheDoKhachHang()) {
            this.banIdKhachHang = this.banIdHienTai;
            localStorage.setItem('quanmoc_ban_id_hien_tai', this.banIdHienTai);
        }
        
        // Cập nhật cho widget hỗ trợ tại bàn
        if (window.hoTroTaiBan) {
            window.hoTroTaiBan.datBanHienTai(this.banIdHienTai);
        }

        this.dangKySuKienSocket();
        await this.taiDanhSachBan();
        await this.taiDuLieuVaVe();
        this.batDauTuDongDongBo();
    }

    /**
     * Lắng nghe các sự kiện thời gian thực (US-075 -> US-078)
     */
    dangKySuKienSocket() {
        if (this.dangLangNghe || !window.socketClient) return;

        // Khi có đơn mới gửi xuống (US-075)
        window.socketClient.khiCoSuKien('order:moi', (donMoi) => {
            if (Number(donMoi.banId) === Number(this.banIdHienTai)) {
                this.taiDuLieuVaVe();
            }
        });

        // Khi trạng thái món thay đổi từ Bếp (US-076)
        window.socketClient.khiCoSuKien('order:capNhatTrangThai', (data) => {
            if (Number(data.banId) === Number(this.banIdHienTai)) {
                this.taiDuLieuVaVe();
            }
        });

        // Khi Bếp từ chối món do hết nguyên liệu (US-069)
        window.socketClient.khiCoSuKien('order:tuChoiMon', (data) => {
            if (Number(data.banId) === Number(this.banIdHienTai)) {
                this.taiDuLieuVaVe();
            }
        });

        // Khi nhân viên tiếp nhận yêu cầu hỗ trợ (US-074)
        window.socketClient.khiCoSuKien('hoTro:tiepNhan', (data) => {
            if (Number(data.banId) === Number(this.banIdHienTai)) {
                this.taiDuLieuVaVe();
            }
        });

        this.dangLangNghe = true;
    }

    /**
     * Tải danh sách bàn ăn (Chỉ phục vụ chuyển bàn cho nhân viên/quản lý nội bộ)
     */
    async taiDanhSachBan() {
        // Khách hàng không được tải danh sách các bàn khác
        if (this.laCheDoKhachHang()) {
            this.danhSachBan = [];
            return;
        }
        if (window.api) {
            this.danhSachBan = window.api.layDanhSachBan ? await window.api.layDanhSachBan() : (window.api.layDanhSachBanAn ? await window.api.layDanhSachBanAn() : []);
        }
    }

    /**
     * Tải dữ liệu đơn hàng của bàn và render giao diện
     */
    async taiDuLieuVaVe() {
        const vungChua = document.getElementById('noi-dung-chinh');
        if (!vungChua) return;

        // Đảm bảo khách hàng luôn xem đúng bàn của mình
        if (this.laCheDoKhachHang() && this.banIdKhachHang) {
            this.banIdHienTai = this.banIdKhachHang;
        }

        if (!window.api) {
            vungChua.innerHTML = `<div class="khung-loi">Không tìm thấy dịch vụ API.</div>`;
            return;
        }

        try {
            const phanHoi = await window.api.layDanhSachDonTheoBan(this.banIdHienTai);
            this.duLieuDonBan = (phanHoi && phanHoi.ok) ? phanHoi.data : {
                banId: this.banIdHienTai,
                soBan: `Bàn ${this.banIdHienTai}`,
                khuVucTen: 'Tầng 1',
                danhSachDon: [],
                tongTienLuyKe: 0,
                thongKe: {}
            };
            const dsYeuCau = await window.api.layDanhSachYeuCauHoTro(this.banIdHienTai);
            this.veGiaoDien(vungChua, this.duLieuDonBan, dsYeuCau || []);
        } catch (err) {
            console.error('Lỗi khi tải dữ liệu theo dõi đơn:', err);
            vungChua.innerHTML = `
                <div class="khung-loi" style="padding: 24px; text-align: center;">
                    <h3>Đang làm mới dữ liệu theo dõi đơn món...</h3>
                    <p style="color: var(--mau-chu-phu); margin: 8px 0 16px;">${err.message || 'Lỗi không xác định'}</p>
                    <button class="nut nut-chinh" onclick="window.theoDoiDonMonModule.taiDuLieuVaVe()">🔄 Thử lại ngay</button>
                </div>
            `;
        }
    }

    /**
     * Render toàn bộ trang
     */
    veGiaoDien(vungChua, data, dsYeuCau) {
        const soBan = data?.soBan || (data?.ban?.tenBan || data?.ban?.maBan) || `Bàn ${this.banIdHienTai}`;
        const khuVucTen = data?.khuVucTen || 'Tầng 1';
        const danhSachDon = Array.isArray(data?.danhSachDon) ? data.danhSachDon : [];
        const tongTienLuyKe = Number(data?.tongTienLuyKe || 0);

        let thongKe = data?.thongKe;
        if (!thongKe || Object.keys(thongKe).length === 0) {
            thongKe = { tongSoMon: 0, choXacNhan: 0, dangCheBien: 0, daXong: 0, daLenMon: 0, daHuy: 0, tuChoi: 0 };
            danhSachDon.forEach(don => {
                (don.danhSachMon || []).forEach(m => {
                    const sl = Number(m.soLuong) || 1;
                    if (m.trangThai !== 'DA_HUY' && m.trangThai !== 'TU_CHOI') thongKe.tongSoMon += sl;
                    if (m.trangThai === 'CHO_XAC_NHAN') thongKe.choXacNhan += sl;
                    else if (m.trangThai === 'DANG_CHE_BIEN') thongKe.dangCheBien += sl;
                    else if (m.trangThai === 'DA_XONG' || m.trangThai === 'DA_NAU_XONG') thongKe.daXong += sl;
                    else if (m.trangThai === 'DA_LEN_MON') thongKe.daLenMon += sl;
                    else if (m.trangThai === 'DA_HUY') thongKe.daHuy += sl;
                    else if (m.trangThai === 'TU_CHOI') thongKe.tuChoi += sl;
                });
            });
        }

        const yeuCauDangCho = (dsYeuCau || []).filter(y => y.trangThai !== 'DA_XU_LY');
        const laKhach = this.laCheDoKhachHang();

        let soMonChoBungTheoBan = {};
        try {
            const rawPhien = localStorage.getItem('quanmoc_pos_phien_ban');
            if (rawPhien) {
                const pMap = JSON.parse(rawPhien);
                for (const [bId, phien] of Object.entries(pMap)) {
                    if (phien && Array.isArray(phien.danhSachMon)) {
                        const count = phien.danhSachMon.filter(m => m.trangThai === 'DA_XONG' || m.trangThai === 'DA_NAU_XONG' || m.trangThai === 'DA_CHE_BIEN').reduce((sum, m) => sum + (Number(m.soLuong) || 1), 0);
                        if (count > 0) soMonChoBungTheoBan[bId] = (soMonChoBungTheoBan[bId] || 0) + count;
                    }
                }
            }
            const rawDon = localStorage.getItem('quanmoc_ds_don_goi');
            if (rawDon) {
                const dsDon = JSON.parse(rawDon);
                dsDon.forEach(d => {
                    if (d && d.banId && Array.isArray(d.danhSachMon)) {
                        const count = d.danhSachMon.filter(m => m.trangThai === 'DA_XONG' || m.trangThai === 'DA_NAU_XONG').reduce((sum, m) => sum + (Number(m.soLuong) || 1), 0);
                        if (count > 0 && !soMonChoBungTheoBan[d.banId]) {
                            soMonChoBungTheoBan[d.banId] = count;
                        }
                    }
                });
            }
        } catch (e) {}

        vungChua.innerHTML = `
            <div class="trang-theo-doi-don-mon">
                <!-- THANH TIÊU ĐỀ & CHỌN BÀN KIỂM THỬ -->
                <div class="thanh-tieu-de-trang-s2">
                    <div class="thong-tin-ban-s2">
                        <div class="bieu-tuong-ban-s2">🍽️</div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <h2 class="ten-ban-tieu-de">${soBan || 'Bàn 03'}</h2>
                                <span class="badge badge-xanh-la">${khuVucTen || 'Tầng 1'}</span>
                            </div>
                            <p class="mo-ta-phien-ban">
                                ⏱️ Phiên ngồi tại bàn: Đang hoạt động • Mã phiên: <strong>SES-B${this.banIdHienTai}-LIVE</strong>
                            </p>
                        </div>
                    </div>

                    <div class="nhom-thao-tac-dau-trang-s2">
                        ${!laKhach ? `
                        <!-- Chọn chuyển bàn để test (Chỉ hiển thị cho Quản lý / Tester nội bộ) -->
                        <div class="hop-chon-ban-test">
                            <label for="chon-ban-theo-doi" style="font-size: 12px; font-weight: 600; color: var(--mau-chu-phu);">Xem đơn bàn:</label>
                            <select id="chon-ban-theo-doi" class="nut-select-ban" onchange="window.theoDoiDonMonModule.chuyenBanTheoDoi(this.value)">
                                ${this.danhSachBan.map(b => {
                                    const tenHienThi = b.soBan || b.tenBan || b.maBan || (`Bàn ` + b.id);
                                    const tenKhuVuc = b.khuVucTen || b.tenKhuVuc || 'KV';
                                    const trangThaiBan = b.trangThai || 'Trống';
                                    const soChoBung = soMonChoBungTheoBan[b.id] || 0;
                                    const tagChoBung = soChoBung > 0 ? ` 🔔 [CÓ ${soChoBung} MÓN BẾP XONG - CHỜ BƯNG!]` : '';
                                    return `
                                        <option value="${b.id}" ${Number(b.id) === Number(this.banIdHienTai) ? 'selected' : ''}>
                                            ${tenHienThi} (${tenKhuVuc}) - ${trangThaiBan}${tagChoBung}
                                        </option>
                                    `;
                                }).join('')}
                            </select>
                        </div>
                        ` : `
                        <!-- Huy hiệu bàn cố định dành cho khách hàng - Khóa chỉ xem bàn mình -->
                        <div class="the-ban-khach-hang">
                            <span>🪑 Bàn của bạn: <strong>${soBan}</strong></span>
                        </div>
                        `}

                        <!-- Nút Gọi thêm món mới (US-067) -->
                        <button type="button" class="nut nut-chinh" onclick="window.theoDoiDonMonModule.moModalGoiThemMon()">
                            ➕ Gọi thêm món (Lượt mới)
                        </button>
                    </div>
                </div>

                <!-- BẢNG CÔNG CỤ GIẢ LẬP REAL-TIME (Chỉ hiển thị cho nội bộ / tester, KHÔNG hiển thị cho khách hàng) -->
                ${!laKhach ? `
                <div class="bang-dieu-khien-gia-lap-s2">
                    <div class="tieu-de-gia-lap">
                        <span>🧪 <strong>Thanh kiểm thử tương tác Real-time:</strong></span>
                        <small style="color: var(--mau-chu-phu);">Click để mô phỏng tương tác từ Bếp/Thu ngân ngay trên trình duyệt mà không cần Backend thật</small>
                    </div>
                    <div class="cac-nut-gia-lap">
                        <button type="button" class="nut-mini-test nut-test-nau" onclick="window.theoDoiDonMonModule.giaLapBepChuyenTrangThai('DANG_CHE_BIEN')">
                            👨‍🍳 Bếp bắt đầu nấu
                        </button>
                        <button type="button" class="nut-mini-test nut-test-xong" onclick="window.theoDoiDonMonModule.giaLapBepChuyenTrangThai('DA_XONG')">
                            🔔 Bếp nấu xong
                        </button>
                        <button type="button" class="nut-mini-test nut-test-phuc-vu" onclick="window.theoDoiDonMonModule.giaLapBepChuyenTrangThai('DA_LEN_MON')">
                            ✅ Đã bưng lên bàn
                        </button>
                        <button type="button" class="nut-mini-test nut-test-tu-choi" onclick="window.theoDoiDonMonModule.giaLapBepTuChoiMon()">
                            🚫 Bếp từ chối (Hết món - US-069)
                        </button>
                        <button type="button" class="nut-mini-test nut-test-chuong" onclick="window.socketClient && window.socketClient.phatAmThanh('donMoi')">
                            🔊 Thử chuông báo (US-078)
                        </button>
                        <button type="button" class="nut-mini-test nut-test-nhan-vien" onclick="window.theoDoiDonMonModule.giaLapNhanVienTiepNhan()">
                            🏃 NV tiếp nhận hỗ trợ (US-074)
                        </button>
                    </div>
                </div>
                ` : ''}

                <!-- THÔNG BÁO YÊU CẦU HỖ TRỢ ĐANG CHỜ (US-074) -->
                ${yeuCauDangCho.length > 0 ? `
                    <div class="khung-thong-bao-yeu-cau-ho-tro">
                        <div class="dau-thong-bao-yc">
                            <span>🔔 <strong>Yêu cầu hỗ trợ tại bàn đang được xử lý (${yeuCauDangCho.length})</strong></span>
                        </div>
                        <div class="danh-sach-yc-item">
                            ${yeuCauDangCho.map(yc => `
                                <div class="item-yeu-cau-cho ${yc.trangThai === 'DA_TIEP_NHAN' ? 'da-tiep-nhan' : ''}">
                                    <div class="icon-yc">${yc.loaiYeuCau === 'THANH_TOAN' ? '💳' : '🙋'}</div>
                                    <div class="noi-dung-yc">
                                        <strong>${yc.tenYeuCau}</strong>
                                        <small>${yc.chiTiet || 'Không có ghi chú thêm'} • ${this.dinhDangGioPhut(yc.thoiGian || yc.thoiGianTao)}</small>
                                    </div>
                                    <div class="trang-thai-yc-badge">
                                        ${yc.trangThai === 'DA_TIEP_NHAN' 
                                             ? `<span class="badge badge-xanh-la">✅ ${yc.nguoiTiepNhan || 'Nhân viên'} đang tới!</span>` 
                                             : `<span class="badge badge-vang">⏳ Đang gửi tới nhân viên...</span>`}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- THẺ TỔNG QUAN TIẾN ĐỘ & TỔNG TIỀN LŨY KẾ (US-070) -->
                <div class="luoi-the-thong-ke-s2">
                    <div class="the-tk-s2 the-tk-tien">
                        <div class="icon-tk-s2">💵</div>
                        <div>
                            <span class="nhan-tk-s2">Tổng tiền lũy kế (US-070)</span>
                            <h3 class="gia-tri-tk-s2 gia-tri-tien">${tongTienLuyKe.toLocaleString('vi-VN')} đ</h3>
                            <small class="chu-thich-tk">${danhSachDon.length} lượt gọi món trong phiên</small>
                        </div>
                    </div>

                    <div class="the-tk-s2">
                        <div class="icon-tk-s2 icon-cho">⏳</div>
                        <div>
                            <span class="nhan-tk-s2">Chờ Bếp duyệt</span>
                            <h3 class="gia-tri-tk-s2">${thongKe.choXacNhan || 0} <span class="dvt">món</span></h3>
                            <small class="chu-thich-tk">Có thể yêu cầu hủy</small>
                        </div>
                    </div>

                    <div class="the-tk-s2">
                        <div class="icon-tk-s2 icon-nau">👨‍🍳</div>
                        <div>
                            <span class="nhan-tk-s2">Đang chế biến</span>
                            <h3 class="gia-tri-tk-s2">${thongKe.dangCheBien || 0} <span class="dvt">món</span></h3>
                            <small class="chu-thich-tk">Đầu bếp đang nấu</small>
                        </div>
                    </div>

                    <div class="the-tk-s2">
                        <div class="icon-tk-s2 icon-xong">🔔</div>
                        <div>
                            <span class="nhan-tk-s2">Đã nấu xong</span>
                            <h3 class="gia-tri-tk-s2">${thongKe.daXong || 0} <span class="dvt">món</span></h3>
                            <small class="chu-thich-tk">Chờ bưng lên bàn</small>
                        </div>
                    </div>

                    <div class="the-tk-s2">
                        <div class="icon-tk-s2 icon-phuc-vu">✅</div>
                        <div>
                            <span class="nhan-tk-s2">Đã lên món</span>
                            <h3 class="gia-tri-tk-s2">${thongKe.daLenMon || 0} <span class="dvt">món</span></h3>
                            <small class="chu-thich-tk">Khách đang thưởng thức</small>
                        </div>
                    </div>
                </div>

                <!-- THANH TÁC VỤ & BỘ LỌC TRẠNG THÁI -->
                <div class="thanh-loc-trang-thai-s2">
                    <div class="nhom-nut-loc-s2">
                        <button type="button" class="nut-loc-pill ${this.boLocTrangThai === 'TAT_CA' ? 'kich-hoat' : ''}" onclick="window.theoDoiDonMonModule.locTrangThai('TAT_CA')">
                            Tất cả (${thongKe.tongSoMon || 0})
                        </button>
                        <button type="button" class="nut-loc-pill ${this.boLocTrangThai === 'CHO_XAC_NHAN' ? 'kich-hoat' : ''}" onclick="window.theoDoiDonMonModule.locTrangThai('CHO_XAC_NHAN')">
                            ⏳ Chờ duyệt (${thongKe.choXacNhan || 0})
                        </button>
                        <button type="button" class="nut-loc-pill ${this.boLocTrangThai === 'DANG_CHE_BIEN' ? 'kich-hoat' : ''}" onclick="window.theoDoiDonMonModule.locTrangThai('DANG_CHE_BIEN')">
                            👨‍🍳 Đang nấu (${thongKe.dangCheBien || 0})
                        </button>
                        <button type="button" class="nut-loc-pill ${this.boLocTrangThai === 'DA_XONG' ? 'kich-hoat' : ''} ${thongKe.daXong > 0 ? 'pill-cho-bung' : ''}" onclick="window.theoDoiDonMonModule.locTrangThai('DA_XONG')" style="${thongKe.daXong > 0 ? 'background: #dcfce7; color: #15803d; border-color: #86efac; font-weight: 700;' : ''}">
                            🔔 Đã nấu xong (${thongKe.daXong || 0})
                        </button>
                        <button type="button" class="nut-loc-pill ${this.boLocTrangThai === 'DA_LEN_MON' ? 'kich-hoat' : ''}" onclick="window.theoDoiDonMonModule.locTrangThai('DA_LEN_MON')">
                            ✅ Đã lên món (${thongKe.daLenMon || 0})
                        </button>
                        <button type="button" class="nut-loc-pill ${this.boLocTrangThai === 'DA_HUY' ? 'kich-hoat' : ''}" onclick="window.theoDoiDonMonModule.locTrangThai('DA_HUY')">
                            ❌ Đã hủy / Từ chối (${(thongKe.daHuy || 0) + (thongKe.tuChoi || 0)})
                        </button>
                    </div>

                    <div class="nhom-nut-ho-tro-nhanh">
                        <button type="button" class="nut nut-phu nut-nho" onclick="window.hoTroTaiBan.moModalGoiNhanVien()">
                            🙋 Gọi phục vụ
                        </button>
                        <button type="button" class="nut nut-phu nut-nho" onclick="window.hoTroTaiBan.moModalYeuCauThanhToan()">
                            💳 Yêu cầu thanh toán
                        </button>
                    </div>
                </div>

                <!-- BANNER BÁO MÓN NẤU XONG CHỜ BƯNG CHO PHỤC VỤ (US-066 / US-076) -->
                ${thongKe.daXong > 0 ? `
                <div class="banner-thong-bao-cho-bung" style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15); flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <span style="font-size: 32px; animation: rungChuong 1.2s infinite ease-in-out;">🔔</span>
                        <div>
                            <h4 style="margin: 0; color: #065f46; font-size: 16px; font-weight: 700;">
                                Bếp đã nấu xong ${thongKe.daXong} món cho ${soBan}!
                            </h4>
                            <p style="margin: 4px 0 0; color: #047857; font-size: 13px;">
                                Món ăn đã sẵn sàng tại quầy Ra món (Expo). Nhân viên phục vụ hãy bưng ngay lên bàn cho khách.
                            </p>
                        </div>
                    </div>
                    <button type="button" class="nut nut-chinh" onclick="window.theoDoiDonMonModule.bungTatCaMonDaXong(${this.banIdHienTai})" style="background: #059669; border-color: #059669; color: white; padding: 10px 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; border-radius: 8px; cursor: pointer; white-space: nowrap;">
                        🚶 Bưng tất cả món đã xong (${thongKe.daXong})
                    </button>
                </div>
                ` : ''}

                <!-- DANH SÁCH CÁC LƯỢT GỌI MÓN (ROUNDS - US-065 & US-067) -->
                ${danhSachDon.length === 0 ? `
                    <div class="khung-trong">
                        <div style="font-size: 54px; margin-bottom: 12px;">🍲</div>
                        <h3>Bàn này chưa có đơn gọi món trong phiên</h3>
                        <p style="color: var(--mau-chu-phu); max-width: 520px; margin: 8px auto 20px; line-height: 1.6;">
                            Bàn <strong>${soBan}</strong> hiện chưa phát sinh đơn hàng nào. Hãy chọn món ngon từ thực đơn để bắt đầu nhé!
                        </p>
                        ${(!laKhach && Object.keys(soMonChoBungTheoBan).length > 0) ? `
                        <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 10px; padding: 14px 18px; margin: 0 auto 20px; max-width: 540px; text-align: left;">
                            <strong style="color: #065f46; display: flex; align-items: center; gap: 8px; font-size: 14px;">
                                🔔 Bếp vừa nấu xong món ở các bàn sau (Click để xem & bưng món):
                            </strong>
                            <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
                                ${Object.keys(soMonChoBungTheoBan).map(bId => {
                                    const banObj = this.danhSachBan.find(b => Number(b.id) === Number(bId));
                                    const tenBan = banObj ? (banObj.soBan || banObj.tenBan) : `Bàn ${bId}`;
                                    return `
                                        <button type="button" class="nut nut-nho" style="background: #10b981; color: white; border: none; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer;" onclick="window.theoDoiDonMonModule.chuyenBanTheoDoi(${bId})">
                                            👉 Chuyển sang ${tenBan} (${soMonChoBungTheoBan[bId]} món xong)
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}
                        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                            <button type="button" class="nut nut-chinh" onclick="window.theoDoiDonMonModule.moModalGoiThemMon()">
                                ➕ Bắt đầu đặt món mới
                            </button>
                            ${laKhach ? `
                            <button type="button" class="nut nut-phu" onclick="window.theoDoiDonMonModule.quayLaiThucDon()">
                                📖 Xem thực đơn E-Menu
                            </button>
                            ` : `
                            <button type="button" class="nut nut-phu" onclick="window.theoDoiDonMonModule.napDonMauChoBanNay()">
                                ⚡ Nạp đơn hàng mẫu kiểm thử (${soBan})
                            </button>
                            <button type="button" class="nut nut-phu" onclick="window.theoDoiDonMonModule.chuyenBanTheoDoi(1)">
                                🍽️ Xem Bàn 01
                            </button>
                            <button type="button" class="nut nut-phu" onclick="window.theoDoiDonMonModule.chuyenBanTheoDoi(3)">
                                🍽️ Xem Bàn 03 (Có sẵn 2 lượt gọi)
                            </button>
                            `}
                        </div>
                    </div>
                ` : `
                    <div class="danh-sach-cac-luot-goi-mon">
                        ${danhSachDon.slice().reverse().map((don) => this.veTheLuotGoiMon(don)).join('')}
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Render thẻ một lượt gọi món (Round)
     */
    veTheLuotGoiMon(don) {
        // Áp dụng bộ lọc
        let dsMon = don.danhSachMon || [];
        if (this.boLocTrangThai === 'CHO_XAC_NHAN') dsMon = dsMon.filter(m => m.trangThai === 'CHO_XAC_NHAN');
        else if (this.boLocTrangThai === 'DANG_CHE_BIEN') dsMon = dsMon.filter(m => m.trangThai === 'DANG_CHE_BIEN');
        else if (this.boLocTrangThai === 'DA_XONG') dsMon = dsMon.filter(m => m.trangThai === 'DA_XONG' || m.trangThai === 'DA_NAU_XONG' || m.trangThai === 'DA_CHE_BIEN');
        else if (this.boLocTrangThai === 'DA_LEN_MON') dsMon = dsMon.filter(m => m.trangThai === 'DA_LEN_MON');
        else if (this.boLocTrangThai === 'DA_HUY') dsMon = dsMon.filter(m => m.trangThai === 'DA_HUY' || m.trangThai === 'TU_CHOI');

        if (dsMon.length === 0 && this.boLocTrangThai !== 'TAT_CA') {
            return ''; // Không có món nào thỏa mãn bộ lọc trong lượt này
        }

        const tongTienDon = Number(don.tongTien !== undefined ? don.tongTien : (don.tongTienDon || 0));

        return `
            <div class="the-luot-goi-mon">
                <!-- Đầu thẻ lượt gọi -->
                <div class="dau-the-luot-goi">
                    <div class="thong-tin-luot">
                        <span class="badge-luot-goi">Lượt gọi #${don.luotGoi}</span>
                        <span class="ma-don-hang">Mã: <strong>${don.maDon}</strong></span>
                        <span class="thoi-gian-don">🕒 ${this.dinhDangThoiGian(don.thoiGianTaoVN || don.thoiGianTao)}</span>
                    </div>
                    <div class="tong-tien-luot">
                        <span>Lượt này: <strong>${tongTienDon.toLocaleString('vi-VN')} đ</strong></span>
                    </div>
                </div>

                ${don.ghiChuDon ? `
                    <div class="ghi-chu-chung-don">
                        💬 <strong>Ghi chú đơn:</strong> ${don.ghiChuDon}
                    </div>
                ` : ''}

                <!-- Danh sách món ăn trong lượt -->
                <div class="danh-sach-mon-trong-luot">
                    ${dsMon.map(mon => this.veDongMonAn(mon, don)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render từng món ăn kèm thanh Stepper tiến độ 4 bước (US-066) và nút Hủy món (US-068)
     */
    veDongMonAn(mon, don) {
        const laChoXacNhan = mon.trangThai === 'CHO_XAC_NHAN';
        const laDangNau = mon.trangThai === 'DANG_CHE_BIEN';
        const laDaXong = mon.trangThai === 'DA_XONG' || mon.trangThai === 'DA_NAU_XONG';
        const laDaLenMon = mon.trangThai === 'DA_LEN_MON';
        const laDaHuy = mon.trangThai === 'DA_HUY';
        const laTuChoi = mon.trangThai === 'TU_CHOI';

        return `
            <div class="dong-mon-an-s2 ${laDaHuy || laTuChoi ? 'mon-bi-huy' : ''}">
                <div class="cot-thong-tin-mon">
                    <div class="ten-va-so-luong">
                        <span class="so-luong-badge">x${mon.soLuong}</span>
                        <strong class="ten-mon-an-txt">${mon.tenMon}</strong>
                        ${mon.size && mon.size !== 'Tiêu chuẩn' ? `<span class="badge-size-topping">${mon.size}</span>` : ''}
                        ${mon.topping ? `<span class="badge-size-topping">${mon.topping}</span>` : ''}
                    </div>

                    ${mon.ghiChu ? `
                        <div class="ghi-chu-khau-vi-s2">
                            📝 <strong>Khẩu vị:</strong> ${mon.ghiChu}
                        </div>
                    ` : ''}

                    ${laTuChoi ? `
                        <div class="canh-bao-bep-tu-choi-box">
                            🚫 <strong>Bếp từ chối món:</strong> ${mon.lyDoTuChoi || 'Hết nguyên liệu trong ngày'} (Đã trừ tiền)
                        </div>
                    ` : ''}

                    ${laDaHuy ? `
                        <div class="canh-bao-huy-box">
                            ❌ <strong>Món đã hủy:</strong> ${mon.lyDoHuy || 'Khách yêu cầu hủy'} (Đã trừ tiền)
                        </div>
                    ` : ''}
                </div>

                <!-- Cột Stepper tiến độ thời gian thực (US-066) -->
                ${!laDaHuy && !laTuChoi ? `
                    <div class="cot-tien-do-stepper">
                        <div class="thanh-stepper-4-buoc">
                            <div class="buoc-stepper ${laChoXacNhan || laDangNau || laDaXong || laDaLenMon ? 'hoan-thanh' : ''} ${laChoXacNhan ? 'hien-tai' : ''}">
                                <div class="dau-cham-buoc">⏳</div>
                                <span class="nhan-buoc">Chờ xác nhận</span>
                            </div>
                            <div class="duong-noi-buoc ${laDangNau || laDaXong || laDaLenMon ? 'da-qua' : ''}"></div>

                            <div class="buoc-stepper ${laDangNau || laDaXong || laDaLenMon ? 'hoan-thanh' : ''} ${laDangNau ? 'hien-tai' : ''}">
                                <div class="dau-cham-buoc">👨‍🍳</div>
                                <span class="nhan-buoc">Đang nấu</span>
                            </div>
                            <div class="duong-noi-buoc ${laDaXong || laDaLenMon ? 'da-qua' : ''}"></div>

                            <div class="buoc-stepper ${laDaXong || laDaLenMon ? 'hoan-thanh' : ''} ${laDaXong ? 'hien-tai' : ''}">
                                <div class="dau-cham-buoc">🔔</div>
                                <span class="nhan-buoc">Đã xong</span>
                            </div>
                            <div class="duong-noi-buoc ${laDaLenMon ? 'da-qua' : ''}"></div>

                            <div class="buoc-stepper ${laDaLenMon ? 'hoan-thanh' : ''} ${laDaLenMon ? 'hien-tai' : ''}">
                                <div class="dau-cham-buoc">✅</div>
                                <span class="nhan-buoc">Đã lên bàn</span>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="cot-tien-do-stepper">
                        <span class="badge badge-do">${laTuChoi ? '🚫 Bếp từ chối' : '❌ Đã hủy món'}</span>
                    </div>
                `}

                <!-- Cột Thành tiền & Nút hủy món (US-068) -->
                <div class="cot-gia-va-thao-tac">
                    <div class="gia-mon-txt ${laDaHuy || laTuChoi ? 'gach-gia' : ''}">
                        ${Number(mon.thanhTien || 0).toLocaleString('vi-VN')} đ
                    </div>

                    ${laChoXacNhan ? `
                        <button type="button" class="nut-huy-mon-mini" onclick="window.theoDoiDonMonModule.xacNhanHuyMon(${mon.id}, '${mon.tenMon}')" title="Hủy món khi Bếp chưa nấu (US-068)">
                            ❌ Hủy món này
                        </button>
                    ` : ''}

                    ${(laDaXong && !this.laCheDoKhachHang()) ? `
                        <button type="button" class="nut-bung-mon-mini" onclick="window.theoDoiDonMonModule.xacNhanDaBungMon(${mon.id}, '${(mon.tenMon || '').replace(/'/g, "\\'")}', ${don.banId || this.banIdHienTai || 0})" title="Xác nhận nhân viên đã bưng món lên bàn">
                            🚶 Đã bưng lên bàn
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Xác nhận nhân viên phục vụ đã bưng món lên bàn
     */
    async xacNhanDaBungMon(monId, tenMon, banId) {
        try {
            banId = Number(banId || this.banIdHienTai);
            await window.api.capNhatTrangThaiMonAn(monId, banId, 'DA_LEN_MON');
            if (window.thongBao) {
                window.thongBao.thanhCong('Đã bưng món', `Đã xác nhận bưng món "${tenMon}" lên bàn.`);
            }
            await this.taiDuLieuVaVe();
        } catch (e) {
            console.error('Lỗi xác nhận bưng món:', e);
        }
    }

    /**
     * Phục vụ bưng tất cả các món đã nấu xong lên bàn
     */
    async bungTatCaMonDaXong(banId) {
        banId = Number(banId || this.banIdHienTai);
        try {
            const monDaXong = [];
            (this.duLieuDonBan?.danhSachDon || []).forEach(don => {
                (don.danhSachMon || []).forEach(m => {
                    if (m.trangThai === 'DA_XONG' || m.trangThai === 'DA_NAU_XONG' || m.trangThai === 'DA_CHE_BIEN') {
                        monDaXong.push(m);
                    }
                });
            });

            if (monDaXong.length === 0) {
                if (window.thongBao) window.thongBao.thongTin('Thông báo', 'Hiện không có món nào đang chờ bưng.');
                return;
            }

            for (const mon of monDaXong) {
                await window.api.capNhatTrangThaiMonAn(mon.id, banId, 'DA_LEN_MON');
            }

            if (window.thongBao) {
                window.thongBao.thanhCong('Hoàn tất bưng món', `Đã bưng thành công ${monDaXong.length} món lên bàn.`);
            }

            await this.taiDuLieuVaVe();
        } catch (e) {
            console.error('Lỗi khi bưng tất cả món:', e);
            if (window.thongBao) window.thongBao.loi('Lỗi', 'Không thể hoàn tất bưng món: ' + e.message);
        }
    }

    /**
     * Chuyển đổi bàn theo dõi (Chỉ cho phép quản lý / nhân viên kiểm thử nội bộ)
     */
    chuyenBanTheoDoi(banId) {
        if (this.laCheDoKhachHang()) {
            console.warn('Khách hàng chỉ được phép xem bàn của mình.');
            if (window.thongBao) {
                window.thongBao.canhBao('Chỉ xem bàn của bạn', 'Bạn chỉ có thể xem và theo dõi đơn món của bàn mình đang ngồi.');
            }
            return;
        }
        this.banIdHienTai = Number(banId);
        localStorage.setItem('quanmoc_ban_id_hien_tai', this.banIdHienTai);
        if (window.hoTroTaiBan) {
            window.hoTroTaiBan.datBanHienTai(this.banIdHienTai);
        }
        this.taiDuLieuVaVe();
    }

    /**
     * Lọc trạng thái món
     */
    locTrangThai(trangThai) {
        this.boLocTrangThai = trangThai;
        this.taiDuLieuVaVe();
    }

    /**
     * US-068: Hộp thoại xác nhận hủy món khi còn chờ xác nhận
     */
    xacNhanHuyMon(idMonChiTiet, tenMon) {
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        modal.innerHTML = `
            <div class="hop-thoai-modal hop-thoai-xac-nhan" style="max-width: 440px;">
                <div class="dau-modal">
                    <h3 style="color: #DC2626;">❌ Xác Nhận Hủy Món (US-068)</h3>
                    <button type="button" class="nut-dong-modal" onclick="window.theoDoiDonMonModule.dongModal()">✕</button>
                </div>
                <div class="than-modal">
                    <p style="font-size: 14px; color: #1F2937; margin-bottom: 12px;">
                        Bạn có chắc chắn muốn hủy món: <strong>${tenMon}</strong>?
                    </p>
                    <p style="font-size: 12px; color: var(--mau-chu-phu); margin-bottom: 14px;">
                        Món này đang ở trạng thái <em>Chờ xác nhận</em> nên được phép hủy trực tiếp. Sau khi hủy, hệ thống sẽ tự động trừ số tiền này khỏi hóa đơn.
                    </p>
                    <div class="nhom-form">
                        <label class="nhan-form">Lý do hủy món:</label>
                        <select id="ly-do-huy-select" class="nhap-du-lieu">
                            <option value="Khách đổi ý không muốn ăn nữa">Khách đổi ý không muốn ăn nữa</option>
                            <option value="Khách muốn đổi sang món khác">Khách muốn đổi sang món khác</option>
                            <option value="Bấm nhầm số lượng">Bấm nhầm số lượng</option>
                            <option value="Thời gian chờ lâu">Thời gian chờ lâu</option>
                        </select>
                    </div>
                </div>
                <div class="duoi-modal">
                    <button type="button" class="nut nut-phu" onclick="window.theoDoiDonMonModule.dongModal()">Không hủy</button>
                    <button type="button" class="nut nut-nguy-hiem" onclick="window.theoDoiDonMonModule.thucHienHuyMon(${idMonChiTiet})">
                        Xác nhận hủy món
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    async thucHienHuyMon(idMonChiTiet) {
        const select = document.getElementById('ly-do-huy-select');
        const lyDo = select ? select.value : 'Khách yêu cầu hủy';

        const kq = await window.api.huyMonChuaCheBien(idMonChiTiet, this.banIdHienTai, lyDo);
        this.dongModal();

        if (kq && kq.ok) {
            if (window.thongBao) {
                window.thongBao.thanhCong('Hủy món thành công', kq.msg);
            }
            this.taiDuLieuVaVe();
        } else {
            if (window.thongBao) {
                window.thongBao.thatBai('Không thể hủy món', kq ? kq.msg : 'Có lỗi');
            }
        }
    }

    /**
     * US-067: Mở Modal gọi thêm món (Order bổ sung lượt mới)
     */
    async moModalGoiThemMon() {
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        // Lấy danh sách thực đơn đang bán
        const dsMon = await window.api.layDanhSachMonAn({ trangThai: 1 });

        modal.innerHTML = `
            <div class="hop-thoai-modal hop-thoai-goi-them-mon" style="max-width: 650px;">
                <div class="dau-modal">
                    <h3>➕ Gọi Thêm Món (Lượt Bổ Sung) - Bàn ${this.banIdHienTai}</h3>
                    <button type="button" class="nut-dong-modal" onclick="window.theoDoiDonMonModule.dongModal()">✕</button>
                </div>
                <div class="than-modal">
                    <p style="font-size: 13px; color: var(--mau-chu-phu); margin-bottom: 14px;">
                        Chọn món ăn để gọi thêm vào phiên ăn hiện tại. Đơn bổ sung sẽ được đánh số lượt tiếp theo (US-067):
                    </p>

                    <!-- Danh sách chọn món nhanh -->
                    <div class="luoi-mon-an-goi-them">
                        ${dsMon.slice(0, 6).map(m => `
                            <div class="the-mon-goi-them-item" data-mon-id="${m.id}">
                                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                    <strong>${m.tenMon}</strong>
                                    <span class="gia-mon-them">${m.giaBan.toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div style="font-size:11px; color: var(--mau-chu-phu); margin: 4px 0 8px;">${m.donViTinh}</div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <input type="text" class="ghi-chu-mon-them nhap-du-lieu-mini" placeholder="Ghi chú khẩu vị..." style="width: 65%;">
                                    <button type="button" class="nut nut-chinh nut-nho nut-them-vao-luot" onclick="window.theoDoiDonMonModule.chonMonVaoLuot(${m.id}, '${m.tenMon}', ${m.giaBan})">
                                        + Chọn
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 16px; border-top: 1px solid var(--mau-vien); padding-top: 12px;">
                        <h4 style="font-size: 14px; margin-bottom: 8px;">📋 Món đã chọn cho lượt bổ sung này:</h4>
                        <div id="danh-sach-mon-da-chon-them" style="min-height: 48px; background: #F9FAFB; border-radius: 8px; padding: 10px; font-size: 13px;">
                            <span style="color: #9CA3AF;">Chưa chọn món nào. Hãy bấm nút "+ Chọn" ở các món bên trên.</span>
                        </div>
                    </div>

                    <div class="nhom-form" style="margin-top: 12px;">
                        <label class="nhan-form">Ghi chú chung cho lượt gọi thêm này:</label>
                        <input type="text" id="ghi-chu-luot-moi" class="nhap-du-lieu" placeholder="Ví dụ: Mang kèm nước chấm chanh ớt...">
                    </div>
                </div>
                <div class="duoi-modal">
                    <button type="button" class="nut nut-phu" onclick="window.theoDoiDonMonModule.dongModal()">Hủy</button>
                    <button type="button" class="nut nut-chinh" id="nut-gui-order-bo-sung" onclick="window.theoDoiDonMonModule.guiOrderBoSung()" disabled>
                        🚀 Gửi Bếp lượt gọi thêm
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
        this.gioHangBoSung = [];
    }

    chonMonVaoLuot(idMon, tenMon, donGia) {
        if (!this.gioHangBoSung) this.gioHangBoSung = [];
        
        // Kiểm tra xem đã có chưa
        const tonTai = this.gioHangBoSung.find(m => m.id === idMon);
        if (tonTai) {
            tonTai.soLuong += 1;
        } else {
            this.gioHangBoSung.push({
                id: idMon,
                tenMon,
                donGia,
                soLuong: 1,
                size: 'Tiêu chuẩn',
                topping: '',
                ghiChu: ''
            });
        }

        this.capNhatKhungMonDaChon();
    }

    capNhatKhungMonDaChon() {
        const khung = document.getElementById('danh-sach-mon-da-chon-them');
        const btnGui = document.getElementById('nut-gui-order-bo-sung');
        if (!khung) return;

        if (!this.gioHangBoSung || this.gioHangBoSung.length === 0) {
            khung.innerHTML = `<span style="color: #9CA3AF;">Chưa chọn món nào. Hãy bấm nút "+ Chọn" ở các món bên trên.</span>`;
            if (btnGui) btnGui.disabled = true;
            return;
        }

        let tongTam = 0;
        khung.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:6px;">
                ${this.gioHangBoSung.map((m, idx) => {
                    const tien = m.donGia * m.soLuong;
                    tongTam += tien;
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#FFF; padding:6px 10px; border-radius:6px; border:1px solid #E5E7EB;">
                            <div>
                                <strong>${m.tenMon}</strong> x${m.soLuong} 
                                <span style="color:#B85D19;">(${tien.toLocaleString('vi-VN')}đ)</span>
                            </div>
                            <button type="button" onclick="window.theoDoiDonMonModule.xoaMonKhoiGio(${idx})" style="background:none; border:none; color:#EF4444; cursor:pointer; font-weight:bold;">✕</button>
                        </div>
                    `;
                }).join('')}
                <div style="text-align:right; font-weight:bold; margin-top:4px; color:#2C1810;">
                    Tạm tính lượt mới: ${tongTam.toLocaleString('vi-VN')} đ
                </div>
            </div>
        `;
        if (btnGui) btnGui.disabled = false;
    }

    xoaMonKhoiGio(index) {
        if (this.gioHangBoSung) {
            this.gioHangBoSung.splice(index, 1);
            this.capNhatKhungMonDaChon();
        }
    }

    /**
     * Xác nhận gửi Order bổ sung (US-063, US-064, US-067)
     */
    async guiOrderBoSung() {
        if (!this.gioHangBoSung || this.gioHangBoSung.length === 0) return;

        const ghiChuDon = document.getElementById('ghi-chu-luot-moi')?.value.trim() || '';

        const donGoi = {
            banId: this.banIdHienTai,
            ghiChuDon,
            danhSachMon: this.gioHangBoSung
        };

        const kq = await window.api.taoDonGoiMon(donGoi);
        this.dongModal();

        if (kq && kq.ok) {
            if (window.thongBao) {
                window.thongBao.thanhCong('Gửi đơn thành công (US-064)', kq.msg);
            }
            this.taiDuLieuVaVe();
        } else {
            if (window.thongBao) {
                window.thongBao.thatBai('Không thể gửi đơn', kq ? kq.msg : 'Có lỗi');
            }
        }
    }

    // =========================================================================
    // CÁC HÀM GIẢ LẬP REAL-TIME CHO TESTER / GIẢNG VIÊN (US-075 -> US-078)
    // =========================================================================

    /**
     * Giả lập Bếp chuyển trạng thái món ăn đầu tiên còn ở trạng thái trước
     */
    async giaLapBepChuyenTrangThai(trangThaiDich) {
        if (!this.duLieuDonBan || !this.duLieuDonBan.danhSachDon) return;

        // Tìm món phù hợp để chuyển trạng thái
        let monCanChuyen = null;
        for (const don of this.duLieuDonBan.danhSachDon) {
            for (const mon of don.danhSachMon) {
                if (trangThaiDich === 'DANG_CHE_BIEN' && mon.trangThai === 'CHO_XAC_NHAN') {
                    monCanChuyen = mon;
                    break;
                } else if (trangThaiDich === 'DA_XONG' && mon.trangThai === 'DANG_CHE_BIEN') {
                    monCanChuyen = mon;
                    break;
                } else if (trangThaiDich === 'DA_LEN_MON' && (mon.trangThai === 'DA_XONG' || mon.trangThai === 'DANG_CHE_BIEN')) {
                    monCanChuyen = mon;
                    break;
                }
            }
            if (monCanChuyen) break;
        }

        if (!monCanChuyen) {
            if (window.thongBao) {
                window.thongBao.canhBao('Không có món phù hợp', `Hiện không có món nào để chuyển sang trạng thái "${trangThaiDich}".`);
            }
            return;
        }

        const kq = await window.api.capNhatTrangThaiMonAn(monCanChuyen.id, this.banIdHienTai, trangThaiDich);
        if (kq.ok) {
            if (window.thongBao) {
                window.thongBao.thongTin('Real-time Bếp cập nhật', `Món [${monCanChuyen.tenMon}] đã chuyển sang: ${trangThaiDich}`);
            }
            this.taiDuLieuVaVe();
        }
    }

    /**
     * Giả lập Bếp từ chối món do hết nguyên liệu (US-069)
     */
    async giaLapBepTuChoiMon() {
        if (!this.duLieuDonBan || !this.duLieuDonBan.danhSachDon) return;

        // Tìm món đang chờ hoặc đang nấu
        let monCanTuChoi = null;
        for (const don of this.duLieuDonBan.danhSachDon) {
            for (const mon of don.danhSachMon) {
                if (mon.trangThai === 'CHO_XAC_NHAN' || mon.trangThai === 'DANG_CHE_BIEN') {
                    monCanTuChoi = mon;
                    break;
                }
            }
            if (monCanTuChoi) break;
        }

        if (!monCanTuChoi) {
            if (window.thongBao) {
                window.thongBao.canhBao('Không có món', 'Không có món nào đang chờ chế biến để từ chối.');
            }
            return;
        }

        const lyDo = 'Bếp trưởng thông báo vừa hết nguyên liệu tươi của món này trong ngày';
        await window.api.tuChoiMonTuBep(monCanTuChoi.id, this.banIdHienTai, lyDo);
        this.taiDuLieuVaVe();
    }

    /**
     * Giả lập nhân viên tiếp nhận yêu cầu hỗ trợ (US-074)
     */
    async giaLapNhanVienTiepNhan() {
        const ds = await window.api.layDanhSachYeuCauHoTro(this.banIdHienTai);
        const yc = ds.find(y => y.trangThai === 'CHO_TIEP_NHAN');

        if (!yc) {
            if (window.thongBao) {
                window.thongBao.canhBao('Không có yêu cầu chờ', 'Bàn này hiện không có yêu cầu hỗ trợ nào đang chờ tiếp nhận. Hãy bấm "Gọi phục vụ" trước nhé!');
            }
            return;
        }

        await window.api.tiepNhanYeuCauHoTro(yc.id, 'Phạm Văn Phục Vụ (Tầng 1)');
        this.taiDuLieuVaVe();
    }

    /**
     * Nạp dữ liệu đơn hàng mẫu cho bàn đang chọn để phục vụ kiểm thử nhanh (US-063 -> US-070)
     */
    async napDonMauChoBanNay() {
        const banId = this.banIdHienTai;
        const ban = this.danhSachBan.find(b => Number(b.id) === Number(banId));
        const soBan = ban ? ban.soBan : `Bàn ${banId}`;
        const khuVucTen = ban ? (ban.khuVucTen || 'Tầng 1') : 'Nhà hàng';

        const don1 = {
            id: Date.now(),
            maDon: `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*900)+100)}`,
            banId: Number(banId),
            soBan: soBan,
            khuVucTen: khuVucTen,
            luotGoi: 1,
            thoiGianTao: new Date(Date.now() - 25*60000).toISOString().replace('T', ' ').substring(0, 19),
            ghiChuDon: 'Khách đến ăn tối gia đình',
            tongTien: 335000,
            danhSachMon: [
                {
                    id: Date.now() + 1,
                    monId: 1,
                    tenMon: 'Gà Nướng Ống Tre Tây Bắc',
                    size: 'Nguyên con tiêu chuẩn',
                    topping: 'Xôi nếp nương nướng (+35.000đ)',
                    donGia: 280000,
                    soLuong: 1,
                    thanhTien: 280000,
                    ghiChu: 'Gà nướng kỹ da giòn, bớt cay',
                    trangThai: 'DA_LEN_MON',
                    thoiGianCapNhat: new Date(Date.now() - 5*60000).toISOString().replace('T', ' ').substring(0, 19)
                },
                {
                    id: Date.now() + 2,
                    monId: 8,
                    tenMon: 'Trà Sen Vàng Củ Năng Hạt Sen',
                    size: 'Size L (Khổng lồ)',
                    topping: 'Kem cheese béo ngậy (+12.000đ)',
                    donGia: 55000,
                    soLuong: 1,
                    thanhTien: 55000,
                    ghiChu: 'Ít đường, nhiều đá',
                    trangThai: 'DA_XONG',
                    thoiGianCapNhat: new Date(Date.now() - 8*60000).toISOString().replace('T', ' ').substring(0, 19)
                }
            ]
        };

        const don2 = {
            id: Date.now() + 10,
            maDon: `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*900)+100)}`,
            banId: Number(banId),
            soBan: soBan,
            khuVucTen: khuVucTen,
            luotGoi: 2,
            thoiGianTao: new Date(Date.now() - 8*60000).toISOString().replace('T', ' ').substring(0, 19),
            ghiChuDon: 'Gọi thêm món',
            tongTien: 185000,
            danhSachMon: [
                {
                    id: Date.now() + 11,
                    monId: 7,
                    tenMon: 'Rau Rừng Gia Lai Xào Tỏi',
                    size: 'Tiêu chuẩn',
                    topping: '',
                    donGia: 75000,
                    soLuong: 1,
                    thanhTien: 75000,
                    ghiChu: 'Xào nhiều tỏi, bớt dầu mỡ',
                    trangThai: 'DANG_CHE_BIEN',
                    thoiGianCapNhat: new Date(Date.now() - 4*60000).toISOString().replace('T', ' ').substring(0, 19)
                },
                {
                    id: Date.now() + 12,
                    monId: 6,
                    tenMon: 'Gỏi Ngó Sen Tôm Thịt Hoa Chuối',
                    size: 'Tiêu chuẩn',
                    topping: 'Bánh phồng tôm chiên thêm (+15.000đ)',
                    donGia: 110000,
                    soLuong: 1,
                    thanhTien: 110000,
                    ghiChu: 'Không ăn cay, tôm bóc vỏ kỹ',
                    trangThai: 'CHO_XAC_NHAN',
                    thoiGianCapNhat: new Date(Date.now() - 8*60000).toISOString().replace('T', ' ').substring(0, 19)
                }
            ]
        };

        const raw = localStorage.getItem(window.HANG_SO?.KHOA_LUU_TRU?.DANH_SACH_DON_GOI || 'quanmoc_ds_don_goi');
        const dsDon = raw ? JSON.parse(raw) : [];
        dsDon.push(don1, don2);
        localStorage.setItem(window.HANG_SO?.KHOA_LUU_TRU?.DANH_SACH_DON_GOI || 'quanmoc_ds_don_goi', JSON.stringify(dsDon));

        if (window.thongBao) {
            window.thongBao.thanhCong('Nạp đơn mẫu thành công', `Đã tạo 2 lượt gọi món mẫu cho ${soBan}.`);
        }
        await this.taiDuLieuVaVe();
    }

    dongModal() {
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (modal) {
            modal.classList.remove('mo');
            modal.innerHTML = '';
        }
    }

    /**
     * Điều hướng quay lại thực đơn E-Menu cho khách hàng
     */
    quayLaiThucDon() {
        this.dongModal();
        if (window.ungDung) {
            window.ungDung.chuyenTab('eMenuKhachHang');
        } else {
            window.location.hash = '#e-menu';
        }
    }

    /**
     * Định dạng ngày giờ chuẩn Việt Nam (Asia/Ho_Chi_Minh - GMT+7)
     * Đảm bảo luôn chính xác giờ Việt Nam kể cả máy chủ chạy múi giờ UTC
     */
    dinhDangThoiGian(thoiGian) {
        if (!thoiGian) return '---';
        if (window.DinhDang && typeof window.DinhDang.ngayGio === 'function') {
            return window.DinhDang.ngayGio(thoiGian);
        }
        try {
            const d = new Date(thoiGian);
            if (isNaN(d.getTime())) return String(thoiGian);
            return new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour12: false
            }).format(d).replace(',', '');
        } catch (e) {
            return String(thoiGian);
        }
    }

    /**
     * Định dạng giờ:phút chuẩn Việt Nam (Asia/Ho_Chi_Minh - GMT+7)
     */
    dinhDangGioPhut(thoiGian) {
        if (!thoiGian) return '--:--';
        if (window.DinhDang && typeof window.DinhDang.gioPhut === 'function') {
            return window.DinhDang.gioPhut(thoiGian);
        }
        try {
            const d = new Date(thoiGian);
            if (isNaN(d.getTime())) return String(thoiGian).substring(11, 16);
            return new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(d);
        } catch (e) {
            return String(thoiGian).substring(11, 16);
        }
    }

    /**
     * Tự động đồng bộ thời gian thực mỗi 3s (Cross-device real-time sync)
     * Giúp POS / màn hình theo dõi trên máy tính tự động cập nhật khi khách đặt món từ điện thoại
     */
    batDauTuDongDongBo() {
        if (this.intervalDongBo) clearInterval(this.intervalDongBo);
        this.intervalDongBo = setInterval(async () => {
            const vungChua = document.getElementById('noi-dung-chinh');
            const coTrangTheoDoi = document.querySelector('.trang-theo-doi-don-mon');
            const coModalMo = document.querySelector('.khung-modal.mo, #khung-modal-toan-cuc.mo');

            // Chỉ poll khi trang theo dõi đơn đang hiển thị và không có modal mở
            if (!vungChua || !coTrangTheoDoi || coModalMo) return;

            // Đảm bảo khách hàng luôn theo dõi đúng bàn của mình
            if (this.laCheDoKhachHang() && this.banIdKhachHang) {
                this.banIdHienTai = this.banIdKhachHang;
            }

            try {
                const phanHoi = await window.api.layDanhSachDonTheoBan(this.banIdHienTai);
                if (phanHoi && phanHoi.ok && phanHoi.data) {
                    const duLieuMoi = phanHoi.data;
                    const jsonMoi = JSON.stringify(duLieuMoi);
                    const jsonCu = JSON.stringify(this.duLieuDonBan);
                    if (jsonMoi !== jsonCu) {
                        this.duLieuDonBan = duLieuMoi;
                        const dsYeuCau = await window.api.layDanhSachYeuCauHoTro(this.banIdHienTai);
                        this.veGiaoDien(vungChua, this.duLieuDonBan, dsYeuCau || []);
                    }
                }
            } catch (e) {
                // Background poll silent
            }
        }, 3000);
    }

    huyTuDongDongBo() {
        if (this.intervalDongBo) {
            clearInterval(this.intervalDongBo);
            this.intervalDongBo = null;
        }
    }
}

// Khởi tạo đối tượng toàn cục
window.theoDoiDonMonModule = new TheoDoiDonMonModule();
