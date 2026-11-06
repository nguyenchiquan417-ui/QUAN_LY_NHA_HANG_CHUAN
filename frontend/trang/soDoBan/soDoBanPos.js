/**
 * PHÂN HỆ SƠ ĐỒ BÀN POS & VẬN HÀNH PHỤC VỤ (soDoBanPos.js)
 * Phụ trách: Quân (Frontend Table QR & POS Lead)
 * Đáp ứng các User Story trong Sprint 3:
 * - US-089: Thu ngân / Quản lý hủy món theo yêu cầu của khách (khi chưa nấu)
 * - US-090: Xử lý đổi trả món kèm ghi nhận lý do
 * - US-091: Lưu nhật ký hủy / trả món để đối soát thất thoát
 * - US-092: Sơ đồ bàn trực quan theo khu vực với màu sắc phân biệt trạng thái
 * - US-093: Hiển thị thời gian khách ngồi và tổng tiền tạm tính trên từng thẻ bàn
 * - US-094: Mở bàn trực tiếp cho khách tại chỗ
 * - US-095: Nhân viên gọi món hộ khách trực tiếp tại bàn
 * - US-096: Xác nhận món ăn đã được bưng lên bàn ("Đã phục vụ")
 * - US-097: Chuyển toàn bộ đơn hàng sang bàn trống khác (Chuyển bàn)
 * - US-098: Ghép đơn hàng của 2 hoặc nhiều bàn vào chung một hóa đơn (Ghép bàn)
 */

class SoDoBanPosModule {
    constructor() {
        this.khoiTaoDuLieuKho();
        this.boLocKhuVuc = 'TAT_CA';
        this.boLocTrangThai = 'TAT_CA';
        this.tuKhoaTimKiem = '';
        this.banDangChon = null;
    }

    /**
     * Khởi tạo kho dữ liệu lưu trữ phiên bàn & đơn gọi món trong LocalStorage
     */
    khoiTaoDuLieuKho() {
        // 1. Khởi tạo danh sách phiên bàn đang hoạt động
        const KHOA_PHIEN = 'quanmoc_pos_phien_ban';
        if (!localStorage.getItem(KHOA_PHIEN)) {
            const duLieuPhienBan = {
                // Bàn 02 (Đang dùng, ngồi 35 phút, 4 khách)
                2: {
                    id: 2,
                    banId: 2,
                    soKhach: 4,
                    thoiGianBatDau: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
                    ghiChu: 'Khách gia đình có trẻ nhỏ',
                    danhSachMon: [
                        { id: 101, monAnId: 2, tenMon: 'Lẩu Nấm Bò Tơ Quán Mộc', soLuong: 1, donGia: 495000, tuyChon: 'Phần lớn (4-6 người)', ghiChu: 'Nước dùng thanh, ít cay', trangThai: 'DA_PHUC_VU' },
                        { id: 102, monAnId: 3, tenMon: 'Bò Tơ Nướng Tảng Sốt Tiêu Rừng', soLuong: 2, donGia: 260000, tuyChon: 'Phần 300g', ghiChu: 'Chín vừa (Medium well)', trangThai: 'DA_PHUC_VU' },
                        { id: 103, monAnId: 7, tenMon: 'Rau Rừng Gia Lai Xào Tỏi', soLuong: 1, donGia: 75000, tuyChon: '', ghiChu: 'Nhiều tỏi', trangThai: 'DA_PHUC_VU' },
                        { id: 104, monAnId: 8, tenMon: 'Trà Sen Vàng Củ Năng Hạt Sen', soLuong: 4, donGia: 45000, tuyChon: 'Size M', ghiChu: 'Ít đá, 50% đường', trangThai: 'DA_PHUC_VU' },
                        { id: 105, monAnId: 6, tenMon: 'Gỏi Ngó Sen Tôm Thịt Hoa Chuối', soLuong: 1, donGia: 110000, tuyChon: '', ghiChu: 'Cay nhẹ', trangThai: 'DANG_CHE_BIEN' }
                    ]
                },
                // Bàn 04 (Chờ thanh toán, ngồi 50 phút, 6 khách)
                4: {
                    id: 4,
                    banId: 4,
                    soKhach: 6,
                    thoiGianBatDau: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
                    ghiChu: 'Gần quầy bar, thanh toán chuyển khoản',
                    danhSachMon: [
                        { id: 201, monAnId: 4, tenMon: 'Cơm Cháy Kho Quẹt Nam Bộ', soLuong: 1, donGia: 95000, tuyChon: '', ghiChu: 'Kho quẹt nóng', trangThai: 'DA_PHUC_VU' },
                        { id: 202, monAnId: 3, tenMon: 'Bò Tơ Nướng Tảng Sốt Tiêu Rừng', soLuong: 2, donGia: 260000, tuyChon: 'Phần 300g', ghiChu: '', trangThai: 'DA_PHUC_VU' },
                        { id: 203, monAnId: 8, tenMon: 'Trà Sen Vàng Củ Năng Hạt Sen', soLuong: 6, donGia: 45000, tuyChon: 'Size M', ghiChu: '', trangThai: 'DA_PHUC_VU' }
                    ]
                },
                // Bàn 06 (Cần hỗ trợ, ngồi 15 phút, 2 khách)
                6: {
                    id: 6,
                    banId: 6,
                    soKhach: 2,
                    thoiGianBatDau: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                    ghiChu: 'Khách xin thêm 2 chén mắm và khăn lạnh',
                    danhSachMon: [
                        { id: 301, monAnId: 1, tenMon: 'Gỏi Bò Bóp Thấu Quán Mộc', soLuong: 1, donGia: 125000, tuyChon: '', ghiChu: 'Ít ớt', trangThai: 'CHO_XAC_NHAN' },
                        { id: 302, monAnId: 8, tenMon: 'Trà Sen Vàng Củ Năng Hạt Sen', soLuong: 2, donGia: 45000, tuyChon: 'Size M', ghiChu: '', trangThai: 'DA_PHUC_VU' }
                    ]
                },
                // Bàn 08 (Đang dùng, ngồi 22 phút, 4 khách)
                8: {
                    id: 8,
                    banId: 8,
                    soKhach: 4,
                    thoiGianBatDau: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
                    ghiChu: 'Bàn dài tầng 2',
                    danhSachMon: [
                        { id: 401, monAnId: 2, tenMon: 'Lẩu Nấm Bò Tơ Quán Mộc', soLuong: 1, donGia: 385000, tuyChon: 'Phần tiêu chuẩn', ghiChu: '', trangThai: 'DANG_CHE_BIEN' }
                    ]
                },
                // Bàn 11 (Đang dùng, ngồi 65 phút, 8 khách)
                11: {
                    id: 11,
                    banId: 11,
                    soKhach: 8,
                    thoiGianBatDau: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
                    ghiChu: 'Tiệc họp mặt sân vườn',
                    danhSachMon: [
                        { id: 501, monAnId: 2, tenMon: 'Lẩu Nấm Bò Tơ Quán Mộc', soLuong: 2, donGia: 495000, tuyChon: 'Phần lớn', ghiChu: '', trangThai: 'DA_PHUC_VU' },
                        { id: 502, monAnId: 3, tenMon: 'Bò Tơ Nướng Tảng Sốt Tiêu Rừng', soLuong: 3, donGia: 260000, tuyChon: 'Phần 300g', ghiChu: '', trangThai: 'DA_PHUC_VU' },
                        { id: 503, monAnId: 4, tenMon: 'Cơm Cháy Kho Quẹt Nam Bộ', soLuong: 2, donGia: 95000, tuyChon: '', ghiChu: '', trangThai: 'DA_PHUC_VU' },
                        { id: 504, monAnId: 8, tenMon: 'Trà Sen Vàng Củ Năng Hạt Sen', soLuong: 8, donGia: 45000, tuyChon: 'Size M', ghiChu: '', trangThai: 'DA_PHUC_VU' }
                    ]
                }
            };
            localStorage.setItem(KHOA_PHIEN, JSON.stringify(duLieuPhienBan));
        }

        // 2. Khởi tạo nhật ký hủy / trả món (US-091)
        const KHOA_NHAT_KY = 'quanmoc_pos_nhat_ky_huy_tra';
        if (!localStorage.getItem(KHOA_NHAT_KY)) {
            const nhatKyMau = [
                {
                    id: 1,
                    thoiGian: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
                    soBan: 'Bàn 01',
                    tenMon: 'Bò Tơ Nướng Tảng Sốt Tiêu Rừng',
                    soLuong: 1,
                    loai: 'HUY',
                    lyDo: 'Khách đổi ý muốn chuyển sang ăn Lẩu (bếp chưa chế biến)',
                    nhanVien: 'Quân (Thu ngân)'
                }
            ];
            localStorage.setItem(KHOA_NHAT_KY, JSON.stringify(nhatKyMau));
        }
    }

    layTatCaPhienBan() {
        const raw = localStorage.getItem('quanmoc_pos_phien_ban');
        return raw ? JSON.parse(raw) : {};
    }

    luuTatCaPhienBan(ds) {
        localStorage.setItem('quanmoc_pos_phien_ban', JSON.stringify(ds));
    }

    layNhatKyHuyTra() {
        const raw = localStorage.getItem('quanmoc_pos_nhat_ky_huy_tra');
        return raw ? JSON.parse(raw) : [];
    }

    ghiNhatKyHuyTra(ban, tenMon, soLuong, loai, lyDo) {
        const ds = this.layNhatKyHuyTra();
        const user = window.api ? window.api.layThongTinNguoiDung() : null;
        const tenNhanVien = user ? `${user.hoTen} (${user.vaiTro})` : 'Nhân viên POS';

        ds.unshift({
            id: Date.now(),
            thoiGian: new Date().toISOString(),
            soBan: ban.soBan || `Bàn ${ban.id}`,
            tenMon: tenMon,
            soLuong: soLuong,
            loai: loai, // 'HUY' hoặc 'TRA'
            lyDo: lyDo,
            nhanVien: tenNhanVien
        });
        localStorage.setItem('quanmoc_pos_nhat_ky_huy_tra', JSON.stringify(ds));
    }

    async khoiTao() {
        const vungChua = document.getElementById('noi-dung-chinh');
        if (!vungChua) return;

        vungChua.innerHTML = `
            <div class="trang-so-do-ban-pos">
                <!-- Header phân hệ -->
                <div class="thanh-tieu-de-pos">
                    <div class="nhom-tieu-de">
                        <h2>🗺️ Sơ Đồ Bàn POS & Vận Hành Phục Vụ</h2>
                        <p class="mo-ta-phu">Quản lý trạng thái bàn theo thời gian thực, mở bàn, gọi món hộ khách, chuyển và ghép bàn</p>
                    </div>
                    <div class="nhom-nut-hanh-dong-pos">
                        <button class="nut nut-phu" onclick="window.soDoBanPos.moModalNhatKyHuyTra()">
                            📜 Nhật ký hủy/trả món
                        </button>
                        <button class="nut nut-phu" onclick="window.ungDung.chuyenTab('thanhToanPos')">
                            💵 Chuyển sang Quầy Thu Ngân
                        </button>
                        <button class="nut nut-chinh" onclick="window.soDoBanPos.taiLaiDuLieu()">
                            🔄 Làm mới sơ đồ
                        </button>
                    </div>
                </div>

                <!-- Thống kê nhanh tổng quan -->
                <div class="thanh-thong-ke-pos" id="thong-ke-nhanh-pos"></div>

                <!-- Thanh công cụ tìm kiếm và bộ lọc -->
                <div class="thanh-bo-loc-pos">
                    <div class="nhom-tim-kiem">
                        <input type="text" id="tim-kiem-ban-pos" placeholder="🔍 Tìm kiếm bàn theo tên, mã (ví dụ: Bàn 01, T1-02)..." oninput="window.soDoBanPos.xuLyTimKiem(this.value)">
                    </div>
                    <div class="nhom-nut-loc-khu-vuc" id="danh-sach-tab-khu-vuc"></div>
                    <div class="nhom-nut-loc-trang-thai" id="danh-sach-nut-trang-thai"></div>
                </div>

                <!-- Lưới hiển thị sơ đồ bàn -->
                <div class="luoi-so-do-ban-pos" id="luoi-ban-pos">
                    <div class="dang-tai-du-lieu">Đang tải sơ đồ bàn...</div>
                </div>
            </div>
        `;

        await this.taiVaHienThi();
    }

    async dongBoPhienVoiServer() {
        const phienLocal = this.layTatCaPhienBan();
        try {
            if (window.api && window.api.layTatCaDonGoiMon) {
                const dsDonServer = await window.api.layTatCaDonGoiMon();
                if (Array.isArray(dsDonServer)) {
                    dsDonServer.forEach(don => {
                        const bId = Number(don.banId);
                        if (!bId) return;
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
            console.warn('Lỗi đồng bộ đơn đặt món từ server sang phiên POS:', e);
        }
        return phienLocal;
    }

    async taiVaHienThi() {
        const dsBan = await window.api.layDanhSachBan();
        const dsKhuVuc = await window.api.layDanhSachKhuVuc();
        const dsPhien = await this.dongBoPhienVoiServer();

        // Tự động đồng bộ trạng thái Bàn theo phiên: Nếu bàn có món đang ăn thì đổi trạng thái sang DANG_DUNG
        Object.keys(dsPhien).forEach(bId => {
            const p = dsPhien[bId];
            const ban = dsBan.find(b => Number(b.id) === Number(bId));
            if (ban && p && p.danhSachMon && p.danhSachMon.length > 0) {
                if (ban.trangThai === 'TRONG' || ban.trangThai === 'Trong') {
                    ban.trangThai = 'DANG_DUNG';
                    if (window.api && window.api.capNhatTrangThaiBan) {
                        window.api.capNhatTrangThaiBan(ban.id, 'DANG_DUNG');
                    }
                }
            }
        });

        this.veThongKeNhanh(dsBan, dsPhien);
        this.veBoLocKhuVuc(dsKhuVuc);
        this.veBoLocTrangThai(dsBan);
        this.veDanhSachBan(dsBan, dsKhuVuc, dsPhien);
    }

    async taiLaiDuLieu() {
        if (window.thongBao) window.thongBao.thongTin('Đang đồng bộ', 'Cập nhật lại trạng thái các bàn thời gian thực.');
        await this.taiVaHienThi();
    }

    /**
     * Tính tổng tiền tạm tính của một bàn
     */
    tinhTongTienBan(phien) {
        if (!phien || !phien.danhSachMon) return 0;
        return phien.danhSachMon.reduce((tong, m) => {
            if (m.trangThai === 'DA_HUY') return tong;
            return tong + (m.donGia * m.soLuong);
        }, 0);
    }

    /**
     * Tính số phút khách đã ngồi
     */
    tinhSoPhutNgoi(thoiGianBatDau) {
        if (!thoiGianBatDau) return 0;
        const diffMs = Date.now() - new Date(thoiGianBatDau).getTime();
        return Math.max(0, Math.floor(diffMs / (1000 * 60)));
    }

    veThongKeNhanh(dsBan, dsPhien) {
        const el = document.getElementById('thong-ke-nhanh-pos');
        if (!el) return;

        const tongBan = dsBan.length;
        const banTrong = dsBan.filter(b => b.trangThai === 'TRONG').length;
        const banDangDung = dsBan.filter(b => b.trangThai === 'DANG_DUNG').length;
        const banChoThanhToan = dsBan.filter(b => b.trangThai === 'CHO_THANH_TOAN').length;
        const banCanHoTro = dsBan.filter(b => b.trangThai === 'CAN_HO_TRO').length;

        // Tính tổng doanh thu đang phục vụ tại chỗ
        let tongDoanhThuTamTinh = 0;
        Object.values(dsPhien).forEach(p => {
            tongDoanhThuTamTinh += this.tinhTongTienBan(p);
        });

        const tyLeLapDay = tongBan > 0 ? Math.round(((tongBan - banTrong) / tongBan) * 100) : 0;

        el.innerHTML = `
            <div class="the-thong-ke-nho">
                <div class="so-luong-thong-ke">${tongBan}</div>
                <div class="nhan-thong-ke">Tổng số bàn</div>
            </div>
            <div class="the-thong-ke-nho the-xanh-la">
                <div class="so-luong-thong-ke">${banTrong}</div>
                <div class="nhan-thong-ke">Bàn trống sẵn sàng</div>
            </div>
            <div class="the-thong-ke-nho the-xanh-duong">
                <div class="so-luong-thong-ke">${banDangDung}</div>
                <div class="nhan-thong-ke">Đang phục vụ ăn uống</div>
            </div>
            <div class="the-thong-ke-nho the-vang">
                <div class="so-luong-thong-ke">${banChoThanhToan}</div>
                <div class="nhan-thong-ke">Chờ thanh toán</div>
            </div>
            <div class="the-thong-ke-nho the-do">
                <div class="so-luong-thong-ke">${banCanHoTro}</div>
                <div class="nhan-thong-ke">Có yêu cầu hỗ trợ 🚨</div>
            </div>
            <div class="the-thong-ke-nho the-tong-tien">
                <div class="so-luong-thong-ke">${window.DinhDang && window.DinhDang.tienVnd ? window.DinhDang.tienVnd(tongDoanhThuTamTinh) : tongDoanhThuTamTinh.toLocaleString() + ' đ'}</div>
                <div class="nhan-thong-ke">Tổng tiền tạm tính (${tyLeLapDay}% công suất)</div>
            </div>
        `;
    }

    veBoLocKhuVuc(dsKhuVuc) {
        const el = document.getElementById('danh-sach-tab-khu-vuc');
        if (!el) return;

        let html = `
            <button class="nut-tab-khu-vuc ${this.boLocKhuVuc === 'TAT_CA' ? 'kich-hoat' : ''}" onclick="window.soDoBanPos.chuyenLocKhuVuc('TAT_CA')">
                Tất cả khu vực
            </button>
        `;

        dsKhuVuc.forEach(kv => {
            const tenKv = kv.ten || kv.tenKhuVuc || `Khu vực ${kv.id}`;
            html += `
                <button class="nut-tab-khu-vuc ${this.boLocKhuVuc == kv.id ? 'kich-hoat' : ''}" onclick="window.soDoBanPos.chuyenLocKhuVuc(${kv.id})">
                    ${tenKv}
                </button>
            `;
        });

        el.innerHTML = html;
    }

    veBoLocTrangThai(dsBan) {
        const el = document.getElementById('danh-sach-nut-trang-thai');
        if (!el) return;

        const cacTrangThai = [
            { ma: 'TAT_CA', ten: 'Tất cả trạng thái' },
            { ma: 'TRONG', ten: '🟢 Trống' },
            { ma: 'DANG_DUNG', ten: '🔵 Đang phục vụ' },
            { ma: 'CHO_THANH_TOAN', ten: '🟡 Chờ thanh toán' },
            { ma: 'CAN_HO_TRO', ten: '🔴 Cần hỗ trợ' }
        ];

        let html = '';
        cacTrangThai.forEach(tt => {
            html += `
                <button class="nut-pill-trang-thai ${this.boLocTrangThai === tt.ma ? 'kich-hoat' : ''}" onclick="window.soDoBanPos.chuyenLocTrangThai('${tt.ma}')">
                    ${tt.ten}
                </button>
            `;
        });
        el.innerHTML = html;
    }

    chuyenLocKhuVuc(kvId) {
        this.boLocKhuVuc = kvId;
        this.taiVaHienThi();
    }

    chuyenLocTrangThai(trangThai) {
        this.boLocTrangThai = trangThai;
        this.taiVaHienThi();
    }

    xuLyTimKiem(tuKhoa) {
        this.tuKhoaTimKiem = (tuKhoa || '').trim().toLowerCase();
        this.taiVaHienThi();
    }

    veDanhSachBan(dsBan, dsKhuVuc, dsPhien) {
        const el = document.getElementById('luoi-ban-pos');
        if (!el) return;

        // Lọc theo khu vực
        let ds = dsBan;
        if (this.boLocKhuVuc !== 'TAT_CA') {
            ds = ds.filter(b => b.khuVucId == this.boLocKhuVuc);
        }

        // Lọc theo trạng thái
        if (this.boLocTrangThai !== 'TAT_CA') {
            ds = ds.filter(b => b.trangThai === this.boLocTrangThai);
        }

        // Lọc theo từ khóa
        if (this.tuKhoaTimKiem) {
            ds = ds.filter(b => 
                (b.soBan && b.soBan.toLowerCase().includes(this.tuKhoaTimKiem)) ||
                (b.maBan && b.maBan.toLowerCase().includes(this.tuKhoaTimKiem))
            );
        }

        if (ds.length === 0) {
            el.innerHTML = `
                <div class="khung-trong-pos">
                    <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
                    <h3>Không tìm thấy bàn nào phù hợp</h3>
                    <p style="color: var(--mau-chu-phu); margin-top: 6px;">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
            `;
            return;
        }

        const mapKhuVuc = {};
        dsKhuVuc.forEach(kv => mapKhuVuc[kv.id] = kv.ten || kv.tenKhuVuc || `Khu vực ${kv.id}`);

        let html = '';
        ds.forEach(ban => {
            const phien = dsPhien[ban.id];
            const tenKhuVuc = mapKhuVuc[ban.khuVucId] || 'Chung';
            const soPhut = phien ? this.tinhSoPhutNgoi(phien.thoiGianBatDau) : 0;
            const tongTien = phien ? this.tinhTongTienBan(phien) : 0;
            const soLuongMon = (phien && phien.danhSachMon) 
                ? phien.danhSachMon.filter(m => m.trangThai !== 'DA_HUY').reduce((sum, m) => sum + m.soLuong, 0)
                : 0;

            const monChuaRa = (phien && phien.danhSachMon)
                ? phien.danhSachMon.filter(m => m.trangThai === 'CHO_XAC_NHAN' || m.trangThai === 'DANG_CHE_BIEN').length
                : 0;

            // Xác định class và nhãn trạng thái
            let lopTrangThai = 'ban-trong';
            let nhanTrangThai = 'Bàn trống';
            if (ban.trangThai === 'DANG_DUNG') {
                lopTrangThai = 'ban-dang-dung';
                nhanTrangThai = 'Đang phục vụ';
            } else if (ban.trangThai === 'CHO_THANH_TOAN') {
                lopTrangThai = 'ban-cho-thanh-toan';
                nhanTrangThai = 'Chờ thanh toán';
            } else if (ban.trangThai === 'CAN_HO_TRO') {
                lopTrangThai = 'ban-can-ho-tro';
                nhanTrangThai = 'Cần hỗ trợ 🚨';
            }

            html += `
                <div class="the-ban-pos ${lopTrangThai}">
                    <div class="dau-the-ban">
                        <div>
                            <span class="ma-ban-badge">${ban.maBan || 'B' + ban.id}</span>
                            <span class="khu-vuc-badge">${tenKhuVuc}</span>
                        </div>
                        <span class="badge-trang-thai-ban">${nhanTrangThai}</span>
                    </div>

                    <div class="than-the-ban">
                        <div class="ten-ban-lon">${ban.soBan}</div>
                        <div class="thong-tin-phu-ban">
                            <span>👥 ${ban.sucChua || 4} chỗ</span>
                            ${ban.trangThai !== 'TRONG' ? `<span class="dong-ho-ngoi">⏱️ ${soPhut} phút</span>` : '<span>✨ Sẵn sàng đón khách</span>'}
                        </div>

                        ${ban.trangThai !== 'TRONG' ? `
                            <div class="hop-chi-tiet-gia-ban">
                                <div class="so-tien-tam-tinh">${window.DinhDang && window.DinhDang.tienVnd ? window.DinhDang.tienVnd(tongTien) : tongTien.toLocaleString() + ' đ'}</div>
                                <div class="so-mon-badge">
                                    <span>📦 ${soLuongMon} món</span>
                                    ${monChuaRa > 0 ? `<span class="mon-bep-cho">⏳ Bếp nợ: ${monChuaRa}</span>` : '<span class="mon-du">✓ Đã đủ món</span>'}
                                </div>
                            </div>
                        ` : `
                            <div class="hop-ban-trong-goi-y">
                                <span>Bàn sạch đã sẵn sàng đón khách vào dùng bữa</span>
                            </div>
                        `}
                    </div>

                    <div class="chan-the-ban">
                        ${ban.trangThai === 'TRONG' ? `
                            <button class="nut-thao-tac-ban nut-mo-ban-nhanh" onclick="window.soDoBanPos.moModalMoBan(${ban.id})">
                                ✨ Mở Bàn Mới
                            </button>
                        ` : `
                            <button class="nut-thao-tac-ban nut-xem-don" onclick="window.soDoBanPos.moModalChiTietDon(${ban.id})" title="Xem chi tiết đơn, đổi trả món (US-089 -> US-091, US-096)">
                                📋 Xem Đơn
                            </button>
                            <button class="nut-thao-tac-ban nut-goi-them" onclick="window.soDoBanPos.moModalGoiMonHo(${ban.id})" title="Gọi món hộ khách (US-095)">
                                🍲 Thêm món
                            </button>
                            <button class="nut-thao-tac-ban nut-chuyen-ghep" onclick="window.soDoBanPos.moModalChuyenGhep(${ban.id})" title="Chuyển bàn hoặc ghép bàn (US-097, US-098)">
                                🔄 Đổi/Ghép
                            </button>
                            <button class="nut-thao-tac-ban nut-thanh-toan-nhanh" onclick="window.soDoBanPos.chuyenSangThanhToan(${ban.id})" title="Thanh toán hóa đơn (US-099 -> US-110)">
                                💵 Tính tiền
                            </button>
                        `}
                    </div>
                </div>
            `;
        });

        el.innerHTML = html;
    }

    // =========================================================================
    // US-094: MỞ BÀN TRỰC TIẾP
    // =========================================================================
    async moModalMoBan(banId) {
        const dsBan = await window.api.layDanhSachBan();
        const ban = dsBan.find(b => b.id == banId);
        if (!ban) return;

        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        modal.innerHTML = `
            <div class="hop-modal hop-modal-vua">
                <div class="dau-modal">
                    <h3>✨ Mở Bàn Phục Vụ Mới — ${ban.soBan}</h3>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.dongModal()">✕</button>
                </div>
                <div class="than-modal">
                    <p style="color: var(--mau-chu-phu); margin-bottom: 16px;">
                        Khởi tạo phiên phục vụ mới tại <strong>${ban.soBan}</strong> (Sức chứa tiêu chuẩn: ${ban.sucChua || 4} khách).
                    </p>
                    <div class="nhom-form">
                        <label>Số lượng khách vào bàn (*):</label>
                        <input type="number" id="mo-ban-so-khach" class="o-nhap-lieu" min="1" max="50" value="${ban.sucChua || 4}">
                    </div>
                    <div class="nhom-form" style="margin-top: 14px;">
                        <label>Ghi chú ban đầu (nếu có):</label>
                        <input type="text" id="mo-ban-ghi-chu" class="o-nhap-lieu" placeholder="Ví dụ: Khách đặt trước, có ghế trẻ em, bàn ngoài trời...">
                    </div>
                </div>
                <div class="chan-modal">
                    <button class="nut nut-phu" onclick="window.soDoBanPos.dongModal()">Hủy bỏ</button>
                    <button class="nut nut-chinh" onclick="window.soDoBanPos.xacNhanMoBan(${ban.id})">
                        Xác nhận mở bàn
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    async xacNhanMoBan(banId) {
        const soKhach = parseInt(document.getElementById('mo-ban-so-khach')?.value || '4');
        const ghiChu = document.getElementById('mo-ban-ghi-chu')?.value || '';

        // 1. Cập nhật trạng thái bàn trong dsBan
        const dsBan = await window.api.layDanhSachBan();
        const ban = dsBan.find(b => b.id == banId);
        if (ban) {
            ban.trangThai = 'DANG_DUNG';
            await window.api.luuDanhSachBan(dsBan);
        }

        // 2. Tạo phiên bàn mới
        const dsPhien = this.layTatCaPhienBan();
        dsPhien[banId] = {
            id: banId,
            banId: banId,
            soKhach: soKhach,
            thoiGianBatDau: new Date().toISOString(),
            ghiChu: ghiChu,
            danhSachMon: []
        };
        this.luuTatCaPhienBan(dsPhien);

        this.dongModal();
        if (window.thongBao) window.thongBao.thanhCong('Mở bàn thành công', `${ban.soBan} đã chuyển sang trạng thái Đang phục vụ.`);
        await this.taiVaHienThi();
    }

    // =========================================================================
    // US-089, US-090, US-091, US-096: XEM CHI TIẾT ĐƠN, ĐÁNH DẤU PHỤC VỤ, HỦY TRẢ MÓN
    // =========================================================================
    async moModalChiTietDon(banId) {
        const dsBan = await window.api.layDanhSachBan();
        const ban = dsBan.find(b => b.id == banId);
        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[banId];

        if (!ban || !phien) {
            if (window.thongBao) window.thongBao.canhBao('Không tìm thấy phiên', 'Bàn này chưa có phiên hoạt động.');
            return;
        }

        this.banDangChon = ban;
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        const tongTien = this.tinhTongTienBan(phien);
        const soPhut = this.tinhSoPhutNgoi(phien.thoiGianBatDau);

        let danhSachMonHtml = '';
        if (phien.danhSachMon.length === 0) {
            danhSachMonHtml = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 24px; color: var(--mau-chu-phu);">
                        Chưa có món nào được gọi. Hãy bấm nút <strong>"Gọi thêm món"</strong> bên dưới.
                    </td>
                </tr>
            `;
        } else {
            phien.danhSachMon.forEach((m, idx) => {
                let badgeStatus = '';
                if (m.trangThai === 'CHO_XAC_NHAN') badgeStatus = '<span class="badge badge-xam">Chờ xác nhận</span>';
                else if (m.trangThai === 'DANG_CHE_BIEN') badgeStatus = '<span class="badge badge-vang">👨‍🍳 Đang chế biến</span>';
                else if (m.trangThai === 'DA_XONG') badgeStatus = '<span class="badge badge-xanh-la">🔔 Bếp đã nấu xong</span>';
                else if (m.trangThai === 'DA_PHUC_VU') badgeStatus = '<span class="badge badge-xanh-duong">✓ Đã phục vụ</span>';
                else if (m.trangThai === 'DA_HUY') badgeStatus = '<span class="badge badge-do">✕ Đã hủy</span>';

                const thanhTien = m.donGia * m.soLuong;

                danhSachMonHtml += `
                    <tr class="${m.trangThai === 'DA_HUY' ? 'dong-mon-da-huy' : ''}">
                        <td style="text-align: center;">${idx + 1}</td>
                        <td>
                            <strong>${m.tenMon}</strong>
                            ${m.tuyChon ? `<div style="font-size: 12px; color: var(--mau-chinh);">${m.tuyChon}</div>` : ''}
                            ${m.ghiChu ? `<div style="font-size: 11.5px; color: var(--mau-chu-phu); font-style: italic;">📝 ${m.ghiChu}</div>` : ''}
                        </td>
                        <td style="text-align: center; font-weight: 700;">${m.soLuong}</td>
                        <td style="text-align: right;">${(m.donGia || 0).toLocaleString()} đ</td>
                        <td style="text-align: right; font-weight: 700; color: var(--mau-chinh);">${thanhTien.toLocaleString()} đ</td>
                        <td style="text-align: center;">
                            <div style="margin-bottom: 6px;">${badgeStatus}</div>
                            ${m.trangThai !== 'DA_HUY' ? `
                                <div class="nhom-nut-thao-tac-mon">
                                    ${m.trangThai !== 'DA_PHUC_VU' ? `
                                        <button class="nut-mini nut-mini-xanh" onclick="window.soDoBanPos.xacNhanDaPhucVu(${banId}, ${m.id})" title="Xác nhận đã bưng lên bàn cho khách (US-096)">
                                            ✓ Đã lên
                                        </button>
                                    ` : ''}
                                    <button class="nut-mini nut-mini-do" onclick="window.soDoBanPos.moModalHuyTraMon(${banId}, ${m.id})" title="Hủy món hoặc đổi trả món (US-089, US-090)">
                                        ✕ Hủy/Trả
                                    </button>
                                </div>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });
        }

        modal.innerHTML = `
            <div class="hop-modal hop-modal-lon">
                <div class="dau-modal">
                    <div>
                        <h3>📋 Chi Tiết Đơn Hàng & Món Ăn — ${ban.soBan}</h3>
                        <span style="font-size: 13px; color: var(--mau-chu-phu);">
                            Thời gian ngồi: <strong>${soPhut} phút</strong> | Số khách: <strong>${phien.soKhach} người</strong>
                        </span>
                    </div>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.dongModal()">✕</button>
                </div>
                <div class="than-modal" style="max-height: 70vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-weight: 700;">Danh sách món ăn của bàn:</span>
                        <button class="nut nut-phu nut-nho" onclick="window.soDoBanPos.dongModal(); window.soDoBanPos.moModalGoiMonHo(${banId})">
                            ➕ Thêm món hộ khách (US-095)
                        </button>
                    </div>
                    <table class="bang-du-lieu">
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">#</th>
                                <th>Món ăn / Tùy chọn / Ghi chú</th>
                                <th style="width: 60px; text-align: center;">SL</th>
                                <th style="width: 100px; text-align: right;">Đơn giá</th>
                                <th style="width: 110px; text-align: right;">Thành tiền</th>
                                <th style="width: 150px; text-align: center;">Trạng thái & Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${danhSachMonHtml}
                        </tbody>
                    </table>

                    <div class="tong-ket-don-pos">
                        <div>
                            <span>Ghi chú bàn: <strong>${phien.ghiChu || 'Không có ghi chú'}</strong></span>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 14px; color: var(--mau-chu-phu);">Tổng tiền tạm tính:</span>
                            <div style="font-size: 22px; font-weight: 800; color: var(--mau-chinh);">
                                ${tongTien.toLocaleString()} đ
                            </div>
                        </div>
                    </div>
                </div>
                <div class="chan-modal">
                    <button class="nut nut-phu" onclick="window.soDoBanPos.dongModal()">Đóng cửa sổ</button>
                    <button class="nut nut-phu" onclick="window.soDoBanPos.dongModal(); window.soDoBanPos.moModalChuyenGhep(${banId})">
                        🔄 Chuyển / Ghép bàn
                    </button>
                    <button class="nut nut-chinh" onclick="window.soDoBanPos.dongModal(); window.soDoBanPos.chuyenSangThanhToan(${banId})">
                        💵 Chuyển sang Thanh toán
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    /**
     * US-096: Xác nhận món ăn đã phục vụ lên bàn
     */
    xacNhanDaPhucVu(banId, monId) {
        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[banId];
        if (!phien) return;

        const mon = phien.danhSachMon.find(m => m.id == monId);
        if (mon) {
            mon.trangThai = 'DA_PHUC_VU';
            this.luuTatCaPhienBan(dsPhien);
            if (window.thongBao) window.thongBao.thanhCong('Đã lên món', `Đã đánh dấu "${mon.tenMon}" là ĐÃ PHỤC VỤ.`);
            this.moModalChiTietDon(banId); // Tải lại modal
            this.taiVaHienThi(); // Tải lại lưới
        }
    }

    /**
     * US-089, US-090, US-091: Hủy món hoặc đổi trả món kèm lý do
     */
    moModalHuyTraMon(banId, monId) {
        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[banId];
        if (!phien) return;

        const mon = phien.danhSachMon.find(m => m.id == monId);
        if (!mon) return;

        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        modal.innerHTML = `
            <div class="hop-modal hop-modal-vua">
                <div class="dau-modal">
                    <h3 style="color: var(--mau-canh-bao);">⚠️ Hủy Món / Đổi Trả — ${mon.tenMon}</h3>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.moModalChiTietDon(${banId})">✕</button>
                </div>
                <div class="than-modal">
                    <p style="margin-bottom: 14px; font-size: 13.5px; line-height: 1.5;">
                        Bạn đang thao tác hủy/trả món <strong>${mon.tenMon}</strong> (Số lượng: ${mon.soLuong}). 
                        Hệ thống sẽ ghi nhật ký để đối soát thất thoát nguyên liệu theo quy chuẩn <strong>US-091</strong>.
                    </p>
                    <div class="nhom-form">
                        <label>Phân loại thao tác (*):</label>
                        <select id="loai-huy-tra" class="o-nhap-lieu">
                            <option value="HUY">Hủy món (Khách đổi ý khi bếp chưa nấu / Hết nguyên liệu)</option>
                            <option value="TRA">Đổi trả món (Món bị lỗi chế biến / nguội / khách phàn nàn)</option>
                        </select>
                    </div>
                    <div class="nhom-form" style="margin-top: 14px;">
                        <label>Lý do hủy / đổi trả chi tiết (*):</label>
                        <textarea id="ly-do-huy-tra" class="o-nhap-lieu" rows="3" placeholder="Ghi rõ lý do (ví dụ: Khách chờ quá 30p, Bếp báo hết rau nấm, Khách báo món mặn cần đổi...)" required></textarea>
                    </div>
                </div>
                <div class="chan-modal">
                    <button class="nut nut-phu" onclick="window.soDoBanPos.moModalChiTietDon(${banId})">Quay lại</button>
                    <button class="nut nut-canh-bao" onclick="window.soDoBanPos.xacNhanHuyTraMon(${banId}, ${mon.id})">
                        Xác nhận Hủy/Trả Món
                    </button>
                </div>
            </div>
        `;
    }

    xacNhanHuyTraMon(banId, monId) {
        const loai = document.getElementById('loai-huy-tra')?.value || 'HUY';
        const lyDo = (document.getElementById('ly-do-huy-tra')?.value || '').trim();

        if (!lyDo) {
            alert('Vui lòng nhập lý do hủy/đổi trả để phục vụ việc đối soát quản lý!');
            return;
        }

        const dsPhien = this.layTatCaPhienBan();
        const phien = dsPhien[banId];
        if (!phien) return;

        const mon = phien.danhSachMon.find(m => m.id == monId);
        if (mon) {
            mon.trangThai = 'DA_HUY';
            mon.lyDoHuy = lyDo;
            this.luuTatCaPhienBan(dsPhien);

            // Ghi nhật ký thất thoát
            this.ghiNhatKyHuyTra(this.banDangChon || { id: banId, soBan: `Bàn ${banId}` }, mon.tenMon, mon.soLuong, loai, lyDo);

            if (window.thongBao) window.thongBao.canhBao('Đã hủy món', `Đã ghi nhận hủy món "${mon.tenMon}" và lưu nhật ký đối soát.`);
            this.moModalChiTietDon(banId);
            this.taiVaHienThi();
        }
    }

    // =========================================================================
    // US-095: GỌI MÓN HỘ KHÁCH (NHÂN VIÊN ĐẶT MÓN TẠI BÀN)
    // =========================================================================
    async moModalGoiMonHo(banId) {
        const dsBan = await window.api.layDanhSachBan();
        const ban = dsBan.find(b => b.id == banId);
        const dsMon = await window.api.layDanhSachMonAn();
        const dsDanhMuc = await window.api.layDanhSachDanhMuc();
        const dsPhien = this.layTatCaPhienBan();
        const phienHienTai = dsPhien[banId] || { danhSachMon: [] };

        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal || !ban) return;

        let danhSachDanhMucHtml = '<button class="nut-tab-dm kich-hoat" onclick="window.soDoBanPos.locMonGoiHo(\'TAT_CA\', this)">🍽️ Tất cả</button>';
        dsDanhMuc.forEach(dm => {
            danhSachDanhMucHtml += `<button class="nut-tab-dm" onclick="window.soDoBanPos.locMonGoiHo(${dm.id}, this)">${dm.bieuTuong || '🍲'} ${dm.ten}</button>`;
        });

        // Tính tổng món và tổng tiền hiện tại trong bàn
        const cacMonHopLe = (phienHienTai.danhSachMon || []).filter(m => m.trangThai !== 'DA_HUY');
        const tongPhan = cacMonHopLe.reduce((sum, m) => sum + (Number(m.soLuong) || 1), 0);
        const tongTien = cacMonHopLe.reduce((sum, m) => sum + ((Number(m.soLuong) || 1) * (Number(m.donGia) || 0)), 0);

        let danhSachMonHtml = '';
        dsMon.forEach(m => {
            const tamHet = (m.trangThai === 0);
            const monDaCo = cacMonHopLe.filter(item => item.monAnId == m.id);
            const slDaGoi = monDaCo.reduce((sum, item) => sum + (Number(item.soLuong) || 1), 0);

            danhSachMonHtml += `
                <div class="the-mon-goi-ho ${tamHet ? 'mon-tam-het' : ''}" data-danh-muc="${m.danhMucId}" data-ten="${m.tenMon.toLowerCase()}">
                    <div class="khung-anh-gh">
                        <img src="${m.hinhAnh || ''}" alt="${m.tenMon}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'">
                        ${slDaGoi > 0 ? `<span class="huy-hieu-da-goi">Đã chọn: x${slDaGoi}</span>` : ''}
                    </div>
                    <div class="thong-tin-mon-goi-ho">
                        <div class="ten-mon-gh" title="${m.tenMon}">${m.tenMon}</div>
                        <div class="hang-gia-va-nut">
                            <div class="gia-mon-gh">${(m.giaBan || 0).toLocaleString('vi-VN')} đ</div>
                            ${tamHet ? '<span class="badge-tam-het-gh">Tạm hết</span>' : `
                                <button class="nut-them-gh" onclick="window.soDoBanPos.themMonVaoBan(${banId}, ${m.id})">
                                    ➕ Thêm
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="hop-modal hop-modal-lon modal-lon">
                <div class="dau-modal">
                    <h3>🍲 Gọi Món Hộ Khách (US-095) — ${ban.soBan}</h3>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.dongModal()">✕</button>
                </div>
                <div class="than-modal" style="max-height: 70vh; overflow-y: auto; padding: 18px 22px;">
                    <div class="hop-tim-kiem-goi-ho">
                        <span class="icon-kinh-lup">🔍</span>
                        <input type="text" id="tim-mon-goi-ho" placeholder="Nhập tên món ăn để tìm nhanh..." oninput="window.soDoBanPos.timMonGoiHo(this.value)">
                    </div>
                    <div class="thanh-cuon-dm-goi-ho">
                        ${danhSachDanhMucHtml}
                    </div>
                    <div class="luoi-mon-goi-ho" id="luoi-mon-goi-ho">
                        ${danhSachMonHtml}
                    </div>
                    <div class="thanh-tom-tat-goi-ho">
                        <span>📋 Đơn bàn hiện tại: <strong>${cacMonHopLe.length} món</strong> (${tongPhan} phần)</span>
                        <span style="color: #D97706; font-size: 15px; font-weight: 800;">Tổng tạm tính: ${tongTien.toLocaleString('vi-VN')} đ</span>
                    </div>
                </div>
                <div class="chan-modal">
                    <button class="nut nut-phu" onclick="window.soDoBanPos.moModalChiTietDon(${banId})">📜 Xem đơn chi tiết</button>
                    <button class="nut nut-chinh" onclick="window.soDoBanPos.dongModal()">✅ Hoàn tất gọi món</button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    timMonGoiHo(tuKhoa) {
        tuKhoa = (tuKhoa || '').trim().toLowerCase();
        document.querySelectorAll('.the-mon-goi-ho').forEach(el => {
            const ten = el.getAttribute('data-ten') || '';
            el.style.display = ten.includes(tuKhoa) ? 'flex' : 'none';
        });
    }

    locMonGoiHo(dmId, btn) {
        document.querySelectorAll('.nut-tab-dm').forEach(b => b.classList.remove('kich-hoat'));
        if (btn) btn.classList.add('kich-hoat');

        document.querySelectorAll('.the-mon-goi-ho').forEach(el => {
            const dm = el.getAttribute('data-danh-muc');
            if (dmId === 'TAT_CA' || dm == dmId) {
                el.style.display = 'flex';
            } else {
                el.style.display = 'none';
            }
        });
    }

    async themMonVaoBan(banId, monId) {
        const dsMon = await window.api.layDanhSachMonAn();
        const mon = dsMon.find(m => m.id == monId);
        if (!mon) return;

        const dsPhien = this.layTatCaPhienBan();
        let phien = dsPhien[banId];
        if (!phien) {
            phien = {
                id: banId,
                banId: banId,
                soKhach: 4,
                thoiGianBatDau: new Date().toISOString(),
                ghiChu: '',
                danhSachMon: []
            };
            dsPhien[banId] = phien;
        }

        // Kiểm tra xem món đã có trong đơn chưa, nếu có thì tăng số lượng
        const monDaCo = phien.danhSachMon.find(m => m.monAnId == monId && m.trangThai !== 'DA_HUY');
        if (monDaCo) {
            monDaCo.soLuong += 1;
        } else {
            phien.danhSachMon.push({
                id: Date.now(),
                monAnId: mon.id,
                tenMon: mon.tenMon,
                soLuong: 1,
                donGia: mon.giaBan,
                tuyChon: '',
                ghiChu: 'Nhân viên gọi hộ',
                trangThai: 'CHO_XAC_NHAN'
            });
        }

        this.luuTatCaPhienBan(dsPhien);

        // Cập nhật trạng thái bàn sang DANG_DUNG nếu đang trống
        const dsBan = await window.api.layDanhSachBan();
        const ban = dsBan.find(b => b.id == banId);
        if (ban && ban.trangThai === 'TRONG') {
            ban.trangThai = 'DANG_DUNG';
            await window.api.luuDanhSachBan(dsBan);
        }

        if (window.thongBao) window.thongBao.thanhCong('Đã thêm món', `Đã thêm 1x "${mon.tenMon}" vào bàn.`);
        this.taiVaHienThi();

        // Cập nhật lại giao diện modal gọi món nếu đang mở để hiển thị số lượng và thanh tóm tắt
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (modal && modal.classList.contains('mo')) {
            const tuKhoaHienTai = document.getElementById('tim-mon-goi-ho')?.value || '';
            await this.moModalGoiMonHo(banId);
            if (tuKhoaHienTai) {
                const inp = document.getElementById('tim-mon-goi-ho');
                if (inp) {
                    inp.value = tuKhoaHienTai;
                    this.timMonGoiHo(tuKhoaHienTai);
                }
            }
        }
    }

    // =========================================================================
    // US-097 & US-098: CHUYỂN BÀN & GHÉP BÀN
    // =========================================================================
    async moModalChuyenGhep(banId) {
        const dsBan = await window.api.layDanhSachBan();
        const banHienTai = dsBan.find(b => b.id == banId);
        if (!banHienTai) return;

        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        const dsBanTrong = dsBan.filter(b => b.trangThai === 'TRONG' && b.id != banId);
        const dsBanDangDung = dsBan.filter(b => (b.trangThai === 'DANG_DUNG' || b.trangThai === 'CHO_THANH_TOAN') && b.id != banId);

        let optBanTrongHtml = '';
        dsBanTrong.forEach(b => {
            optBanTrongHtml += `<option value="${b.id}">${b.soBan} (${b.maBan}) — Sức chứa: ${b.sucChua} chỗ</option>`;
        });

        let checkboxBanGhep = '';
        dsBanDangDung.forEach(b => {
            checkboxBanGhep += `
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; background: #f8fafc; border-radius: 8px; cursor: pointer;">
                    <input type="checkbox" name="ban-ghep-chon" value="${b.id}">
                    <span><strong>${b.soBan}</strong> (${b.maBan} - ${b.sucChua} chỗ)</span>
                </label>
            `;
        });

        modal.innerHTML = `
            <div class="hop-modal hop-modal-vua">
                <div class="dau-modal">
                    <h3>🔄 Chuyển Bàn hoặc Ghép Bàn — ${banHienTai.soBan}</h3>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.dongModal()">✕</button>
                </div>
                <div class="than-modal">
                    <!-- Tab chọn tính năng Chuyển hoặc Ghép -->
                    <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid var(--mau-vien); padding-bottom: 12px;">
                        <button id="tab-nut-chuyen" class="nut nut-chinh nut-nho" onclick="window.soDoBanPos.chuyenTabChuyenGhep('CHUYEN')">
                            1. Chuyển sang Bàn Trống (US-097)
                        </button>
                        <button id="tab-nut-ghep" class="nut nut-phu nut-nho" onclick="window.soDoBanPos.chuyenTabChuyenGhep('GHEP')">
                            2. Ghép vào Bàn Khác (US-098)
                        </button>
                    </div>

                    <!-- Khung chuyển bàn -->
                    <div id="khung-chuyen-ban">
                        <div class="nhom-form">
                            <label>Chọn bàn trống chuyển đến (*):</label>
                            ${dsBanTrong.length > 0 ? `
                                <select id="ban-dich-chuyen" class="o-nhap-lieu">
                                    ${optBanTrongHtml}
                                </select>
                            ` : '<p style="color: var(--mau-canh-bao);">Hiện tại không còn bàn trống nào trong nhà hàng!</p>'}
                        </div>
                        <div class="nhom-form" style="margin-top: 14px;">
                            <label>Lý do chuyển bàn:</label>
                            <input type="text" id="ly-do-chuyen" class="o-nhap-lieu" placeholder="Ví dụ: Khách muốn đổi bàn có máy lạnh, bàn rộng hơn...">
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="nut nut-chinh" style="width: 100%;" ${dsBanTrong.length === 0 ? 'disabled' : ''} onclick="window.soDoBanPos.xacNhanChuyenBan(${banId})">
                                Xác nhận chuyển bàn ngay
                            </button>
                        </div>
                    </div>

                    <!-- Khung ghép bàn -->
                    <div id="khung-ghep-ban" style="display: none;">
                        <p style="font-size: 13.5px; color: var(--mau-chu-phu); margin-bottom: 12px;">
                            Gộp toàn bộ món ăn và hóa đơn từ các bàn được chọn vào chung <strong>${banHienTai.soBan}</strong> (các bàn phụ sau khi ghép sẽ tự động được trả về trạng thái "Bàn trống").
                        </p>
                        <div class="nhom-form">
                            <label>Chọn bàn đang phục vụ để ghép vào ${banHienTai.soBan}:</label>
                            <div style="max-height: 200px; overflow-y: auto; margin-top: 6px;">
                                ${checkboxBanGhep || '<p style="color: var(--mau-chu-phu);">Không có bàn nào khác đang dùng để ghép.</p>'}
                            </div>
                        </div>
                        <div style="margin-top: 20px;">
                            <button class="nut nut-chinh" style="width: 100%;" ${dsBanDangDung.length === 0 ? 'disabled' : ''} onclick="window.soDoBanPos.xacNhanGhepBan(${banId})">
                                Xác nhận ghép các bàn đã chọn
                            </button>
                        </div>
                    </div>
                </div>
                <div class="chan-modal">
                    <button class="nut nut-phu" onclick="window.soDoBanPos.dongModal()">Hủy bỏ</button>
                </div>
            </div>
        `;
        modal.classList.add('mo');
    }

    chuyenTabChuyenGhep(loai) {
        const kChuyen = document.getElementById('khung-chuyen-ban');
        const kGhep = document.getElementById('khung-ghep-ban');
        const nChuyen = document.getElementById('tab-nut-chuyen');
        const nGhep = document.getElementById('tab-nut-ghep');

        if (loai === 'CHUYEN') {
            kChuyen.style.display = 'block';
            kGhep.style.display = 'none';
            nChuyen.className = 'nut nut-chinh nut-nho';
            nGhep.className = 'nut nut-phu nut-nho';
        } else {
            kChuyen.style.display = 'none';
            kGhep.style.display = 'block';
            nChuyen.className = 'nut nut-phu nut-nho';
            nGhep.className = 'nut nut-chinh nut-nho';
        }
    }

    /**
     * US-097: Thực hiện chuyển bàn
     */
    async xacNhanChuyenBan(banNguonId) {
        const banDichId = parseInt(document.getElementById('ban-dich-chuyen')?.value);
        const lyDo = document.getElementById('ly-do-chuyen')?.value || 'Khách yêu cầu chuyển bàn';

        if (!banDichId) return;

        const dsBan = await window.api.layDanhSachBan();
        const banNguon = dsBan.find(b => b.id == banNguonId);
        const banDich = dsBan.find(b => b.id == banDichId);

        const dsPhien = this.layTatCaPhienBan();
        const phienNguon = dsPhien[banNguonId];

        if (!banNguon || !banDich || !phienNguon) return;

        // Chuyển phiên sang bàn đích
        phienNguon.banId = banDichId;
        phienNguon.ghiChu = `${phienNguon.ghiChu || ''} (Chuyển từ ${banNguon.soBan}: ${lyDo})`.trim();
        dsPhien[banDichId] = phienNguon;
        delete dsPhien[banNguonId];
        this.luuTatCaPhienBan(dsPhien);

        // Cập nhật trạng thái bàn
        banDich.trangThai = banNguon.trangThai;
        banNguon.trangThai = 'TRONG';
        await window.api.luuDanhSachBan(dsBan);

        this.dongModal();
        if (window.thongBao) window.thongBao.thanhCong('Chuyển bàn thành công', `Đã chuyển toàn bộ đơn từ ${banNguon.soBan} sang ${banDich.soBan}.`);
        await this.taiVaHienThi();
    }

    /**
     * US-098: Thực hiện ghép bàn
     */
    async xacNhanGhepBan(banChinhId) {
        const cacBanPhu = Array.from(document.querySelectorAll('input[name="ban-ghep-chon"]:checked')).map(cb => parseInt(cb.value));

        if (cacBanPhu.length === 0) {
            alert('Vui lòng chọn ít nhất 1 bàn để ghép!');
            return;
        }

        const dsBan = await window.api.layDanhSachBan();
        const banChinh = dsBan.find(b => b.id == banChinhId);
        const dsPhien = this.layTatCaPhienBan();
        let phienChinh = dsPhien[banChinhId];

        if (!banChinh || !phienChinh) return;

        let tenCacBanGhep = [];
        cacBanPhu.forEach(banPhuId => {
            const banPhu = dsBan.find(b => b.id == banPhuId);
            const phienPhu = dsPhien[banPhuId];
            if (banPhu && phienPhu) {
                tenCacBanGhep.push(banPhu.soBan);
                // Gộp món ăn
                phienPhu.danhSachMon.forEach(m => {
                    m.ghiChu = `${m.ghiChu ? m.ghiChu + ' ' : ''}[Ghép từ ${banPhu.soBan}]`;
                    phienChinh.danhSachMon.push(m);
                });
                phienChinh.soKhach += (phienPhu.soKhach || 2);

                // Xóa phiên bàn phụ và trả bàn phụ về TRONG
                delete dsPhien[banPhuId];
                banPhu.trangThai = 'TRONG';
            }
        });

        this.luuTatCaPhienBan(dsPhien);
        await window.api.luuDanhSachBan(dsBan);

        this.dongModal();
        if (window.thongBao) {
            window.thongBao.thanhCong('Ghép bàn thành công', `Đã gộp đơn của (${tenCacBanGhep.join(', ')}) vào ${banChinh.soBan}.`);
        }
        await this.taiVaHienThi();
    }

    /**
     * Dẫn thẳng sang tab thanh toán với bàn đã chọn
     */
    chuyenSangThanhToan(banId) {
        localStorage.setItem('quanmoc_pos_ban_thanh_toan_chon', banId);
        if (window.ungDung) {
            window.ungDung.chuyenTab('thanhToanPos');
        }
    }

    /**
     * Hiển thị modal nhật ký hủy/trả món
     */
    moModalNhatKyHuyTra() {
        const ds = this.layNhatKyHuyTra();
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (!modal) return;

        let rowHtml = '';
        if (ds.length === 0) {
            rowHtml = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Chưa có lượt hủy hoặc đổi trả món nào.</td></tr>';
        } else {
            ds.forEach((item, idx) => {
                const thoiGianStr = new Date(item.thoiGian).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                rowHtml += `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td>${thoiGianStr}</td>
                        <td><strong>${item.soBan}</strong></td>
                        <td>${item.tenMon} (x${item.soLuong})</td>
                        <td><span class="badge ${item.loai === 'HUY' ? 'badge-do' : 'badge-vang'}">${item.loai === 'HUY' ? 'HỦY MÓN' : 'ĐỔI TRẢ'}</span></td>
                        <td>${item.lyDo} <br><small style="color: var(--mau-chu-phu);">Bởi: ${item.nhanVien}</small></td>
                    </tr>
                `;
            });
        }

        modal.innerHTML = `
            <div class="hop-modal hop-modal-lon">
                <div class="dau-modal">
                    <h3>📜 Nhật Ký Hủy / Đổi Trả Món Ăn (US-091 Đối Soát Thất Thoát)</h3>
                    <button class="nut-dong-modal" onclick="window.soDoBanPos.dongModal()">✕</button>
                </div>
                <div class="than-modal" style="max-height: 65vh; overflow-y: auto;">
                    <table class="bang-du-lieu">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Thời gian</th>
                                <th>Bàn</th>
                                <th>Món ăn</th>
                                <th>Phân loại</th>
                                <th>Lý do & Nhân viên thực hiện</th>
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

    dongModal() {
        const modal = document.getElementById('khung-modal-toan-cuc');
        if (modal) {
            modal.classList.remove('mo');
            modal.innerHTML = '';
        }
    }
}

// Khởi tạo toàn cục
if (typeof window !== 'undefined') {
    window.soDoBanPos = new SoDoBanPosModule();
}
